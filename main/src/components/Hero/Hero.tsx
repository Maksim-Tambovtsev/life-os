import Badge from '../ui/Badge'
import HeroMock from '../HeroMock/HeroMock'
import s from './Hero.module.css'

interface HeroMockData {
  greeting: string
  streak: string
  energy: string
  sleep: string
  energyVal: string
  sleepVal: string
  chart: string
}

interface HeroProps {
  badge: string
  title1: string
  title2: string
  subtitle: string
  cta1: string
  cta2: string
  mock: HeroMockData
}

export default function Hero({ badge, title1, title2, subtitle, cta1, cta2, mock }: HeroProps) {
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
            <a href="#preview" className={s.ctaPrimary}>{cta1}</a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className={s.ctaSecondary}
            >
              {cta2}
            </a>
          </div>
        </div>

        <div className={s.visual}>
          <HeroMock {...mock} />
        </div>
      </div>
    </section>
  )
}
