import s from './Tabs.module.css'

interface AiTabProps {
  prompt: string
  response: string
  label: string
}

export default function AiTab({ prompt, response, label }: AiTabProps) {
  return (
    <div className={s.ai}>
      <div className={s.aiPrompt}>
        <span className={s.aiUser}>Вы</span>
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
        <div className={s.aiInsight}>
          <span className={s.aiInsightIcon}>📈</span>
          <span>Средняя энергия: 7.4/10</span>
        </div>
        <div className={s.aiInsight}>
          <span className={s.aiInsightIcon}>😴</span>
          <span>Сон &lt; 7ч → энергия -30%</span>
        </div>
        <div className={s.aiInsight}>
          <span className={s.aiInsightIcon}>🎯</span>
          <span>Лучший день: среда</span>
        </div>
      </div>
    </div>
  )
}
