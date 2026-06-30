/**
 * VDL API — все вызовы к Python FastAPI backend (порт 8765)
 */
const BASE = 'http://127.0.0.1:8765'

// Флаг: backend уже поднялся хотя бы раз (чтобы долго ждать только на старте)
let backendReady = false

async function req(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)

  // На старте backend.exe распаковывается несколько секунд (внутри FFmpeg).
  // Поэтому при ошибке соединения повторяем запрос, пока backend не поднимется.
  const maxAttempts = backendReady ? 1 : 40   // ~40 попыток × 750мс ≈ 30 сек на старте
  let lastErr = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(BASE + path, opts)
      backendReady = true
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Ошибка сервера')
      }
      return res.json()
    } catch (e) {
      lastErr = e
      // Ошибка "сервер ещё не поднялся" — ждём и пробуем снова.
      // Прочие ошибки (после готовности backend) пробрасываем сразу.
      const isConnRefused = e instanceof TypeError  // fetch fail = backend недоступен
      if (!isConnRefused || backendReady) throw e
      await new Promise(r => setTimeout(r, 750))
    }
  }
  throw lastErr || new Error('Backend недоступен')
}

// ─── Анализ URL ──────────────────────────────────────────────────────────────
export const analyzeUrl = (url) => req('POST', '/api/analyze', { url })

// ─── Скачивание ──────────────────────────────────────────────────────────────
export const startDownload = (url, quality, format, download_dir) =>
  req('POST', '/api/download/start', { url, quality, format, download_dir })

export function subscribeDownloadProgress(taskId, onData, onDone) {
  const es = new EventSource(`${BASE}/api/download/progress/${taskId}`)
  es.onmessage = (e) => {
    const data = JSON.parse(e.data)
    onData(data)
    if (data.status === 'done' || data.status === 'error') {
      es.close()
      onDone(data)
    }
  }
  es.onerror = () => { es.close(); onDone({ status: 'error', error: 'Соединение прервано' }) }
  return () => es.close()
}

// ─── История ─────────────────────────────────────────────────────────────────
export const getHistory    = (limit = 50, offset = 0) => req('GET', `/api/history?limit=${limit}&offset=${offset}`)
export const deleteHistory = (id) => req('DELETE', `/api/history/${id}`)
export const clearHistory  = ()   => req('DELETE', '/api/history')

// ─── Сохранённые ─────────────────────────────────────────────────────────────
export const getSaved    = ()    => req('GET', '/api/saved')
export const saveLink    = (url) => req('POST', '/api/saved', { url })
export const deleteSaved = (id)  => req('DELETE', `/api/saved/${id}`)

// ─── Конвертер ───────────────────────────────────────────────────────────────
export const startConvert = (input_path, output_format, mode, output_dir = '') =>
  req('POST', '/api/convert/start', { input_path, output_format, mode, output_dir })

export function subscribeConvertProgress(taskId, onData, onDone) {
  const es = new EventSource(`${BASE}/api/convert/progress/${taskId}`)
  es.onmessage = (e) => {
    const data = JSON.parse(e.data)
    onData(data)
    if (data.status === 'done' || data.status === 'error') {
      es.close()
      onDone(data)
    }
  }
  es.onerror = () => { es.close(); onDone({ status: 'error' }) }
  return () => es.close()
}

// ─── Настройки / Обновления ──────────────────────────────────────────────────
export const getSettings    = ()       => req('GET',  '/api/settings')
export const saveSettings   = (data)   => req('POST', '/api/settings', data)
export const checkFolder    = ()       => req('GET',  '/api/check-folder')
export const checkUpdates   = ()       => req('GET',  '/api/settings/update-check')
export const updateYtdlp    = ()       => req('POST', '/api/settings/update-ytdlp')
