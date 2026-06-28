import SectionTitle from '../ui/SectionTitle'
import StackGroup from './StackGroup'
import s from './Stack.module.css'

interface StackGroupData {
  name: string
  items: string[]
}

interface StackProps {
  kicker: string
  title: string
  sub: string
  groups: StackGroupData[]
}

export default function Stack({ kicker, title, sub, groups }: StackProps) {
  return (
    <section className={s.section} id="stack">
      <div className="section">
        <SectionTitle kicker={kicker} title={title} sub={sub} />

        <div className={s.grid}>
          {groups.map((group) => (
            <StackGroup key={group.name} {...group} />
          ))}
        </div>
      </div>
    </section>
  )
}
