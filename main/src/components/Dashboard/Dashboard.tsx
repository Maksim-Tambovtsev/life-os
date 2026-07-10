import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { StatsData } from '../../hooks/useStats'
import type { Lang } from '../../content'
import s from './Dashboard.module.css'

const LABELS = {
  ru: {
    back: '← Лендинг',
    title: 'Дашборд',
    streak: 'Стрик',
    streakUnit: 'дней',
    avgSleep: 'Средний сон',
    sleepUnit: 'ч',
    avgEnergy: 'Средняя энергия',
    energyUnit: '/10',
    energyWeek: 'Энергия — последние 7 дней',
    sleepWeek: 'Сон — последние 7 дней',
    trends: 'Тренды за 30 дней',
    noData: 'Данных пока нет. Пройди первый /checkin в Telegram, потом обнови страницу.',
    loading: 'Загрузка данных…',
    errorPrefix: 'Не удалось загрузить данные: ',
    greeting: 'Привет',
  },
  en: {
    back: '← Landing',
    title: 'Dashboard',
    streak: 'Streak',
    streakUnit: 'days',
    avgSleep: 'Avg sleep',
    sleepUnit: 'h',
    avgEnergy: 'Avg energy',
    energyUnit: '/10',
    energyWeek: 'Energy — last 7 days',
    sleepWeek: 'Sleep — last 7 days',
    trends: 'Trends — last 30 days',
    noData: 'No data yet. Complete your first /checkin in Telegram, then refresh.',
    loading: 'Loading data…',
    errorPrefix: 'Failed to load data: ',
    greeting: 'Hey',
  },
}

interface DashboardProps {
  data: StatsData | null
  loading: boolean
  error: string | null
  onBack: () => void
  lang: Lang
  name: string | null
}

// Форматируем дату YYYY-MM-DD → короткий вид (06/28)
function fmtDate(dateStr: string) {
  return dateStr.slice(5).replace('-', '/')
}

// Кастомный тултип для обоих графиков
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className={s.tooltip}>
      <p className={s.tooltipLabel}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className={s.tooltipValue}>{p.value}</p>
      ))}
    </div>
  )
}

export default function Dashboard({ data, loading, error, onBack, lang, name }: DashboardProps) {
  const t = LABELS[lang]
  const today = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className={s.root}>
      {/* Хедер */}
      <div className={s.header}>
        <button className={s.backBtn} onClick={onBack}>{t.back}</button>
        <div className={s.headerRight}>
          <span className={s.date}>{today}</span>
        </div>
      </div>

      <div className={s.inner}>
        <h1 className={s.title}>{t.greeting}{name ? `, ${name}` : ''} 👋</h1>

        {/* Состояние загрузки */}
        {loading && <p className={s.status}>{t.loading}</p>}
        {error && <p className={s.statusError}>{t.errorPrefix}{error}</p>}

        {/* Нет данных */}
        {!loading && !error && data && data.week.length === 0 && (
          <div className={s.empty}>
            <span className={s.emptyIcon}>📭</span>
            <p>{t.noData}</p>
          </div>
        )}

        {/* Основной контент */}
        {data && data.week.length > 0 && (
          <>
            {/* Карточки статистики */}
            <div className={s.statsRow}>
              <div className={s.statCard}>
                <span className={s.statValue}>
                  {data.streak} <span className={s.statUnit}>{t.streakUnit}</span>
                </span>
                <span className={s.statLabel}>{t.streak}</span>
                <span className={s.statIcon}>🔥</span>
              </div>
              <div className={s.statCard}>
                <span className={s.statValue}>
                  {data.avgSleep ?? '—'} <span className={s.statUnit}>{t.sleepUnit}</span>
                </span>
                <span className={s.statLabel}>{t.avgSleep}</span>
                <span className={s.statIcon}>😴</span>
              </div>
              <div className={s.statCard}>
                <span className={s.statValue}>
                  {data.avgEnergy ?? '—'} <span className={s.statUnit}>{t.energyUnit}</span>
                </span>
                <span className={s.statLabel}>{t.avgEnergy}</span>
                <span className={s.statIcon}>⚡</span>
              </div>
            </div>

            {/* Графики недели */}
            <div className={s.chartsRow}>
              <div className={s.chartCard}>
                <p className={s.chartLabel}>{t.energyWeek}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.week.map((d) => ({ ...d, date: fmtDate(d.date) }))} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#6B7480', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fill: '#6B7480', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,.03)' }} />
                    <Bar dataKey="energy" fill="#4D9FFF" radius={[4, 4, 2, 2]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className={s.chartCard}>
                <p className={s.chartLabel}>{t.sleepWeek}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.week.map((d) => ({ ...d, date: fmtDate(d.date) }))} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#6B7480', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 12]} tick={{ fill: '#6B7480', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,.03)' }} />
                    <Bar dataKey="sleep_hours" fill="#29B6F6" radius={[4, 4, 2, 2]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Тренды за 30 дней — только если достаточно данных */}
            {data.month.length > 7 && (
              <div className={s.chartCardWide}>
                <p className={s.chartLabel}>{t.trends}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.month.map((d) => ({ ...d, date: fmtDate(d.date) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#6B7480', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#6B7480', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="energy" stroke="#4D9FFF" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="sleep_hours" stroke="#29B6F6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
