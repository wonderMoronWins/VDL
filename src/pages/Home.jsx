import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { analyzeUrl, getHistory, saveLink, getSaved, checkFolder, getSettings, saveSettings } from '../api.js'
import { useDownloads } from '../context/DownloadsContext.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import VideoCard from '../components/VideoCard.jsx'
import FolderMissingModal from '../components/FolderMissingModal.jsx'
import { formatDuration, openInFolder } from '../utils.js'

const QUALITIES = ['4K', '1080p', '720p', '480p', '360p']
const FORMATS   = { video: ['MP4', 'WebM', 'MKV', 'AVI'], audio: ['MP3', 'AAC', 'FLAC'] }

export default function Home() {
  const { tasks, launchDownload } = useDownloads()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [url,        setUrl]        = useState('')
  const [analyzing,  setAnalyzing]  = useState(false)
  const [videoInfo,  setVideoInfo]  = useState(null)
  const [error,      setError]      = useState('')
  const [quality,    setQuality]    = useState('1080p')
  const [format,     setFormat]     = useState('MP4')
  const [isAudio,    setIsAudio]    = useState(false)
  const [recent,     setRecent]     = useState([])
  const [saved,      setSaved]      = useState([])
  const [activeTaskId, setActiveTaskId] = useState(null)
  const [folderModal, setFolderModal] = useState(null)  // { path } если папка не найдена
  const inputRef = useRef(null)

  const task = tasks.find(t => t.id === activeTaskId) || null
  const activeDownloads = tasks.filter(t => t.status === 'downloading')

  const doneCount = tasks.filter(t => t.status === 'done').length
  useEffect(() => {
    getHistory(2, 0).then(r => setRecent(r.items || [])).catch(() => {})
    getSaved().then(r => setSaved((r.items || []).slice(0, 3))).catch(() => {})
  }, [doneCount])

  async function handleAnalyze() {
    if (!url.trim()) return
    setError(''); setVideoInfo(null); setActiveTaskId(null)
    setAnalyzing(true)
    try {
      const res = await analyzeUrl(url.trim())
      setVideoInfo(res.data)
      const avail = res.data.qualities || []
      const best  = QUALITIES.find(q => avail.includes(q)) || avail[0] || '1080p'
      setQuality(best)
      setIsAudio(false); setFormat('MP4')
    } catch (e) {
      setError(e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  // Запуск загрузки (downloadDir — опционально, если выбран новый путь)
  async function runDownload(downloadDir) {
    try {
      const taskId = await launchDownload({
        url,
        quality: isAudio ? 'Аудио' : quality,
        format,
        meta: videoInfo,
        downloadDir: downloadDir || '',
      })
      setActiveTaskId(taskId)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDownload() {
    if (!videoInfo) return
    // Проверяем, существует ли папка загрузок
    try {
      const res = await checkFolder()
      if (!res.exists) {
        // Папка удалена — показываем модалку выбора новой
        setFolderModal({ path: res.path })
        return
      }
    } catch (e) {
      // если проверка не удалась — пробуем качать как есть
    }
    runDownload()
  }

  // Пользователь выбрал новую папку в модалке и нажал Старт
  async function handleFolderStart(newPath) {
    setFolderModal(null)
    // Сохраняем новый путь в настройки, чтобы не спрашивать каждый раз
    try {
      const settings = await getSettings()
      await saveSettings({ ...settings, download_dir: newPath })
    } catch (e) {}
    runDownload(newPath)
  }

  const modeFormats = isAudio ? FORMATS.audio : FORMATS.video

  return (
    <div className="p-7 overflow-y-auto h-full">
      <h1 className="text-white text-[20px] font-medium mb-1">{t('home.title')}</h1>
      <p className="text-text-muted text-[13px] mb-5">
        {t('home.subtitle')}
      </p>

      <div className="flex gap-2.5 mb-5">
        <div className="flex-1 flex items-center bg-bg-card border border-white/10 rounded-[10px] px-4 gap-3 focus-within:border-accent/50 transition-colors">
          <i className="ti ti-link text-text-muted text-[18px]" aria-hidden="true" />
          <input
            ref={inputRef}
            value={url}
            onChange={e => { setUrl(e.target.value); setVideoInfo(null); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            placeholder={t('home.placeholder')}
            className="flex-1 bg-transparent outline-none text-white/90 text-[14px] py-3 placeholder-text-muted"
          />
          {url && (
            <button onClick={() => { setUrl(''); setVideoInfo(null); setError('') }}
              className="text-text-muted hover:text-white transition-colors">
              <i className="ti ti-x text-[15px]" aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!url.trim() || analyzing}
          className="bg-gradient-to-r from-accent to-accent-light text-white rounded-[10px] px-5 h-[50px] text-[14px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
        >
          {analyzing
            ? <><i className="ti ti-loader-2 spin text-[16px]" aria-hidden="true" /> {t('common.analyzing')}</>
            : t('common.analyze')}
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-card p-3 mb-4 text-danger text-[13px] flex items-center gap-2">
          <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
        </div>
      )}

      {videoInfo && (
        <div className="bg-bg-card border border-white/[0.08] rounded-lg p-4 flex gap-4 mb-5 fade-in">
          <div className="w-[160px] h-[95px] rounded-lg overflow-hidden flex-shrink-0 relative">
            {videoInfo.thumbnail
              ? <img src={videoInfo.thumbnail} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-accent/30 to-accent-light/20" />}
            {videoInfo.duration > 0 && (
              <div className="absolute bottom-1.5 right-2 bg-black/70 text-white text-[11px] px-1.5 py-0.5 rounded">
                {formatDuration(videoInfo.duration)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-white text-[15px] font-medium mb-1 line-clamp-2">{videoInfo.title}</div>
            <div className="text-text-muted text-[12px] mb-3">{videoInfo.platform}</div>

            <div className="flex gap-2 mb-3">
              <ModeBtn active={!isAudio} onClick={() => { setIsAudio(false); setFormat('MP4') }}>
                <i className="ti ti-video text-[14px]" aria-hidden="true" /> Видео
              </ModeBtn>
              <ModeBtn active={isAudio} onClick={() => { setIsAudio(true); setFormat('MP3') }}>
                <i className="ti ti-music text-[14px]" aria-hidden="true" /> Аудио
              </ModeBtn>
            </div>

            {!isAudio && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {(videoInfo.qualities?.length > 0 ? videoInfo.qualities : ['1080p','720p']).map(q => (
                  <QualBtn key={q} active={quality === q} onClick={() => setQuality(q)}>{q}</QualBtn>
                ))}
              </div>
            )}

            <div className="flex gap-2 mb-4 flex-wrap">
              {modeFormats.map(f => (
                <QualBtn key={f} active={format === f} onClick={() => setFormat(f)}>{f}</QualBtn>
              ))}
            </div>

            {(!task || task.status === 'error' || task.status === 'done') && (
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="bg-gradient-to-r from-accent to-accent-light text-white rounded-lg px-5 py-2 text-[13.5px] font-medium hover:opacity-90 transition-opacity"
                >
                  {task?.status === 'done' ? t('home.downloadAgain') : t('common.download')}
                </button>
                <SaveBtn url={url} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* БОЛЬШАЯ карточка активной загрузки — крупное превью + прогресс */}
      {activeDownloads.length > 0 && (
        <div className="mb-6">
          {activeDownloads.map(t => (
            <div key={t.id} className="bg-bg-card border border-accent/30 rounded-lg overflow-hidden mb-3 fade-in">
              <div className="relative w-full h-[220px] bg-black/40">
                {t.thumbnail
                  ? <img src={t.thumbnail} alt="" className="w-full h-full object-cover opacity-90" />
                  : <div className="w-full h-full bg-gradient-to-br from-accent/30 to-accent-light/20" />}
                {/* Затемнение снизу для читаемости */}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />
                {/* Большой процент по центру */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-white text-[42px] font-medium drop-shadow-lg">{Math.round(t.percent)}%</div>
                  <div className="text-white/70 text-[13px] flex items-center gap-1.5 mt-1">
                    <i className="ti ti-loader-2 spin" aria-hidden="true" /> Скачивание...
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="text-white text-[15px] font-medium mb-1 truncate">{t.title}</div>
                <div className="text-text-muted text-[12px] mb-3">
                  {t.platform} · {t.quality} {t.format}
                  {t.speed && ` · ${t.speed}`}
                  {t.eta && ` · осталось ${t.eta}`}
                </div>
                <ProgressBar percent={t.percent} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Последние загрузки */}
      <div className="flex items-center justify-between mb-3 mt-2">
        <span className="text-white text-[15px] font-medium">{t('home.recent')}</span>
        <button onClick={() => navigate('/history')} className="text-accent-light text-[13px] hover:underline">
          {t('home.allHistory')}
        </button>
      </div>

      {recent.length > 0 ? (
        <div className="flex flex-col gap-2 mb-6">
          {recent.map(item => (
            <VideoCard
              key={item.id} item={item} mode="mini"
              onOpen={(i) => openInFolder(i.file_path)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-bg-card border border-white/[0.06] rounded-card py-8 text-center mb-6">
          <i className="ti ti-download text-text-muted text-[28px] mb-2 block" aria-hidden="true" />
          <p className="text-text-secondary text-[13px]">{t('home.noDownloads')}</p>
          <p className="text-text-muted text-[11.5px] mt-0.5">{t('home.willAppear')}</p>
        </div>
      )}

      {/* Сохранённые ссылки — 3 последние */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-white text-[15px] font-medium">{t('home.savedLinks')}</span>
        <button onClick={() => navigate('/saved')} className="text-accent-light text-[13px] hover:underline">
          {t('home.allSaved')}
        </button>
      </div>

      {saved.length > 0 ? (
        <div className="flex flex-col gap-2">
          {saved.map(item => (
            <VideoCard
              key={item.id} item={item} mode="mini"
              onOpen={() => navigate('/saved')}
            />
          ))}
        </div>
      ) : (
        <div className="bg-bg-card border border-white/[0.06] rounded-card py-8 text-center">
          <i className="ti ti-bookmark text-text-muted text-[28px] mb-2 block" aria-hidden="true" />
          <p className="text-text-secondary text-[13px]">{t('home.noSaved')}</p>
          <p className="text-text-muted text-[11.5px] mt-0.5">{t('home.saveHint')}</p>
        </div>
      )}

      {/* Модалка: папка загрузок не найдена */}
      {folderModal && (
        <FolderMissingModal
          missingPath={folderModal.path}
          onCancel={() => setFolderModal(null)}
          onStart={handleFolderStart}
        />
      )}
    </div>
  )
}

function ModeBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] border transition-all ${
        active ? 'bg-accent/25 border-accent text-accent-light' : 'bg-bg-hover border-white/10 text-text-secondary hover:border-white/20'
      }`}>
      {children}
    </button>
  )
}

function QualBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[12.5px] border transition-all ${
        active ? 'bg-accent/25 border-accent text-accent-light' : 'bg-bg-hover border-white/10 text-text-secondary hover:border-white/20'
      }`}>
      {children}
    </button>
  )
}

function SaveBtn({ url }) {
  const [saved, setSaved] = useState(false)

  async function handle() {
    try { await saveLink(url); setSaved(true) } catch {}
  }

  return (
    <button onClick={handle}
      className={`px-4 py-2 rounded-lg text-[13.5px] border transition-all ${
        saved ? 'border-success/40 text-success bg-success/10' : 'border-white/10 text-text-secondary bg-bg-hover hover:border-white/20'
      }`}>
      {saved ? <><i className="ti ti-check mr-1" /> Сохранено</> : t('home.saveLink')}
    </button>
  )
}
