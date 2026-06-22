import { useState, useEffect } from 'react'
import { getHistory, startConvert, subscribeConvertProgress } from '../api.js'
import ProgressBar from '../components/ProgressBar.jsx'
import { openInFolder } from '../utils.js'
import { useTranslation } from 'react-i18next'

const VIDEO_FMTS = ['MP4', 'WebM', 'MKV', 'AVI', 'MOV']
const AUDIO_FMTS = ['MP3', 'AAC', 'FLAC', 'WAV', 'OGG']

export default function Converter() {
  const { t } = useTranslation()
  const [mode,       setMode]       = useState('video')   // 'video' | 'audio'
  const [inputPath,  setInputPath]  = useState('')
  const [inputName,  setInputName]  = useState('')
  const [outputFmt,  setOutputFmt]  = useState('MP4')
  const [tasks,      setTasks]      = useState([])
  const [history,    setHistory]    = useState([])
  const [selHistId,  setSelHistId]  = useState(null)

  const formats = mode === 'audio' ? AUDIO_FMTS : VIDEO_FMTS

  useEffect(() => {
    getHistory(20).then(r => setHistory(r.items || [])).catch(() => {})
  }, [])

  useEffect(() => {
    // Сбрасываем формат при смене режима
    setOutputFmt(mode === 'audio' ? 'MP3' : 'MP4')
  }, [mode])

  async function handleSelectFile() {
    const path = await window.electronAPI?.selectFile()
    if (path) {
      setInputPath(path)
      setInputName(path.split(/[\\/]/).pop())
      setSelHistId(null)
    }
  }

  function handleSelectHist(item) {
    if (selHistId === item.id) {
      setSelHistId(null); setInputPath(''); setInputName('')
    } else {
      setSelHistId(item.id)
      setInputPath(item.file_path)
      setInputName(item.title || item.file_path.split(/[\\/]/).pop())
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      setInputPath(file.path)
      setInputName(file.name)
      setSelHistId(null)
    }
  }

  async function handleConvert() {
    if (!inputPath) return
    const taskId_local = Date.now()
    const newTask = { id: taskId_local, name: inputName, format: outputFmt, percent: 0, status: 'converting' }
    setTasks(prev => [newTask, ...prev])

    try {
      const { task_id } = await startConvert(inputPath, outputFmt.toLowerCase(), mode)
      subscribeConvertProgress(
        task_id,
        (d) => setTasks(prev => prev.map(t => t.id === taskId_local ? { ...t, ...d } : t)),
        (d) => setTasks(prev => prev.map(t => t.id === taskId_local ? { ...t, ...d } : t))
      )
    } catch (e) {
      setTasks(prev => prev.map(t => t.id === taskId_local ? { ...t, status: 'error', error: e.message } : t))
    }
  }

  const canConvert = !!inputPath

  return (
    <div className="p-7 overflow-y-auto h-full">
      <h1 className="text-white text-[20px] font-medium mb-1">{t('converter.title')}</h1>
      <p className="text-text-muted text-[13px] mb-5">{t('converter.subtitle')}</p>

      {/* Режим */}
      <div className="text-text-muted text-[11px] uppercase tracking-[0.07em] mb-2">{t('converter.mode')}</div>
      <div className="flex gap-2 mb-5">
        <ModeCard
          active={mode === 'video'} onClick={() => setMode('video')}
          icon="ti-video" label={t('converter.videoMode')}
          sub={t('converter.videoFormats')}
        />
        <ModeCard
          active={mode === 'audio'} onClick={() => setMode('audio')}
          icon="ti-music" label={t('converter.audioMode')}
          sub={t('converter.audioFormats')}
        />
      </div>

      {/* Источник */}
      <div className="text-text-muted text-[11px] uppercase tracking-[0.07em] mb-2">{t('converter.source')}</div>

      {inputName ? (
        <div className="inline-flex items-center gap-2 bg-accent/15 border border-accent/30 rounded-lg px-3.5 py-2 mb-4">
          <i className="ti ti-file-video text-accent text-[15px]" aria-hidden="true" />
          <span className="text-accent-light text-[13px] max-w-[300px] truncate">{inputName}</span>
          <button onClick={() => { setInputPath(''); setInputName(''); setSelHistId(null) }}
            className="text-text-muted hover:text-white transition-colors ml-1">
            <i className="ti ti-x text-[14px]" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-accent/30 rounded-xl p-7 text-center mb-4 cursor-pointer hover:border-accent/60 hover:bg-accent/5 transition-all"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={handleSelectFile}
        >
          <i className="ti ti-cloud-upload text-accent/60 text-[32px] mb-2 block" aria-hidden="true" />
          <div className="text-white/70 text-[14px] font-medium mb-1">{t('converter.dropHint')}</div>
          <div className="text-text-muted text-[12px]">{t('converter.dropSub')}</div>
        </div>
      )}

      {/* Из истории */}
      {history.length > 0 && (
        <>
          <div className="text-text-muted text-[11px] uppercase tracking-[0.07em] mb-2">{t('converter.fromHistory')}</div>
          <div className="flex flex-col gap-1.5 mb-5">
            {history.slice(0, 5).map(item => (
              <div
                key={item.id}
                onClick={() => handleSelectHist(item)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-card cursor-pointer border transition-all ${
                  selHistId === item.id
                    ? 'bg-accent/15 border-accent text-white'
                    : 'bg-bg-card border-white/[0.07] hover:border-accent/40 hover:bg-accent/5'
                }`}
              >
                <div className="w-[52px] h-8 rounded-md overflow-hidden flex-shrink-0">
                  {item.thumbnail
                    ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-accent/30 to-accent-light/20" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white/85 text-[12.5px] font-medium truncate">{item.title}</div>
                  <div className="text-text-muted text-[11px]">{item.format?.toUpperCase()} · {item.platform}</div>
                </div>
                {selHistId === item.id && (
                  <i className="ti ti-circle-check text-accent text-[16px] flex-shrink-0" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Панель конвертации */}
      <div className="bg-bg-card border border-white/[0.08] rounded-lg p-4 mb-4">
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <div className="text-text-muted text-[11px] mb-1.5">{t('converter.sourceFormat')}</div>
            <div className="bg-bg-primary border border-white/10 rounded-lg px-3 py-2.5 text-white/60 text-[13.5px]">
              {inputName ? inputName.split('.').pop()?.toUpperCase() || '—' : '—'}
            </div>
          </div>
          <div className="pb-2.5 text-text-muted">
            <i className="ti ti-arrow-right text-[20px]" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <div className="text-text-muted text-[11px] mb-1.5">
              {mode === 'audio' ? 'Формат аудио' : 'Целевой формат'}
            </div>
            <select
              value={outputFmt}
              onChange={e => setOutputFmt(e.target.value)}
              className="w-full bg-bg-primary border border-white/10 rounded-lg px-3 py-2.5 text-white/85 text-[13.5px] outline-none focus:border-accent/50"
            >
              {formats.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={handleConvert}
          disabled={!canConvert}
          className="w-full bg-gradient-to-r from-accent to-accent-light text-white rounded-lg py-3 text-[14px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
        >
          <i className="ti ti-transform text-[16px]" aria-hidden="true" />
          Конвертировать
        </button>
      </div>

      {/* Очередь задач */}
      {tasks.length > 0 && (
        <div className="flex flex-col gap-2">
          {tasks.map(task => (
            <div key={task.id} className="bg-bg-card border border-white/[0.07] rounded-card p-3.5 fade-in">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/80 text-[13px] font-medium truncate max-w-[70%]">{task.name}</span>
                <span className="text-text-muted text-[11.5px]">→ {task.format}</span>
              </div>
              {task.status === 'done' ? (
                <div className="flex items-center gap-2">
                  <span className="text-success text-[12px] flex items-center gap-1">
                    <i className="ti ti-circle-check" aria-hidden="true" /> Конвертация завершена
                  </span>
                  {task.output_path && (
                    <button
                      onClick={() => openInFolder(task.output_path)}
                      className="text-[11px] text-accent-light underline ml-2"
                    >
                      Открыть папку
                    </button>
                  )}
                </div>
              ) : task.status === 'error' ? (
                <span className="text-danger text-[12px]">
                  <i className="ti ti-alert-circle mr-1" aria-hidden="true" />{task.error || t('converter.convError')}
                </span>
              ) : (
                <>
                  <ProgressBar percent={task.percent} className="mb-1.5" />
                  <span className="text-text-muted text-[11px]">{task.percent?.toFixed(0)}% — {t('converter.processing')}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ModeCard({ active, onClick, icon, label, sub }) {
  return (
    <div
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-lg border cursor-pointer transition-all ${
        active ? 'bg-accent/20 border-accent' : 'bg-bg-card border-white/[0.07] hover:border-accent/40'
      }`}
    >
      <i className={`ti ${icon} text-[20px] ${active ? 'text-accent-light' : 'text-text-muted'}`} aria-hidden="true" />
      <span className={`text-[13px] font-medium ${active ? 'text-accent-light' : 'text-text-secondary'}`}>{label}</span>
      <span className="text-text-muted text-[11px]">{sub}</span>
    </div>
  )
}
