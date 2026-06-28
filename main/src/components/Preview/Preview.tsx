import { useState } from 'react'
import SectionTitle from '../ui/SectionTitle'
import DashboardTab from './DashboardTab'
import TelegramTab from './TelegramTab'
import AiTab from './AiTab'
import type { DayData } from '../../hooks/useStats'
import s from './Preview.module.css'

type TabKey = 'dash' | 'tg' | 'ai'

interface Tab {
  key: string
  label: string
}

interface Metric {
  label: string
  value: string
  color: string
}

interface PreviewProps {
  kicker: string
  title: string
  sub: string
  tabs: Tab[]
  dashTab: { title: string; greeting: string; date: string; metrics: Metric[]; chartLabel: string }
  tgTab: { messages: { from: string; text: string }[] }
  aiTab: { prompt: string; response: string; label: string }
  weekData?: DayData[]
}

export default function Preview({ kicker, title, sub, tabs, dashTab, tgTab, aiTab, weekData }: PreviewProps) {
  const [active, setActive] = useState<TabKey>('dash')

  return (
    <section className={s.section} id="preview">
      <div className="section">
        <SectionTitle kicker={kicker} title={title} sub={sub} align="center" />

        <div className={s.tabBar}>
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`${s.tab} ${active === t.key ? s.tabActive : ''}`}
              onClick={() => setActive(t.key as TabKey)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={s.panel}>
          <div className={s.panelDots}>
            <span /><span /><span />
          </div>
          <div className={s.panelContent}>
            {active === 'dash' && <DashboardTab {...dashTab} weekData={weekData} />}
            {active === 'tg' && <TelegramTab {...tgTab} />}
            {active === 'ai' && <AiTab {...aiTab} />}
          </div>
        </div>
      </div>
    </section>
  )
}
