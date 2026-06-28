import Badge from '../ui/Badge'
import s from './Intro.module.css'

interface IntroProps {
  badge: string
  title: string
  sub: string
  lines: string[]
}

export default function Intro({ badge, title, sub, lines }: IntroProps) {
  return (
    <section className={s.section}>
      <div className="section">
        <div className={s.inner}>
          <div className={s.left}>
            <Badge text={badge} />
            <h2 className={s.title}>{title}</h2>
            <p className={s.sub}>{sub}</p>
          </div>

          <div className={s.right}>
            {lines.map((line, i) => (
              <div key={i} className={s.line}>
                <span className={s.num}>0{i + 1}</span>
                <p>{line}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
