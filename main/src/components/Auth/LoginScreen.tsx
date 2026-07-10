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
  externalError?: string | null
}

const T = {
  ru: {
    title: 'Вход в Life OS',
    sub: 'Никаких паролей и почты — вход через Telegram-бота.',
    back: '← Лендинг',
    botStepsTitle: 'Основной способ входа',
    botStep1: 'Открой бота и напиши команду ',
    botStep2: ', он пришлёт одноразовую ссылку — перейди по ней.',
    openBot: 'Открыть бота',
    widgetDivider: 'или через виджет Telegram (может не сработать не у всех)',
    noBot: 'VITE_BOT_USERNAME не задан в .env — виджет Telegram не загрузится.',
    devTitle: 'Dev-вход (localhost)',
    devPlaceholder: 'Telegram chat_id',
    devButton: 'Войти',
    error: 'Ошибка входа: ',
  },
  en: {
    title: 'Sign in to Life OS',
    sub: 'No passwords, no email — sign in via the Telegram bot.',
    back: '← Landing',
    botStepsTitle: 'Recommended way to sign in',
    botStep1: 'Open the bot and send the command ',
    botStep2: ' — it will reply with a one-time link. Follow it.',
    openBot: 'Open the bot',
    widgetDivider: 'or via the Telegram widget (does not work for everyone)',
    noBot: 'VITE_BOT_USERNAME is not set in .env — Telegram widget will not load.',
    devTitle: 'Dev login (localhost)',
    devPlaceholder: 'Telegram chat_id',
    devButton: 'Sign in',
    error: 'Login error: ',
  },
}

export default function LoginScreen({ onTelegramLogin, onDevLogin, onBack, lang, externalError }: LoginScreenProps) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const [devId, setDevId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const t = T[lang]
  const shownError = error || externalError

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

      {BOT_USERNAME && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', maxWidth: 360 }}>
          <span style={{ fontSize: 13, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.botStepsTitle}</span>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>
            {t.botStep1}<code style={{ background: 'rgba(255,255,255,.08)', padding: '2px 6px', borderRadius: 4 }}>/login</code>{t.botStep2}
          </p>
          <a
            href={`https://t.me/${BOT_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '10px 20px', borderRadius: 8, background: '#2AABEE', color: '#fff', textDecoration: 'none', fontWeight: 500 }}
          >
            {t.openBot}
          </a>
        </div>
      )}

      {BOT_USERNAME && <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>{t.widgetDivider}</p>}

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

      {shownError && <p style={{ color: '#c00' }}>{t.error}{shownError}</p>}
    </div>
  )
}
