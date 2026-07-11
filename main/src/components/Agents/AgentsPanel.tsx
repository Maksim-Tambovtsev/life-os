import { useState } from 'react'
import type { Profile, ProfileUpdate } from '../../hooks/useAuth'
import type { Lang } from '../../content'
import s from './AgentsPanel.module.css'

const MAX_LEN = 2000

// Пять агентов + главная цель. Ключи совпадают с полями профиля на бэкенде.
type FieldKey = keyof ProfileUpdate

interface FieldDef {
  key: FieldKey
  icon: string
  title: { ru: string; en: string }
  desc: { ru: string; en: string }
  placeholder: { ru: string; en: string }
}

const FIELDS: FieldDef[] = [
  {
    key: 'goal_year',
    icon: '🎯',
    title: { ru: 'Моя основная цель', en: 'My main goal' },
    desc: {
      ru: 'Главная цель на 12 месяцев. Её видят все агенты — от неё они отталкиваются в каждом совете.',
      en: 'Your main goal for the next 12 months. Every agent sees it and grounds their advice in it.',
    },
    placeholder: {
      ru: 'Например: выйти на доход $3000/мес со своего продукта к июлю 2027',
      en: 'E.g.: reach $3000/mo income from my own product by July 2027',
    },
  },
  {
    key: 'agent_ctx_strategist',
    icon: '🧭',
    title: { ru: 'Контекст для Стратега', en: 'Context for the Strategist' },
    desc: {
      ru: 'Работа, проект, текущая фаза. Стратег помогает держать фокус и не распыляться.',
      en: 'Work, project, current phase. The Strategist keeps you focused.',
    },
    placeholder: {
      ru: 'Например: делаю SaaS-продукт соло, фаза MVP, параллельно работаю фултайм; главный риск — распыление на фичи',
      en: 'E.g.: building a SaaS solo, MVP phase, full-time job in parallel; main risk is feature creep',
    },
  },
  {
    key: 'agent_ctx_health',
    icon: '💪',
    title: { ru: 'Контекст для Здоровья', en: 'Context for Health' },
    desc: {
      ru: 'Ограничения, предпочтения, текущий режим. Агент учтёт их в советах по сну, энергии и активности.',
      en: 'Limitations, preferences, current routine — used in sleep, energy and activity advice.',
    },
    placeholder: {
      ru: 'Например: сидячая работа, болит правое колено — без бега; люблю велосипед и хайкинг, ложусь около 00:30',
      en: 'E.g.: desk job, right knee pain — no running; enjoy cycling and hiking, usually in bed by 00:30',
    },
  },
  {
    key: 'agent_ctx_focus',
    icon: '⚡',
    title: { ru: 'Контекст для Фокуса', en: 'Context for Focus' },
    desc: {
      ru: 'Что обычно мешает работать: отвлечения, прокрастинация, время пиковой продуктивности.',
      en: 'What usually gets in the way: distractions, procrastination, your peak hours.',
    },
    placeholder: {
      ru: 'Например: залипаю в телефон по утрам, лучше всего работаю 10:00–13:00, большие задачи пугают — нужен первый маленький шаг',
      en: 'E.g.: phone-scrolling in the morning, best hours 10:00–13:00, big tasks scare me — I need a tiny first step',
    },
  },
  {
    key: 'agent_ctx_mentor',
    icon: '🤝',
    title: { ru: 'Контекст для Ментора', en: 'Context for the Mentor' },
    desc: {
      ru: 'Личное: что тебя заряжает, что тревожит, о чём хочется говорить честно.',
      en: 'Personal: what energises you, what worries you, what you want to talk about honestly.',
    },
    placeholder: {
      ru: 'Например: переехал в другую страну, иногда одиноко; заряжаюсь от прогресса в проекте; не люблю пустые комплименты',
      en: 'E.g.: moved abroad recently, sometimes lonely; progress energises me; I dislike empty praise',
    },
  },
  {
    key: 'agent_ctx_analyst',
    icon: '📊',
    title: { ru: 'Контекст для Аналитика', en: 'Context for the Analyst' },
    desc: {
      ru: 'Какие метрики и связи тебе важны в еженедельных и месячных разборах.',
      en: 'Which metrics and correlations matter to you in weekly and monthly reviews.',
    },
    placeholder: {
      ru: 'Например: следи за связью сна и продуктивности; отмечай, если забрасываю спорт больше чем на 4 дня',
      en: 'E.g.: watch the sleep-productivity link; flag when I skip sport for more than 4 days',
    },
  },
]

