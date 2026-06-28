import s from './SprintCard.module.css'

export interface SprintCardProps {
  n: string
  title: string
  week: string
  count: string
  tags: string[]
}

export default function SprintCard({ n, title, week, count, tags }: SprintCardProps) {
  return (
    <div className={s.card}>
      <div className={s.top}>
        <span className={s.num}>#{n}</span>
        <div className={s.meta}>
          <span>{week}</span>
          <span className={s.dot}>·</span>
          <span>{count}</span>
        </div>
      </div>

      <h3 className={s.title}>{title}</h3>

      <div className={s.tags}>
        {tags.map((tag) => (
          <span key={tag} className={s.tag}>{tag}</span>
        ))}
      </div>
    </div>
  )
}
