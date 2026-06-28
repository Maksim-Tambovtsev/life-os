import s from './StackGroup.module.css'

interface StackGroupProps {
  name: string
  items: string[]
}

export default function StackGroup({ name, items }: StackGroupProps) {
  return (
    <div className={s.group}>
      <h3 className={s.name}>{name}</h3>
      <div className={s.items}>
        {items.map((item) => (
          <div key={item} className={s.item}>
            <span className={s.itemDot} />
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
