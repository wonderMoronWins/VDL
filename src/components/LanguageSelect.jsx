import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n/languages.js'

/**
 * Экран выбора языка при первом запуске.
 * Каждый язык подписан на самом себе (Русский, English, 中文, 日本語...).
 * После выбора вызывает onSelect(code).
 */
export default function LanguageSelect({ onSelect }) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary">
      <div className="w-[520px] max-w-[90vw] px-6">
        {/* Логотип */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center text-white text-[22px] font-bold mb-4">
            VDL
          </div>
          <div className="text-white text-[20px] font-medium">{t('langSelect.title')}</div>
          <div className="text-text-muted text-[13px] mt-1">{t('langSelect.subtitle')}</div>
        </div>

        {/* Сетка языков */}
        <div className="grid grid-cols-3 gap-2.5">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => onSelect(lang.code)}
              className="bg-bg-card border border-white/[0.08] rounded-xl py-3.5 px-3 text-white/85 text-[14px] hover:border-accent hover:bg-accent/10 hover:text-accent-light transition-all"
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
