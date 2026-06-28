import s from './Tabs.module.css'
import type { DayData } from '../../hooks/useStats'

interface Metric {
  label: string
  value: string
  color: string
}

interface DashboardTabProps {
  title: string
  greeting: string
  date: string
  metrics: Metric[]
  chartLabel: string
  weekData?: DayData[] // реальные данные из API, если сервер запущен
}

// Запасные бары, пока нет реальных данных
const MOCK_BARS = [60, 75, 55, 90, 65, 82, 88]
const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function DashboardTab({ greeting, date, metrics, chartLabel, weekData }: DashboardTabProps) {
  // Если есть реальные данные — конвертируем energy (1-10) в проценты высоты бара
  const bars = weekData && weekData.length > 0
    ? weekData.map((d) => Math.round((d.energy / 10) * 100))
    : MOCK_BARS

  return (
    <div className={s.dash}>
      <div className={s.dashHeader}>
        <div>
          <h3 className={s.dashGreeting}>{greeting}</h3>
          <p className={s.dashDate}>{date}</p>
        </div>
        <div className={s.dashAvatar}>M</div>
      </div>

      <div className={s.dashMetrics}>
        {metrics.map((m) => (
          <div key={m.label} className={s.dashMetric}>
            <span className={s.dashMetricVal} style={{ color: m.color }}>{m.value}</span>
            <span className={s.dashMetricLabel}>{m.label}</span>
          </div>
        ))}
      </div>

      <div className={s.dashChart}>
        <p className={s.dashChartLabel}>{chartLabel}</p>
        <div className={s.dashBars}>
          {bars.map((h, i) => (
            <div key={i} className={s.dashBar} style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className={s.dashDays}>
          {DAY_LABELS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
