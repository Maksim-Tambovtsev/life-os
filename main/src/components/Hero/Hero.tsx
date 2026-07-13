import Badge from '../ui/Badge'
import AiCore from '../AiCore/AiCore'
import s from './Hero.module.css'

const TG_LINK = 'https://t.me/CoreOS_ai_bot'

interface HeroProps {
  badge: string
  title1: string
  title2: string
  subtitle: string
  cta1: string
  ctaTg: string
}

export default function Hero({ badge, title1, title2, subtitle, cta1, ctaTg }: HeroProps) {
  return (
    <section className={s.section}>
      <div className={s.blob1} />
      <div className={s.blob2} />

      <div className={s.inner}>
        <div className={s.text}>
          <div className={s.badgeWrap} style={{ animationDelay: '0s' }}>
            <Badge text={badge} />
          </div>

          <h1 className={s.title} style={{ animationDelay: '0.08s' }}>
            {title1}{' '}
            <span className={s.accent}>{title2}</span>
          </h1>

          <p className={s.subtitle} style={{ animationDelay: '0.16s' }}>
            {subtitle}
          </p>

          <div className={s.ctas} style={{ animationDelay: '0.24s' }}>
            <a
              href={TG_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className={s.ctaTg}
            >
              {ctaTg}
            </a>
            <a href="#preview" className={s.ctaPrimary}>{cta1}</a>
          </div>
        </div>

        <div className={s.visual}>
          <AiCore />
        </div>
      </div>
    </section>
  )
}
