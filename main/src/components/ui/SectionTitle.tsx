import s from './SectionTitle.module.css'

interface SectionTitleProps {
  kicker: string
  title: string
  sub?: string
  align?: 'left' | 'center'
}

export default function SectionTitle({ kicker, title, sub, align = 'left' }: SectionTitleProps) {
  return (
    <div className={`${s.wrap} ${align === 'center' ? s.center : ''}`}>
      <span className={s.kicker}>{kicker}</span>
      <h2 className={s.title}>{title}</h2>
      {sub && <p className={s.sub}>{sub}</p>}
    </div>
  )
}
