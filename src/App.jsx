import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './i18n/index.js'
import { DownloadsProvider } from './context/DownloadsContext.jsx'
import TitleBar  from './components/TitleBar.jsx'
import Sidebar   from './components/Sidebar.jsx'
import LanguageSelect from './components/LanguageSelect.jsx'
import Home      from './pages/Home.jsx'
import Downloads from './pages/Downloads.jsx'
import Saved     from './pages/Saved.jsx'
import History   from './pages/History.jsx'
import Converter from './pages/Converter.jsx'
import Settings  from './pages/Settings.jsx'

export default function App() {
  const { i18n } = useTranslation()
  // Язык выбран ранее? Берём из localStorage. Если нет — показываем экран выбора.
  const [langChosen, setLangChosen] = useState(() => {
    try { return !!localStorage.getItem('vdl_lang') } catch { return false }
  })

  // Применяем сохранённый язык при старте
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vdl_lang')
      if (saved) i18n.changeLanguage(saved)
    } catch {}
  }, [i18n])

  function handleSelectLang(code) {
    try { localStorage.setItem('vdl_lang', code) } catch {}
    i18n.changeLanguage(code)
    setLangChosen(true)
  }

  // Первый запуск — экран выбора языка
  if (!langChosen) {
    return <LanguageSelect onSelect={handleSelectLang} />
  }

  return (
    <DownloadsProvider>
      <HashRouter>
        <div className="flex flex-col h-screen overflow-hidden">
          <TitleBar />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/"          element={<Home />}      />
                <Route path="/downloads" element={<Downloads />} />
                <Route path="/saved"     element={<Saved />}     />
                <Route path="/history"   element={<History />}   />
                <Route path="/converter" element={<Converter />} />
                <Route path="/settings"  element={<Settings />}  />
              </Routes>
            </main>
          </div>
        </div>
      </HashRouter>
    </DownloadsProvider>
  )
}
