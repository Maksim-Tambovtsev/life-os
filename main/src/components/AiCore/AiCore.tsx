import s from './AiCore.module.css'

// Абстрактная анимированная "AI-голова": светящееся ядро, орбитальные узлы
// нейросети, механический разъём сбоку. Не фотореалистичный робот (нет
// исходных файлов для этого), но того же настроения — тёмный фон, металл,
// свечение, лёгкая механика.
export default function AiCore() {
  return (
    <div className={s.wrap}>
      <div className={s.glowRing} />
      <svg viewBox="0 0 320 320" className={s.svg} role="img" aria-label="AI core">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8FCBFF" />
            <stop offset="45%" stopColor="#4D9FFF" />
            <stop offset="100%" stopColor="#4D9FFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="shellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2A2E38" />
            <stop offset="100%" stopColor="#14161C" />
          </linearGradient>
        </defs>

        {/* Внешний контур "головы" — скруглённый шестиугольник */}
        <path
          className={s.shell}
          d="M160 18
             C 214 18 258 40 278 82
             C 292 112 292 150 292 160
             C 292 210 268 252 224 278
             C 200 292 160 302 160 302
             C 160 302 120 292 96 278
             C 52 252 28 210 28 160
             C 28 150 28 112 42 82
             C 62 40 106 18 160 18 Z"
          fill="url(#shellGrad)"
          stroke="rgba(255,255,255,.08)"
          strokeWidth="1.5"
        />

        {/* Механический "разрез" слева: пластины + шестерня */}
        <g className={s.mech} opacity="0.9">
          <path d="M40 110 L100 95 L108 140 L52 165 Z" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.14)" strokeWidth="1" />
          <path d="M44 168 L106 150 L100 210 L54 226 Z" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.1)" strokeWidth="1" />
          <g className={s.gear} style={{ transformOrigin: '78px 138px' }}>
            <circle cx="78" cy="138" r="20" fill="none" stroke="#4D9FFF" strokeOpacity="0.55" strokeWidth="3" />
            <circle cx="78" cy="138" r="20" fill="none" stroke="#4D9FFF" strokeOpacity="0.55" strokeWidth="3"
              strokeDasharray="6 8" />
            <circle cx="78" cy="138" r="5" fill="#4D9FFF" fillOpacity="0.6" />
          </g>
          {/* Провода */}
          <path className={s.wire} d="M46 112 C 20 100, 10 130, 30 145" fill="none" stroke="#5BA7FF" strokeWidth="1.5" strokeLinecap="round" />
          <path className={s.wire2} d="M50 220 C 24 232, 18 200, 36 190" fill="none" stroke="#5BA7FF" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Светящееся ядро-глаз */}
        <circle cx="190" cy="150" r="46" fill="url(#coreGlow)" className={s.core} />
        <circle cx="190" cy="150" r="14" fill="#fff" className={s.corePupil} />

        {/* Орбитальные узлы нейросети */}
        <g className={s.orbit1}>
          <line x1="190" y1="150" x2="248" y2="112" stroke="#4D9FFF" strokeOpacity="0.35" strokeWidth="1" />
          <circle cx="248" cy="112" r="4" fill="#8FCBFF" />
        </g>
        <g className={s.orbit2}>
          <line x1="190" y1="150" x2="252" y2="188" stroke="#4D9FFF" strokeOpacity="0.35" strokeWidth="1" />
          <circle cx="252" cy="188" r="3.5" fill="#8FCBFF" />
        </g>
        <g className={s.orbit3}>
          <line x1="190" y1="150" x2="214" y2="216" stroke="#4D9FFF" strokeOpacity="0.3" strokeWidth="1" />
          <circle cx="214" cy="216" r="3" fill="#8FCBFF" />
        </g>

        {/* Верхний болт (деталь как на референсе) */}
        <circle cx="176" cy="34" r="5" fill="#2A2E38" stroke="rgba(255,255,255,.2)" strokeWidth="1" />

        {/* Искра-акцент справа, как в референсных кадрах */}
        <g className={s.sparkle} transform="translate(276 96)">
          <path d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z" fill="#fff" />
        </g>
      </svg>
    </div>
  )
}
