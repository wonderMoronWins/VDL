import { useState, useEffect } from 'react'
import { getHistory, deleteHistory, clearHistory } from '../api.js'
import ProgressBar from '../components/ProgressBar.jsx'
import { formatSize, openInFolder } from '../utils.js'
import { useTranslation } from 'react-i18next'

/**
 * Страница Загрузки — завершённые загрузки из истории.
 * Корзина у каждой записи + кнопка "Очистить всё".
 * Удаление убирает запись из списка (файл на диске остаётся).
 */
export default function Downloads() {
  const { t } = useTranslation()
  const [completed, setCompleted] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [confirm,   setConfirm]   = useState(false)

  useEffect(() => {
    getHistory(50).then(r => setCompleted(r.items || [])).finally(() => setLoading(false))
  }, [])

  async function handleDelete(id) {
    await deleteHistory(id)
    setCompleted(prev => prev.filter(i => i.id !== id))
  }

  async function handleClearAll() {
    if (!confirm) { setConfirm(true); return }
    await clearHistory()
    setCompleted([])
    setConfirm(false)
  }

  if (loading) return <Loader />

  return (
    <div className="p-7 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-white text-[20px] font-medium">{t('downloads.title')}</h1>
        {completed.length > 0 && (
          <button
            onClick={handleClearAll}
            className={`text-[12.5px] px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
              confirm
                ? 'border-danger/50 text-danger bg-danger/10'
                : 'border-white/10 text-text-muted hover:border-danger/30 hover:text-danger'
            }`}
          >
            <i className="ti ti-trash text-[13px]" aria-hidden="true" />
            {confirm ? t('downloads.confirm') : t('downloads.clearAll')}
          </button>
        )}
      </div>
      <p className="text-text-muted text-[13px] mb-5">{t('downloads.subtitle')}</p>

      {completed.length === 0 ? (
        <Empty text={t('downloads.empty')} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {completed.map(item => (
            <div key={item.id} className="bg-bg-card border border-white/[0.07] rounded-card p-3.5 flex items-center gap-3.5 fade-in">
              <div className="w-[72px] h-11 rounded-lg overflow-hidden flex-shrink-0">
                {item.thumbnail
                  ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-accent/30 to-accent-light/20" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white/85 text-[13.5px] font-medium truncate mb-0.5">{item.title}</div>
                <div className="text-text-muted text-[11.5px] mb-1.5">
                  {item.platform} · {item.quality} {item.format?.toUpperCase()}
                  {item.file_size > 0 && ` · ${formatSize(item.file_size)}`}
                </div>
                <ProgressBar percent={100} />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-success text-[12px] flex items-center gap-1">
                  <i className="ti ti-circle-check text-[14px]" aria-hidden="true" /> {t('common.ready')}
                </span>
                <button
                  onClick={() => openInFolder(item.file_path)}
                  title={t('downloads.openFolder')}
                  className="text-[12px] text-accent-light bg-accent/10 border border-accent/20 rounded-lg px-2.5 py-1.5 hover:bg-accent/20 transition-colors"
                >
                  <i className="ti ti-folder text-[13px]" aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  title={t('downloads.removeFromList')}
                  className="text-[12px] text-text-muted bg-bg-hover border border-white/10 rounded-lg px-2.5 py-1.5 hover:text-danger hover:border-danger/30 transition-colors"
                >
                  <i className="ti ti-trash text-[13px]" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Loader() {
  return (
    <div className="p-7 flex items-center justify-center h-full">
      <i className="ti ti-loader-2 spin text-accent text-[28px]" aria-hidden="true" />
    </div>
  )
}

function Empty({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <i className="ti ti-download text-text-muted text-[40px] mb-3" aria-hidden="true" />
      <p className="text-text-secondary text-[14px]">{text}</p>
    </div>
  )
}
