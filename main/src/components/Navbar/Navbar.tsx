import type { Lang } from '../../content'
import s from './Navbar.module.css'

interface NavLink {
  label: string
  href: string
}

interface NavbarProps {
  lang: Lang
  onLangChange: (l: Lang) => void
  links: NavLink[]
  onOpenDashboard: () => void
}

export default function Navbar({ lang, onLangChange, links, onOpenDashboard }: NavbarProps) {
  const dashLabel = lang === 'ru' ? 'Дашборд' : 'Dashboard'
  return (
    <header className={s.header}>
      <nav className={s.nav}>
        <a href="#" className={s.logo}>
          <span className={s.logoIcon}>⚡</span>
          Life OS
        </a>

        <ul className={s.links}>
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={s.link}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className={s.actions}>
          <div className={s.langToggle}>
            <button
              className={`${s.langBtn} ${lang === 'ru' ? s.langActive : ''}`}
              onClick={() => onLangChange('ru')}
            >
              RU
            </button>
            <span className={s.langDivider} />
            <button
              className={`${s.langBtn} ${lang === 'en' ? s.langActive : ''}`}
              onClick={() => onLangChange('en')}
            >
              EN
            </button>
          </div>

          <button className={s.dashBtn} onClick={onOpenDashboard}>
            <span>📊</span>
            <span>{dashLabel}</span>
          </button>
        </div>
      </nav>
    </header>
  )
}
