import { createContext, useContext, useState, useCallback } from 'react'
import { startDownload, subscribeDownloadProgress, getSettings } from '../api.js'

/**
 * Глобальное хранилище активных и завершённых загрузок.
 * Живёт на уровне App — не сбрасывается при переходе между вкладками.
 * При завершении загрузки проигрывает звук + системное уведомление,
 * если в настройках включён параметр "Уведомления о завершении".
 */
const DownloadsContext = createContext(null)

// Аудио-объект создаётся один раз и переиспользуется
let completeSound = null
function playCompleteSound() {
  try {
    if (!completeSound) {
      completeSound = new Audio('/sounds/complete.wav')
      completeSound.volume = 0.6
    }
    completeSound.currentTime = 0
    completeSound.play().catch(() => {})
  } catch (e) {
    // звук не критичен — молча игнорируем
  }
}

// Системное уведомление Windows (через Web Notifications API,
// который Electron пробрасывает в нативные уведомления ОС)
function showNotification(title) {
  try {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      new Notification('Загрузка завершена', { body: title })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification('Загрузка завершена', { body: title })
        }
      })
    }
  } catch (e) {
    // уведомление не критично
  }
}

export function DownloadsProvider({ children }) {
  const [tasks, setTasks] = useState([])

  const updateTask = useCallback((taskId, patch) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t))
  }, [])

  const launchDownload = useCallback(async ({ url, quality, format, meta, downloadDir }) => {
    const { task_id } = await startDownload(url, quality, format.toLowerCase(), downloadDir || '')

    const newTask = {
      id:        task_id,
      url,
      title:     meta?.title || url,
      thumbnail: meta?.thumbnail || '',
      platform:  meta?.platform || '',
      quality,
      format,
      percent:   0,
      speed:     '',
      eta:       '',
      status:    'downloading',
      error:     '',
    }
    setTasks(prev => [newTask, ...prev])

    subscribeDownloadProgress(
      task_id,
      (d) => updateTask(task_id, d),
      async (d) => {
        updateTask(task_id, d)
        // При успешном завершении — звук + уведомление (если включено в настройках)
        if (d.status === 'done') {
          try {
            const settings = await getSettings()
            if (settings.notifications) {
              playCompleteSound()
              showNotification(newTask.title)
            }
          } catch (e) {
            // настройки недоступны — просто пропускаем
          }
        }
      },
    )

    return task_id
  }, [updateTask])

  const removeTask = useCallback((taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }, [])

  return (
    <DownloadsContext.Provider value={{ tasks, launchDownload, removeTask }}>
      {children}
    </DownloadsContext.Provider>
  )
}

export function useDownloads() {
  const ctx = useContext(DownloadsContext)
  if (!ctx) throw new Error('useDownloads должен использоваться внутри DownloadsProvider')
  return ctx
}
