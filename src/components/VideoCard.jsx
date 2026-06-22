import { formatDuration, formatSize, formatDate } from '../utils.js'

/**
 * Универсальная карточка видео.
 * mode: 'history' | 'saved' | 'mini'
 */
export default function VideoCard({ item, mode = 'history', onDownload, onDelete, onOpen }) {
  const thumb = item.thumbnail
    ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
    : <div className="w-full h-full bg-gradient-to-br from-accent/30 to-accent-light/20" />

  if (mode === 'mini') {
    return (
      <div className="bg-bg-card border border-white/[0.07] rounded-card p-3 flex items-center gap-3 fade-in">
        <div className="w-[52px] h-8 rounded-md overflow-hidden flex-shrink-0">{thumb}</div>
        <div className="flex-1 min-w-0">
          <div className="text-white/85 text-[13px] font-medium truncate">{item.title || item.url}</div>
          <div className="text-text-muted text-[11px]">{item.platform} · {item.quality} · {formatDate(item.created_at)}</div>
        </div>
        {onOpen && (
          <button
            onClick={() => onOpen(item)}
            className="text-[12px] text-accent-light bg-bg-hover border border-accent/30 rounded-md px-3 py-1 hover:bg-accent/20 transition-colors flex-shrink-0"
          >
            Открыть
          </button>
        )}
      </div>
    )
  }

  if (mode === 'saved') {
    return (
      <div className="bg-bg-card border border-white/[0.07] rounded-card p-3 flex items-center gap-3 fade-in">
        <div className="w-[72px] h-11 rounded-md overflow-hidden flex-shrink-0">{thumb}</div>
        <div className="flex-1 min-w-0">
          <div className="text-white/85 text-[13.5px] font-medium truncate">{item.title || item.url}</div>
          <div className="text-text-muted text-[11.5px]">
            {item.platform}
            {item.available_qualities?.length > 0 && ` · ${item.available_qualities.join(', ')}`}
            {' · '}{formatDate(item.created_at)}
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {onDownload && (
            <button
              onClick={() => onDownload(item)}
              className="text-[12px] text-white bg-gradient-to-r from-accent to-accent-light border-none rounded-md px-3 py-1.5 hover:opacity-90 transition-opacity"
            >
              Скачать
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="text-[12px] text-text-muted bg-bg-hover border border-white/10 rounded-md px-2.5 py-1.5 hover:text-danger hover:border-danger/30 transition-colors"
            >
              <i className="ti ti-trash text-[14px]" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // mode === 'history' — сетка
  return (
    <div className="bg-bg-card border border-white/[0.07] rounded-lg overflow-hidden fade-in">
      <div className="relative w-full h-[110px] overflow-hidden">
        {thumb}
        <div className="absolute bottom-1.5 left-2 bg-black/65 text-white text-[10px] px-1.5 py-0.5 rounded">
          {item.quality} · {item.format?.toUpperCase()}
        </div>
        {item.duration > 0 && (
          <div className="absolute bottom-1.5 right-2 bg-black/65 text-white text-[10px] px-1.5 py-0.5 rounded">
            {formatDuration(item.duration)}
          </div>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-white/85 text-[12.5px] font-medium truncate mb-0.5">{item.title}</div>
        <div className="text-text-muted text-[11px]">
          {item.platform}
          {item.file_size > 0 && ` · ${formatSize(item.file_size)}`}
          {' · '}{formatDate(item.created_at)}
        </div>
        <div className="flex gap-1.5 mt-2">
          {onOpen && (
            <button
              onClick={() => onOpen(item)}
              className="text-[11px] text-accent-light bg-accent/10 border border-accent/20 rounded px-2 py-1 hover:bg-accent/20 transition-colors"
            >
              <i className="ti ti-folder text-[12px] mr-1" aria-hidden="true" />
              Открыть
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="text-[11px] text-text-muted hover:text-danger transition-colors px-1.5 py-1"
            >
              <i className="ti ti-trash text-[12px]" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
