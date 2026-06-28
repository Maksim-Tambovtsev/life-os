import s from './HeroMock.module.css'

interface HeroMockProps {
  greeting: string
  streak: string
  energy: string
  sleep: string
  energyVal: string
  sleepVal: string
  chart: string
}

const BARS = [55, 72, 60, 88, 65, 82, 90]

export default function HeroMock({ greeting, streak, energy, sleep, energyVal, sleepVal, chart }: HeroMockProps) {
  return (
    <div className={s.card}>
      <div className={s.header}>
        <div>
          <p className={s.greeting}>{greeting}</p>
          <span className={s.streak}>{streak}</span>
        </div>
        <div className={s.avatar}>M</div>
      </div>

      <div className={s.metrics}>
        <div className={s.metric}>
          <span className={s.metricLabel}>{energy}</span>
          <div className={s.bar}>
            <div className={s.barFill} style={{ width: energyVal }} />
          </div>
          <span className={s.metricVal}>{energyVal}</span>
        </div>
        <div className={s.metric}>
          <span className={s.metricLabel}>{sleep}</span>
          <div className={s.bar}>
            <div className={`${s.barFill} ${s.barCyan}`} style={{ width: '75%' }} />
          </div>
          <span className={s.metricVal}>{sleepVal}</span>
        </div>
      </div>

      <div className={s.chartWrap}>
        <p className={s.chartLabel}>{chart}</p>
        <div className={s.chart}>
          {BARS.map((h, i) => (
            <div key={i} className={s.chartBar} style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className={s.chartDays}>
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>

      <div className={s.glow} />
    </div>
  )
}
