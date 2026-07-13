import { useState } from 'react'
import type { ReflectionEntry } from '../../hooks/useStats'

// Итог дня приходит от бота с HTML-разметкой (<b>Заголовок</b>).
// Разбираем её сами вместо dangerouslySetInnerHTML: сегменты между
// <b>...</b> — заголовки, остальное — обычный текст.
function parseSummary(summary: string) {
  const parts = summary.split(/<b>(.*?)<\/b>/g)
  return parts
    .map((text, i) => ({ text: text.trim(), isHeader: i % 2 === 1 }))
    .filter((p) => p.text.length > 0)
}

function fmtDate(dateStr: string, lang: 'ru' | 'en') {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'long',
  })
}

interface ReflectionsFeedProps {
  reflections: ReflectionEntry[]
  lang: 'ru' | 'en'
}

export default function ReflectionsFeed({ reflections, lang }: ReflectionsFeedProps) {
  // Первая (самая свежая) раскрыта, остальные по клику
  const [openIdx, setOpenIdx] = useState(0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {reflections.map((r, i) => {
        const open = i === openIdx
        return (
          <div
            key={`${r.date}-${i}`}
            style={{
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 14,
              background: 'rgba(255,255,255,.02)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setOpenIdx(open ? -1 : i)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
              }}
            >
              <span>📝 {fmtDate(r.date, lang)}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
            </button>

            {open && r.summary && (
              <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {parseSummary(r.summary).map((seg, j) =>
                  seg.isHeader ? (
                    <p key={j} style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--accent, #4D9FFF)', letterSpacing: '0.03em' }}>
                      {seg.text}
                    </p>
                  ) : (
                    <p key={j} style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--muted)', whiteSpace: 'pre-line' }}>
                      {seg.text}
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
