import { useEffect, useRef, useState } from 'react'
import type { TgAuthData } from '../../hooks/useAuth'

declare global {
  interface Window {
    onTelegramAuth?: (user: TgAuthData) => void
  }
}

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || ''

interface LoginScreenProps {
  onTelegramLogin: (data: TgAuthData) => Promise<void>
  onDevLogin: (userId: string) => Promise<void>
  onBack: () => void
  lang: 'ru' | 'en'
}

const T = {
  ru: {
    title: 'Вход в Life OS',
    sub: 'Никаких паролей и почты — жми кнопку, Telegram подтвердит личность. Аккаунт создаётся автоматически.',
    back: '← Лендинг',
    noBot: 'VITE_BOT_USERNAME не задан в .env — виджет Telegram не загрузится.',
    devTitle: 'Dev-вход (localhost)',
    devPlaceholder: 'Telegram chat_id',
    devButton: 'Войти',
    error: 'Ошибка входа: ',
  },
  en: {
    title: 'Sign in to Life OS',
    sub: 'No passwords, no email — press the button and Telegram confirms your identity. Account is created automatically.',
    back: '← Landing',
    noBot: 'VITE_BOT_USERNAME is not set in .env — Telegram widget will not load.',
    devTitle: 'Dev login (localhost)',
    devPlaceholder: 'Telegram chat_id',
    devButton: 'Sign in',
    error: 'Login error: ',
  },
}

export default function LoginScreen({ onTelegramLogin, onDevLogin, onBack, lang }: LoginScreenProps) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const [devId, setDevId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const t = T[lang]

  useEffect(() => {
    if (!BOT_USERNAME || !widgetRef.current) return

    window.onTelegramAuth = (data) => {
      onTelegramLogin(data).catch((e: Error) => setError(e.message))
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '10')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    widgetRef.current.appendChild(script)

    return () => {
      delete window.onTelegramAuth
      if (widgetRef.current) widgetRef.current.innerHTML = ''
    }
  }, [onTelegramLogin])

  const handleDev = () => {
    if (!devId.trim()) return
    setError(null)
    onDevLogin(devId.trim()).catch((e: Error) => setError(e.message))
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24, textAlign: 'center',
    }}>
      <button
        onClick={onBack}
        style={{ position: 'absolute', top: 24, left: 24, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.7 }}
      >
        {t.back}
      </button>

      <h1 style={{ margin: 0 }}>{t.title}</h1>
      <p style={{ maxWidth: 420, opacity: 0.75, margin: 0 }}>{t.sub}</p>

      {BOT_USERNAME
        ? <div ref={widgetRef} />
        : <p style={{ color: '#c00', maxWidth: 420 }}>{t.noBot}</p>}

      {import.meta.env.DEV && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, opacity: 0.6 }}>{t.devTitle}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={devId}
              onChange={(e) => setDevId(e.target.value)}
              placeholder={t.devPlaceholder}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc' }}
            />
            <button
              onClick={handleDev}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#2AABEE', color: '#fff' }}
            >
              {t.devButton}
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: '#c00' }}>{t.error}{error}</p>}
    </div>
  )
}
