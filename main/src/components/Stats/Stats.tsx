import { useRef } from 'react'
import { useCountUp } from '../../hooks/useCountUp'
import s from './Stats.module.css'

interface StatItem {
  value: string
  label: string
}

interface StatsProps {
  items: StatItem[]
}

function StatCounter({ value, label }: StatItem) {
  const ref = useRef<HTMLDivElement>(null)
  const num = parseInt(value)
  const suffix = value.replace(String(num), '')
  const count = useCountUp(num, ref)

  return (
    <div className={s.item} ref={ref}>
      <span className={s.value}>
        {count}{suffix}
      </span>
      <span className={s.label}>{label}</span>
    </div>
  )
}

export default function Stats({ items }: StatsProps) {
  return (
    <section className={s.section}>
      <div className={s.inner}>
        {items.map((item) => (
          <StatCounter key={item.label} {...item} />
        ))}
      </div>
    </section>
  )
}
