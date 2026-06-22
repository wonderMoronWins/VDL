/**
 * Кастомный TitleBar для Electron (frame: false)
 * Drag-зона + кнопки управления окном
 */
export default function TitleBar() {
  const api = window.electronAPI

  return (
    <div
      className="h-9 flex items-center justify-between px-4 bg-bg-secondary border-b border-white/[0.07] flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <span className="text-text-muted text-[12px]">VDL — Video Downloader</span>

      {/* Кнопки управления окном */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <WinBtn onClick={() => api?.minimizeWindow()} icon="ti-minus" />
        <WinBtn onClick={() => api?.maximizeWindow()} icon="ti-square" />
        <WinBtn onClick={() => api?.closeWindow()}    icon="ti-x" danger />
      </div>
    </div>
  )
}

function WinBtn({ onClick, icon, danger }) {
  return (
    <button
      onClick={onClick}
      className={
        `w-7 h-7 rounded-md flex items-center justify-center text-text-muted transition-colors ` +
        (danger
          ? 'hover:bg-danger/20 hover:text-danger'
          : 'hover:bg-white/10 hover:text-white')
      }
    >
      <i className={`ti ${icon} text-[13px]`} aria-hidden="true" />
    </button>
  )
}
