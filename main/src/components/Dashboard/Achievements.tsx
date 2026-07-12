// Достижения — вычисляются на сервере из данных чекинов/рефлексий,
// здесь только отображение: заработанные яркие, остальные приглушённые.

export interface Achievement {
  id: string
  earned: boolean
}

const BADGES: Record<string, { icon: string; title: { ru: string; en: string } }> = {
  first_day: { icon: '🌱', title: { ru: 'Первый день', en: 'First day' } },
  first_reflection: { icon: '📝', title: { ru: 'Первая рефлексия', en: 'First reflection' } },
  streak_7: { icon: '🔥', title: { ru: '7 дней подряд', en: '7-day streak' } },
  streak_14: { icon: '⚡', title: { ru: '14 дней подряд', en: '14-day streak' } },
  streak_30: { icon: '🏆', title: { ru: '30 дней подряд', en: '30-day streak' } },
  days_30: { icon: '📅', title: { ru: '30 дней с Life OS', en: '30 days tracked' } },
  days_100: { icon: '💯', title: { ru: '100 дней', en: '100 days' } },
  first_rating: { icon: '🎯', title: { ru: 'Первая оценка недели', en: 'First weekly rating' } },
}

interface AchievementsProps {
  achievements: Achievement[]
  lang: 'ru' | 'en'
}

export default function Achievements({ achievements, lang }: AchievementsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: 12,
    }}>
      {achievements.map((a) => {
        const badge = BADGES[a.id]
        if (!badge) return null
        return (
          <div
            key={a.id}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '16px 8px', borderRadius: 14, textAlign: 'center',
              border: a.earned ? '1px solid rgba(77,159,255,.35)' : '1px solid rgba(255,255,255,.06)',
              background: a.earned ? 'rgba(77,159,255,.08)' : 'rgba(255,255,255,.02)',
              opacity: a.earned ? 1 : 0.4,
              filter: a.earned ? 'none' : 'grayscale(1)',
            }}
          >
            <span style={{ fontSize: 26 }}>{badge.icon}</span>
            <span style={{ fontSize: 12, color: a.earned ? 'var(--text)' : 'var(--muted)', fontWeight: 600, lineHeight: 1.3 }}>
              {badge.title[lang]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
