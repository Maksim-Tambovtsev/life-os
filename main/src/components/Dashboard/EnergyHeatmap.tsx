// Тепловая карта энергии за год, как contribution-график на GitHub:
// колонка = неделя, ряд = день недели, насыщенность = уровень энергии.

interface HeatDay {
  date: string
  energy: number | null
}

interface EnergyHeatmapProps {
  year: HeatDay[]
  lang: 'ru' | 'en'
}

const CELL = 11
const GAP = 3

const MONTHS = {
  ru: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

const WEEKDAYS = {
  ru: ['Пн', 'Ср', 'Пт'],
  en: ['Mon', 'Wed', 'Fri'],
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

// Цвет ячейки: нет данных → едва заметная, энергия 1-10 → 5 ступеней синего
function cellColor(energy: number | null | undefined) {
  if (energy == null) return 'rgba(255,255,255,.05)'
  const level = Math.max(1, Math.min(5, Math.ceil(energy / 2)))
  const alpha = [0.18, 0.35, 0.55, 0.75, 1][level - 1]
  return `rgba(77,159,255,${alpha})`
}

export default function EnergyHeatmap({ year, lang }: EnergyHeatmapProps) {
  const byDate = new Map(year.map((d) => [d.date, d.energy]))

  // Сетка: от понедельника недели, где было (сегодня - 364 дня), до сегодня
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 364)
  const mondayShift = (start.getDay() + 6) % 7 // 0 = понедельник
  start.setDate(start.getDate() - mondayShift)

  const weeks: { date: Date; iso: string }[][] = []
  const cursor = new Date(start)
  while (cursor <= today) {
    const week: { date: Date; iso: string }[] = []
    for (let d = 0; d < 7 && cursor <= today; d++) {
      week.push({ date: new Date(cursor), iso: toISO(cursor) })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  // Подписи месяцев: над колонкой, где месяц начинается
  const monthLabels: { col: number; label: string }[] = []
  let lastMonth = -1
  weeks.forEach((week, col) => {
    const m = week[0].date.getMonth()
    if (m !== lastMonth) {
      monthLabels.push({ col, label: MONTHS[lang][m] })
      lastMonth = m
    }
  })

  const gridWidth = weeks.length * (CELL + GAP)

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ minWidth: gridWidth + 34 }}>
        {/* Подписи месяцев */}
        <div style={{ position: 'relative', height: 16, marginLeft: 34 }}>
          {monthLabels.map((m) => (
            <span
              key={`${m.label}-${m.col}`}
              style={{
                position: 'absolute', left: m.col * (CELL + GAP),
                fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)',
              }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: GAP }}>
          {/* Подписи дней недели */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, width: 30 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <span key={d} style={{ height: CELL, fontSize: 9, color: 'var(--muted)', lineHeight: `${CELL}px`, fontFamily: 'var(--font-mono)' }}>
                {d === 0 ? WEEKDAYS[lang][0] : d === 2 ? WEEKDAYS[lang][1] : d === 4 ? WEEKDAYS[lang][2] : ''}
              </span>
            ))}
          </div>

          {/* Сетка недель */}
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
              {week.map((day) => {
                const energy = byDate.get(day.iso) ?? null
                return (
                  <div
                    key={day.iso}
                    title={energy != null ? `${day.iso}: ${energy}/10` : day.iso}
                    style={{
                      width: CELL, height: CELL, borderRadius: 3,
                      background: cellColor(energy),
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* Легенда */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, marginLeft: 34 }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', marginRight: 2 }}>1</span>
          {[1, 3, 5, 7, 9].map((e) => (
            <div key={e} style={{ width: CELL, height: CELL, borderRadius: 3, background: cellColor(e) }} />
          ))}
          <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 2 }}>10</span>
        </div>
      </div>
    </div>
  )
}
