import SectionTitle from '../ui/SectionTitle'
import s from './Features.module.css'

interface FeatureCard {
  icon: string
  title: string
  desc: string
}

interface FeaturesProps {
  kicker: string
  title: string
  sub: string
  cards: FeatureCard[]
}

export default function Features({ kicker, title, sub, cards }: FeaturesProps) {
  return (
    <section className={s.section} id="features">
      <div className="section">
        <SectionTitle kicker={kicker} title={title} sub={sub} align="center" />
        <div className={s.grid}>
          {cards.map((card) => (
            <div key={card.title} className={s.card}>
              <div className={s.icon}>{card.icon}</div>
              <h3 className={s.cardTitle}>{card.title}</h3>
              <p className={s.cardDesc}>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
