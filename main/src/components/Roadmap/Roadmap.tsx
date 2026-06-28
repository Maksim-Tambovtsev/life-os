import SectionTitle from '../ui/SectionTitle'
import SprintCard from './SprintCard'
import type { SprintCardProps } from './SprintCard'
import s from './Roadmap.module.css'

interface RoadmapProps {
  kicker: string
  title: string
  sub: string
  sprints: SprintCardProps[]
}

export default function Roadmap({ kicker, title, sub, sprints }: RoadmapProps) {
  return (
    <section className={s.section} id="roadmap">
      <div className="section">
        <SectionTitle kicker={kicker} title={title} sub={sub} />

        <div className={s.grid}>
          {sprints.map((sprint) => (
            <SprintCard key={sprint.n} {...sprint} />
          ))}
        </div>
      </div>
    </section>
  )
}
