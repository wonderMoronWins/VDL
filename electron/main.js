const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

// ─── Обход VPN/прокси для локального backend ─────────────────────────────────
// Многие VPN перехватывают весь трафик, включая 127.0.0.1, из-за чего
// backend становится недоступен. Эти флаги исключают локальные адреса.
app.commandLine.appendSwitch('no-proxy-server')
app.commandLine.appendSwitch('proxy-bypass-list', '<local>;127.0.0.1;localhost')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
let mainWindow
let pythonProcess

// ─── Поиск Python интерпретатора ─────────────────────────────────────────────
// Приоритет: venv проекта → системный python → python3
function resolvePythonPath() {
  const projectRoot = isDev
    ? path.join(__dirname, '..')
    : process.resourcesPath

  // Путь к python внутри venv различается на Windows и Unix
  const venvPython = process.platform === 'win32'
    ? path.join(projectRoot, 'venv', 'Scripts', 'python.exe')
    : path.join(projectRoot, 'venv', 'bin', 'python')

  if (fs.existsSync(venvPython)) {
    console.log('[Python] используется venv:', venvPython)
    return venvPython
  }

  // Fallback на системный интерпретатор
  console.warn('[Python] venv не найден, используется системный python')
  return process.platform === 'win32' ? 'python' : 'python3'
}

// ─── Запуск backend ───────────────────────────────────────────────────
// В собранном приложении: backend.exe (Python внутри не нужен).
// В разработке: python из venv + backend/main.py.
function startPythonBackend() {
  if (!isDev) {
    // Production: запускаем вложенный backend.exe из resources
    const exeName = process.platform === 'win32' ? 'backend.exe' : 'backend'
    const backendExe = path.join(process.resourcesPath, 'backend-dist', exeName)
    console.log('[Backend] запуск exe:', backendExe)
    pythonProcess = spawn(backendExe, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: path.dirname(backendExe),
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
    })
  } else {
    // Development: python из venv
    const backendPath = path.join(__dirname, '..', 'backend', 'main.py')
    const pythonExe = resolvePythonPath()
    pythonProcess = spawn(pythonExe, [backendPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
    })
  }

  pythonProcess.stdout.setEncoding('utf8')
  pythonProcess.stderr.setEncoding('utf8')
  pythonProcess.stdout.on('data', (data) => {
    console.log('[Python]', data.toString().trim())
  })
  pythonProcess.stderr.on('data', (data) => {
    console.error('[Python ERR]', data.toString().trim())
  })
  pythonProcess.on('close', (code) => {
    console.log('[Python] процесс завершён с кодом', code)
  })
}

// ─── Создание окна ───────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    frame: false,           // кастомный заголовок
    titleBarStyle: 'hidden',
    backgroundColor: '#12111A',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173')
    // DevTools можно открыть вручную клавишей F12 (см. обработчик ниже)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // F12 — открыть/закрыть DevTools вручную (для отладки)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow.webContents.toggleDevTools()
    }
  })
}

// ─── IPC: управление окном ───────────────────────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow.minimize())
ipcMain.on('window:maximize', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
})
ipcMain.on('window:close', () => mainWindow.close())

// ─── IPC: выбор папки для загрузок ──────────────────────────────────────────
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  return result.canceled ? null : result.filePaths[0]
})

// ─── IPC: выбор файла для конвертера ─────────────────────────────────────────
ipcMain.handle('dialog:selectFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Видео', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv'] },
      { name: 'Аудио', extensions: ['mp3', 'aac', 'flac', 'wav', 'ogg'] },
    ],
  })
  return result.canceled ? null : result.filePaths[0]
})

// ─── IPC: открыть файл / папку в проводнике ──────────────────────────────────
ipcMain.handle('shell:openPath', async (_, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return { success: false, error: 'Файл не найден: ' + (filePath || 'путь пуст') }
  }
  const err = await shell.openPath(filePath)
  return { success: !err, error: err }
})

ipcMain.handle('shell:showItemInFolder', (_, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return { success: false, error: 'Файл не найден: ' + (filePath || 'путь пуст') }
  }
  shell.showItemInFolder(filePath)
  return { success: true }
})

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startPythonBackend()
  // Backend.exe распаковывается несколько секунд (внутри FFmpeg),
  // поэтому даём фору перед окном. Дальше API сам повторяет запросы.
  setTimeout(createWindow, isDev ? 1000 : 2500)
})

// Надёжно завершает Python и все его дочерние процессы (FFmpeg и т.д.)
function killBackend() {
  if (!pythonProcess || pythonProcess.killed) return
  try {
    if (process.platform === 'win32') {
      // На Windows убиваем всё дерево процессов по PID через taskkill
      const { execSync } = require('child_process')
      try {
        execSync(`taskkill /pid ${pythonProcess.pid} /T /F`, { stdio: 'ignore' })
      } catch (e) {
        pythonProcess.kill('SIGKILL')
      }
    } else {
      pythonProcess.kill('SIGKILL')
    }
  } catch (e) {
    // процесс уже мёртв
  }
  pythonProcess = null
}

app.on('window-all-closed', () => {
  killBackend()
  if (process.platform !== 'darwin') app.quit()
})

// Подстраховка: убиваем backend при любом выходе из приложения
app.on('before-quit', killBackend)
app.on('will-quit', killBackend)
process.on('exit', killBackend)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
