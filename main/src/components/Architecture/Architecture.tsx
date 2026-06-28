import SectionTitle from '../ui/SectionTitle'
import s from './Architecture.module.css'

interface ArchNode {
  id: string
  label: string
  sub: string
}

interface ArchitectureProps {
  kicker: string
  title: string
  sub: string
  nodes: ArchNode[]
}

const NODE_ICONS: Record<string, string> = {
  tg: '💬',
  react: '⚛️',
  api: '🔌',
  ai: '🤖',
  db: '🗄️',
}

export default function Architecture({ kicker, title, sub, nodes }: ArchitectureProps) {
  return (
    <section className={s.section} id="arch">
      <div className="section">
        <SectionTitle kicker={kicker} title={title} sub={sub} align="center" />

        <div className={s.flow}>
          {nodes.map((node, i) => (
            <div key={node.id} className={s.nodeWrap}>
              <div className={s.node}>
                <span className={s.nodeIcon}>{NODE_ICONS[node.id]}</span>
                <span className={s.nodeLabel}>{node.label}</span>
                <span className={s.nodeSub}>{node.sub}</span>
              </div>
              {i < nodes.length - 1 && (
                <div className={s.arrow}>
                  <div className={s.arrowLine} />
                  <div className={s.arrowHead}>›</div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={s.desc}>
          <div className={s.descItem}>
            <span className={s.descDot} style={{ background: '#29B6F6' }} />
            <span>Telegram → чекин от пользователя</span>
          </div>
          <div className={s.descItem}>
            <span className={s.descDot} style={{ background: 'var(--accent)' }} />
            <span>React → дашборд с данными</span>
          </div>
          <div className={s.descItem}>
            <span className={s.descDot} style={{ background: '#7FBBFF' }} />
            <span>Anthropic → AI-анализ паттернов</span>
          </div>
        </div>
      </div>
    </section>
  )
}
