import s from './Badge.module.css'

interface BadgeProps {
  text: string
}

export default function Badge({ text }: BadgeProps) {
  return <span className={s.badge}>{text}</span>
}
