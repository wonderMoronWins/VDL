import { useState } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Модальное окно: папка загрузок не найдена.
 * Предлагает выбрать новую папку (Обзор) или отменить.
 * Кнопка "Старт" появляется только после выбора новой папки.
 *
 * props:
 *   missingPath  — несуществующий путь для показа
 *   onCancel()   — закрыть без действия
 *   onStart(newPath) — запустить с новой папкой
 */
export default function FolderMissingModal({ missingPath, onCancel, onStart }) {
  const { t } = useTranslation()
  const [newPath, setNewPath] = useState('')

  async function handleBrowse() {
    const path = await window.electronAPI?.selectFolder()
    if (path) setNewPath(path)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-bg-card border border-white/10 rounded-xl p-6 w-[440px] max-w-[90vw] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Иконка + заголовок */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-danger/15 flex items-center justify-center flex-shrink-0">
            <i className="ti ti-folder-x text-danger text-[20px]" aria-hidden="true" />
          </div>
          <div>
            <div className="text-white text-[15px] font-medium">{t('folderModal.title')}</div>
            <div className="text-text-muted text-[12px]">{t('folderModal.subtitle')}</div>
          </div>
        </div>

        {/* Старый путь */}
        <div className="bg-bg-primary border border-white/[0.07] rounded-lg px-3 py-2.5 mb-3">
          <div className="text-text-muted text-[11px] mb-0.5">{t('folderModal.currentPath')}</div>
          <div className="text-white/70 text-[12.5px] break-all font-mono">{missingPath || '—'}</div>
        </div>

        {/* Новый путь (если выбран) */}
        {newPath && (
          <div className="bg-success/10 border border-success/25 rounded-lg px-3 py-2.5 mb-3 fade-in">
            <div className="text-success text-[11px] mb-0.5 flex items-center gap-1">
              <i className="ti ti-check" aria-hidden="true" /> {t('folderModal.newFolder')}
            </div>
            <div className="text-white/85 text-[12.5px] break-all font-mono">{newPath}</div>
          </div>
        )}

        {/* Кнопки */}
        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[13px] border border-white/10 text-text-secondary bg-bg-hover hover:border-white/20 transition-all"
          >
            Отмена
          </button>
          <button
            onClick={handleBrowse}
            className="px-4 py-2 rounded-lg text-[13px] border border-accent/30 text-accent-light bg-accent/10 hover:bg-accent/20 transition-all flex items-center gap-1.5"
          >
            <i className="ti ti-folder-open text-[14px]" aria-hidden="true" />
            Обзор
          </button>
          {newPath && (
            <button
              onClick={() => onStart(newPath)}
              className="px-5 py-2 rounded-lg text-[13px] font-medium text-white bg-gradient-to-r from-accent to-accent-light hover:opacity-90 transition-opacity flex items-center gap-1.5 fade-in"
            >
              <i className="ti ti-download text-[14px]" aria-hidden="true" />
              Старт
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
