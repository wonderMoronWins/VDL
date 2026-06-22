import { useState, useEffect } from 'react'
import { getSaved, saveLink, deleteSaved } from '../api.js'
import VideoCard from '../components/VideoCard.jsx'
import { useTranslation } from 'react-i18next'

export default function Saved() {
  const { t } = useTranslation()
  const [items,   setItems]   = useState([])
  const [url,     setUrl]     = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    getSaved().then(r => setItems(r.items || [])).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!url.trim() || saving) return
    setError(''); setSaving(true)
    try {
      const res = await saveLink(url.trim())
      setItems(prev => [res.item, ...prev])
      setUrl('')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    await deleteSaved(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="p-7 overflow-y-auto h-full">
      <h1 className="text-white text-[20px] font-medium mb-1">{t('saved.title')}</h1>
      <p className="text-text-muted text-[13px] mb-5">{t('saved.subtitle')}</p>

      {/* Строка добавления */}
      <div className={`flex items-center gap-3 bg-bg-card border rounded-[10px] px-4 py-2.5 mb-4 transition-colors ${error ? 'border-danger/40' : 'border-accent/30 focus-within:border-accent/60'}`}>
        <i className="ti ti-link text-accent text-[18px] flex-shrink-0" aria-hidden="true" />
        <input
          value={url}
          onChange={e => { setUrl(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder={t('saved.addPlaceholder')}
          className="flex-1 bg-transparent outline-none text-white/90 text-[13.5px] placeholder-text-muted py-1"
        />
        <button
          onClick={handleSave}
          disabled={!url.trim() || saving}
          className="bg-gradient-to-r from-accent to-accent-light text-white rounded-lg px-4 py-1.5 text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5 flex-shrink-0"
        >
          {saving
            ? <><i className="ti ti-loader-2 spin text-[14px]" aria-hidden="true" /> {t('common.analyzing')}</>
            : <><i className="ti ti-plus text-[14px]" aria-hidden="true" /> {t('common.save')}</>}
        </button>
      </div>

      {error && (
        <div className="text-danger text-[12.5px] mb-3 flex items-center gap-1.5">
          <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
        </div>
      )}

      {/* Разделитель */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-white/[0.07]" />
        <span className="text-text-muted text-[11.5px]">{t('saved.divider')} ({items.length})</span>
        <div className="flex-1 h-px bg-white/[0.07]" />
      </div>

      {/* Список */}
      {loading ? (
        <div className="flex justify-center py-10">
          <i className="ti ti-loader-2 spin text-accent text-[24px]" aria-hidden="true" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <i className="ti ti-bookmark text-text-muted text-[40px] mb-3" aria-hidden="true" />
          <p className="text-text-secondary text-[14px]">{t('saved.empty')}</p>
          <p className="text-text-muted text-[12px] mt-1">{t('saved.emptyHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(item => (
            <VideoCard
              key={item.id}
              item={item}
              mode="saved"
              onDelete={handleDelete}
              onDownload={(i) => {
                // Перенаправляем на главную с предзаполненным URL
                window.location.href = `/?url=${encodeURIComponent(i.url)}`
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
