import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getSettings, saveSettings } from '../api.js'
import { LANGUAGES } from '../i18n/languages.js'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const [cfg,         setCfg]         = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [saved,       setSaved]       = useState(false)

  useEffect(() => {
    getSettings().then(data => { setCfg(data); setLoading(false) })
  }, [])

  function set(key, val) {
    setCfg(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  async function handleSave() {
    await saveSettings(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleChangeLang(code) {
    try { localStorage.setItem('vdl_lang', code) } catch {}
    i18n.changeLanguage(code)
  }

  async function handleSelectFolder() {
    const path = await window.electronAPI?.selectFolder()
    if (path) set('download_dir', path)
  }

  if (loading || !cfg) {
    return (
      <div className="flex items-center justify-center h-full">
        <i className="ti ti-loader-2 spin text-accent text-[28px]" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="p-7 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-white text-[20px] font-medium">{t('settings.title')}</h1>
        <button
          onClick={handleSave}
          className={`text-[13px] px-4 py-1.5 rounded-lg border transition-all ${
            saved
              ? 'border-success/40 text-success bg-success/10'
              : 'border-accent/40 text-accent-light bg-accent/10 hover:bg-accent/20'
          }`}
        >
          {saved ? <><i className="ti ti-check mr-1" aria-hidden="true" />{t('common.saved')}</> : t('common.save')}
        </button>
      </div>
      <p className="text-text-muted text-[13px] mb-6">{t('settings.subtitle')}</p>

      {/* Загрузки */}
      <Section label={t('settings.downloadsSection')}>
        <SettingRow label={t('settings.downloadFolder')} icon="ti-folder">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary text-[13px] max-w-[220px] truncate" title={cfg.download_dir}>
              {cfg.download_dir}
            </span>
            <button
              onClick={handleSelectFolder}
              className="text-[12px] text-accent-light border border-accent/30 rounded-lg px-2.5 py-1 hover:bg-accent/10 transition-colors"
            >
              {t('settings.change')}
            </button>
          </div>
        </SettingRow>
      </Section>

      {/* Интерфейс */}
      <Section label={t('settings.interface')}>
        <SettingRow label={t('settings.language')} icon="ti-language">
          <select
            value={i18n.language}
            onChange={e => handleChangeLang(e.target.value)}
            className="bg-bg-primary border border-white/10 rounded-lg px-3 py-1.5 text-white/85 text-[13px] outline-none focus:border-accent/50"
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </SettingRow>
        <SettingRow label={t('settings.notifications')} icon="ti-bell">
          <Toggle value={cfg.notifications} onChange={v => set('notifications', v)} />
        </SettingRow>
      </Section>

      {/* О приложении */}
      <Section label={t('settings.about')}>
        <SettingRow label={t('settings.version')} icon="ti-info-circle">
          <span className="text-text-muted text-[13px]">1.0.0</span>
        </SettingRow>
      </Section>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div className="mb-6">
      <div className="text-text-muted text-[11px] uppercase tracking-[0.07em] mb-2">{label}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

function SettingRow({ label, icon, children }) {
  return (
    <div className="bg-bg-card border border-white/[0.07] rounded-card px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {icon && <i className={`ti ${icon} text-text-muted text-[16px]`} aria-hidden="true" />}
        <span className="text-white/75 text-[13.5px]">{label}</span>
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${value ? 'bg-accent' : 'bg-white/15'}`}
    >
      <span className={`absolute w-3.5 h-3.5 bg-white rounded-full top-[3px] transition-all ${value ? 'right-[3px]' : 'left-[3px]'}`} />
    </button>
  )
}
