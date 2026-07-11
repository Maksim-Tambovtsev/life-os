import s from './Tabs.module.css'

interface AiTabProps {
  prompt: string
  response: string
  label: string
  youLabel: string
  insights: string[]
}

export default function AiTab({ prompt, response, label, youLabel, insights }: AiTabProps) {
  return (
    <div className={s.ai}>
      <div className={s.aiPrompt}>
        <span className={s.aiUser}>{youLabel}</span>
        <p className={s.aiPromptText}>{prompt}</p>
      </div>

      <div className={s.aiResponse}>
        <div className={s.aiLabel}>
          <span className={s.aiDot} />
          {label}
        </div>
        <p className={s.aiText}>{response}</p>
      </div>

      <div className={s.aiInsights}>
        {insights.map((text, i) => (
          <div key={i} className={s.aiInsight}>
            <span className={s.aiInsightIcon}>{['📈', '😴', '🎯'][i] ?? '•'}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
