import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { StatsData } from '../../hooks/useStats'
import ReflectionsFeed from './ReflectionsFeed'
import EnergyHeatmap from './EnergyHeatmap'
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
    noData: 'Данных пока нет. Пройди первую рефлексию в Telegram (📝 Рефлексия), потом обнови страницу.',
    loading: 'Загрузка данных…',
    errorPrefix: 'Не удалось загрузить данные: ',
    greeting: 'Привет',
    agents: '🤖 Мои агенты',
    normsTitle: 'Неделя — % от нормы',
    gaugeSleep: 'Сон',
    gaugeEnergy: 'Энергия',
    gaugeGoal: 'Цель',
    goalBarTitle: 'Прогресс к цели — еженедельные оценки',
    goalBarLatest: 'Последняя оценка',
    goalBarEmpty: 'Оценок пока нет. Бот спросит о прогрессе в пятницу вечером — ответь числом от 1 до 10.',
    heatmapTitle: 'Энергия за год',
    reflectionsTitle: 'История рефлексий',
    reflectionsEmpty: 'Рефлексий пока нет. Нажми «📝 Рефлексия» в боте вечером — итоги дня появятся здесь.',
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
    noData: 'No data yet. Complete your first reflection in Telegram (📝 Рефлексия), then refresh.',
    loading: 'Loading data…',
    errorPrefix: 'Failed to load data: ',
    greeting: 'Hey',
    agents: '🤖 My agents',
    normsTitle: 'Week — % of norm',
    gaugeSleep: 'Sleep',
    gaugeEnergy: 'Energy',
    gaugeGoal: 'Goal',
    goalBarTitle: 'Goal progress — weekly ratings',
    goalBarLatest: 'Latest rating',
    goalBarEmpty: 'No ratings yet. The bot asks about progress on Friday evening — reply with a number 1–10.',
    heatmapTitle: 'Energy — last 365 days',
    reflectionsTitle: 'Reflection history',
    reflectionsEmpty: 'No reflections yet. Tap «📝 Рефлексия» in the bot in the evening — your day summaries will appear here.',
  },
}

interface DashboardProps {
  data: StatsData | null
  loading: boolean
  error: string | null
  onBack: () => void
  onOpenAgents: () => void
  lang: Lang
  name: string | null
}

// Круговой индикатор: value в процентах 0-100
function Gauge({ value, label, color }: { value: number; label: string; color: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  const r = 54
  const circumference = 2 * Math.PI * r
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="66" textAnchor="middle" fill="var(--text, #fff)"
          style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-head)' }}>
          {Math.round(clamped)}%
        </text>
        <text x="70" y="88" textAnchor="middle" fill="var(--muted, #6B7480)" style={{ fontSize: 12 }}>
          {label}
        </text>
      </svg>
    </div>
  )
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

export default function Dashboard({ data, loading, error, onBack, onOpenAgents, lang, name }: DashboardProps) {
  const t = LABELS[lang]
  const today = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // Проценты от нормы: сон — от 8 часов, энергия — от 10, цель — % дней с шагом к цели
  const sleepPct = data?.avgSleep != null ? (data.avgSleep / 8) * 100 : null
  const energyPct = data?.avgEnergy != null ? (data.avgEnergy / 10) * 100 : null
  const goalPct = data?.goalProgressPct ?? null
  const latestRating = data?.weeklyRatings?.length
    ? data.weeklyRatings[data.weeklyRatings.length - 1]
    : null

  return (
    <div className={s.root}>
      {/* Хедер */}
      <div className={s.header}>
        <button className={s.backBtn} onClick={onBack}>{t.back}</button>
        <div className={s.headerRight}>
          <button className={s.backBtn} onClick={onOpenAgents}>{t.agents}</button>
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

            {/* Круговые индикаторы: % от нормы */}
            <div className={s.chartCardWide}>
              <p className={s.chartLabel}>{t.normsTitle}</p>
              <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12 }}>
                {sleepPct != null && <Gauge value={sleepPct} label={t.gaugeSleep} color="#29B6F6" />}
                {energyPct != null && <Gauge value={energyPct} label={t.gaugeEnergy} color="#4D9FFF" />}
                {goalPct != null && <Gauge value={goalPct} label={t.gaugeGoal} color="#6FE3A5" />}
              </div>
            </div>

            {/* Полоса прогресса к цели по еженедельным оценкам */}
            <div className={s.chartCardWide}>
              <p className={s.chartLabel}>{t.goalBarTitle}</p>
              {latestRating ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {t.goalBarLatest}: {fmtDate(latestRating.date)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700 }}>
                      {latestRating.rating}<span style={{ fontSize: 14, color: 'var(--muted)' }}>/10</span>
                    </span>
                  </div>
                  <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${latestRating.rating * 10}%`, height: '100%', borderRadius: 6,
                      background: 'linear-gradient(90deg, #4D9FFF, #6FE3A5)',
                      transition: 'width .6s cubic-bezier(.2,.7,.2,1)',
                    }} />
                  </div>
                  {data.weeklyRatings.length > 1 && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 40 }}>
                      {data.weeklyRatings.map((r, i) => (
                        <div key={`${r.date}-${i}`} title={`${fmtDate(r.date)}: ${r.rating}/10`} style={{
                          flex: 1, maxWidth: 28, borderRadius: 3,
                          height: `${r.rating * 10}%`,
                          background: 'rgba(77,159,255,.45)',
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>{t.goalBarEmpty}</p>
              )}
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

            {/* Тепловая карта энергии за год */}
            {data.year && data.year.length > 0 && (
              <div className={s.chartCardWide}>
                <p className={s.chartLabel}>{t.heatmapTitle}</p>
                <EnergyHeatmap year={data.year} lang={lang} />
              </div>
            )}

            {/* История рефлексий — итоги дня из бота */}
            <div className={s.chartCardWide}>
              <p className={s.chartLabel}>{t.reflectionsTitle}</p>
              {data.reflections && data.reflections.length > 0 ? (
                <ReflectionsFeed reflections={data.reflections} lang={lang} />
              ) : (
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>{t.reflectionsEmpty}</p>
              )}
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
