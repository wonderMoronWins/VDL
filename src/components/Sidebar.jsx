import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const navMain = [
  { to: '/',          icon: 'ti-home',     key: 'home'      },
  { to: '/downloads', icon: 'ti-download', key: 'downloads' },
  { to: '/saved',     icon: 'ti-bookmark', key: 'saved'     },
  { to: '/history',   icon: 'ti-history',  key: 'history'   },
]

const navTools = [
  { to: '/converter', icon: 'ti-transform', key: 'converter' },
]

const navBottom = [
  { to: '/settings',  icon: 'ti-settings',  key: 'settings' },
]

export default function Sidebar() {
  const { t } = useTranslation()
  return (
    <aside className="w-[210px] bg-bg-secondary flex flex-col flex-shrink-0 border-r border-white/[0.07]">
      {/* Логотип */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.07]">
        <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-accent to-accent-light flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
          VDL
        </div>
        <div>
          <div className="text-white text-[14px] font-medium leading-tight">VDL</div>
          <div className="text-text-muted text-[11px]">Video Downloader</div>
        </div>
      </div>

      {/* Основная навигация */}
      <nav className="flex flex-col flex-1 pt-3">
        {navMain.map((item) => (
          <NavItem key={item.to} to={item.to} icon={item.icon} label={t(`nav.${item.key}`)} />
        ))}

        {/* Разделитель — Инструменты */}
        <div className="mx-5 my-2 border-t border-white/[0.07]" />
        <div className="px-5 mb-1 text-[10.5px] text-text-muted uppercase tracking-[0.07em]">
          {t('nav.tools')}
        </div>
        {navTools.map((item) => (
          <NavItem key={item.to} to={item.to} icon={item.icon} label={t(`nav.${item.key}`)} />
        ))}

        {/* Настройки — прижаты к низу */}
        <div className="mt-auto border-t border-white/[0.07] pt-2">
          {navBottom.map((item) => (
            <NavItem key={item.to} to={item.to} icon={item.icon} label={t(`nav.${item.key}`)} />
          ))}
        </div>
      </nav>
    </aside>
  )
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-[10px] mx-[10px] px-[14px] py-[10px] rounded-lg text-[13.5px] transition-all duration-150 ` +
        (isActive
          ? 'bg-accent/25 text-accent-light'
          : 'text-text-secondary hover:bg-white/[0.05] hover:text-white/80')
      }
    >
      <i className={`ti ${icon} text-[17px]`} aria-hidden="true" />
      {label}
    </NavLink>
  )
}
