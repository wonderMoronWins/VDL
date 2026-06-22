import { useState, useEffect } from 'react'
import { getHistory, deleteHistory, clearHistory } from '../api.js'
import VideoCard from '../components/VideoCard.jsx'
import { openInFolder } from '../utils.js'
import { useTranslation } from 'react-i18next'

export default function History() {
  const { t } = useTranslation()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    getHistory(100).then(r => setItems(r.items || [])).finally(() => setLoading(false))
  }, [])

  async function handleDelete(id) {
    await deleteHistory(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleClear() {
    if (!confirm) { setConfirm(true); return }
    await clearHistory()
    setItems([])
    setConfirm(false)
  }

  return (
    <div className="p-7 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-white text-[20px] font-medium">{t('history.title')}</h1>
        {items.length > 0 && (
          <button
            onClick={handleClear}
            className={`text-[12.5px] px-3 py-1.5 rounded-lg border transition-all ${
              confirm
                ? 'border-danger/50 text-danger bg-danger/10'
                : 'border-white/10 text-text-muted hover:border-danger/30 hover:text-danger'
            }`}
          >
            <i className="ti ti-trash text-[13px] mr-1" aria-hidden="true" />
            {confirm ? t('history.confirmClear') : t('history.clearHistory')}
          </button>
        )}
      </div>
      <p className="text-text-muted text-[13px] mb-5">
        {items.length > 0 ? t('history.total', { count: items.length }) : t('history.subtitle')}
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <i className="ti ti-loader-2 spin text-accent text-[24px]" aria-hidden="true" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <i className="ti ti-history text-text-muted text-[40px] mb-3" aria-hidden="true" />
          <p className="text-text-secondary text-[14px]">{t('history.empty')}</p>
          <p className="text-text-muted text-[12px] mt-1">{t('history.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {items.map(item => (
            <VideoCard
              key={item.id}
              item={item}
              mode="history"
              onDelete={handleDelete}
              onOpen={(i) => openInFolder(i.file_path)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
