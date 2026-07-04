import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  delay?: number  // дополнительная задержка в секундах поверх базовых 0.1s в CSS
}

export default function Reveal({ children, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('reveal--visible')
          observer.unobserve(el)
        }
      },
      { threshold: 0.08 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="reveal"
      style={delay ? { transitionDelay: `${0.1 + delay}s` } : undefined}
    >
      {children}
    </div>
  )
}
