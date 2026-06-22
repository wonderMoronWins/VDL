export function formatDuration(seconds) {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

export function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function formatDate(iso) {
  if (!iso) return ''
  const d   = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60)     return 'только что'
  if (diff < 3600)   return `${Math.floor(diff/60)} мин. назад`
  if (diff < 86400)  return 'сегодня'
  if (diff < 172800) return 'вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

// Открыть файл в проводнике с обработкой ошибок.
// Если файл не найден (перемещён/удалён) — показывает уведомление.
export async function openInFolder(filePath) {
  if (!filePath) {
    alert('Путь к файлу не сохранён для этой записи.')
    return
  }
  try {
    const res = await window.electronAPI?.showItemInFolder(filePath)
    if (res && !res.success) {
      alert(res.error || 'Не удалось открыть файл. Возможно, он был перемещён или удалён.')
    }
  } catch (e) {
    alert('Ошибка при открытии файла: ' + e.message)
  }
}
