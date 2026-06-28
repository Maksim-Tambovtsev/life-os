import SectionTitle from '../ui/SectionTitle'
import s from './HowItWorks.module.css'

interface Step {
  n: string
  title: string
  desc: string
}

interface HowItWorksProps {
  kicker: string
  title: string
  sub: string
  steps: Step[]
}

export default function HowItWorks({ kicker, title, sub, steps }: HowItWorksProps) {
  return (
    <section className={s.section} id="how">
      <div className="section">
        <SectionTitle kicker={kicker} title={title} sub={sub} />
        <div className={s.steps}>
          {steps.map((step, i) => (
            <div key={step.n} className={s.step}>
              <div className={s.stepLeft}>
                <div className={s.stepNum}>{step.n}</div>
                {i < steps.length - 1 && <div className={s.connector} />}
              </div>
              <div className={s.stepBody}>
                <h3 className={s.stepTitle}>{step.title}</h3>
                <p className={s.stepDesc}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