const T = {
  ru: {
    back: '← Дашборд',
    title: 'Мои агенты',
    howToTitle: 'Как заполнять',
    howTo1: 'Пиши свободным текстом, как рассказал бы другу: факты о себе, ограничения, цели, предпочтения.',
    howTo2: 'Коротко лучше, чем длинно: 2–4 предложения на блок достаточно. Конкретика («болит колено», «работаю по ночам») полезнее общих слов («хочу быть здоровым»).',
    howTo3: 'Сохранённое добавляется к знаниям агента и учитывается в каждом его ответе в Telegram. Можно менять в любой момент.',
    save: 'Сохранить',
    saving: 'Сохраняю…',
    saved: '✓ Сохранено — агенты уже учитывают новый контекст',
  },
  en: {
    back: '← Dashboard',
    title: 'My agents',
    howToTitle: 'How to fill this in',
    howTo1: 'Write freely, as if telling a friend: facts about you, limitations, goals, preferences.',
    howTo2: 'Short beats long: 2–4 sentences per block is enough. Specifics ("knee pain", "I work nights") beat generic words ("I want to be healthy").',
    howTo3: 'What you save is added to the agent\'s knowledge and used in every reply in Telegram. Edit any time.',
    save: 'Save',
    saving: 'Saving…',
    saved: '✓ Saved — agents already use the new context',
  },
}

interface AgentsPanelProps {
  profile: Profile | null
  onSave: (fields: ProfileUpdate) => Promise<unknown>
  onBack: () => void
  lang: Lang
}

export default function AgentsPanel({ profile, onSave, onBack, lang }: AgentsPanelProps) {
  const t = T[lang]
  const [values, setValues] = useState<Record<FieldKey, string>>(() => {
    const init = {} as Record<FieldKey, string>
    for (const f of FIELDS) init[f.key] = (profile?.[f.key] as string | null) ?? ''
    return init
  })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setField = (key: FieldKey, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
    setDirty(true)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(values)
      setDirty(false)
      setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={s.root}>
      <div className={s.inner}>
        <button className="backBtn" onClick={onBack} style={{
          alignSelf: 'flex-start', background: 'none', border: '1px solid var(--border-2)',
          color: 'var(--muted)', fontSize: 14, padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
        }}>
          {t.back}
        </button>

        <h1 className={s.title}>{t.title}</h1>

        <div className={s.howTo}>
          <span className={s.howToTitle}>💡 {t.howToTitle}</span>
          <span className={s.howToText}>{t.howTo1}</span>
          <span className={s.howToText}>{t.howTo2}</span>
          <span className={s.howToText}>{t.howTo3}</span>
        </div>

        {FIELDS.map((f) => (
          <div key={f.key} className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardIcon}>{f.icon}</span>
              <span className={s.cardTitle}>{f.title[lang]}</span>
            </div>
            <p className={s.cardDesc}>{f.desc[lang]}</p>
            <textarea
              className={s.textarea}
              value={values[f.key]}
              maxLength={MAX_LEN}
              placeholder={f.placeholder[lang]}
              onChange={(e) => setField(f.key, e.target.value)}
            />
            <span className={s.counter}>{values[f.key].length}/{MAX_LEN}</span>
          </div>
        ))}

        <div className={s.saveBar}>
          {saved && <span className={s.savedNote}>{t.saved}</span>}
          {error && <span className={s.errorNote}>{error}</span>}
          <button className={s.saveBtn} onClick={handleSave} disabled={!dirty || saving}>
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  )
}
