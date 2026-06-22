import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './translations.js'

// Язык по умолчанию берём из localStorage (выбранный пользователем),
// иначе пусто — тогда App покажет экран выбора языка.
const savedLang = (() => {
  try { return localStorage.getItem('vdl_lang') || '' } catch { return '' }
})()

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang || 'en',     // временный, до выбора пользователя
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

export default i18n
