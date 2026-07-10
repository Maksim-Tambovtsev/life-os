import { useState, useCallback } from 'react'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const TOKEN_KEY = 'lifeos_token'
const USER_KEY = 'lifeos_user'

// Данные, которые возвращает Telegram Login Widget
export interface TgAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export interface Profile {
  user_id: string
  name: string | null
  goal_year: string | null
  priority: string | null
  onboarded: number
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function readUser(): Profile | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as Profile) : null
  } catch {
    return null
  }
}

async function requestToken(path: string, body: unknown): Promise<{ token: string; user: Profile }> {
  const r = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }))
    throw new Error(err.error || `HTTP ${r.status}`)
  }
  return r.json()
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(getToken())
  const [user, setUser] = useState<Profile | null>(readUser())

  const save = useCallback((t: string, u: Profile) => {
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setToken(t)
    setUser(u)
  }, [])

  const loginTelegram = useCallback(async (data: TgAuthData) => {
    const res = await requestToken('/api/auth/telegram', data)
    save(res.token, res.user)
  }, [save])

  const loginDev = useCallback(async (userId: string) => {
    const res = await requestToken('/api/auth/dev', { user_id: userId })
    save(res.token, res.user)
  }, [save])

  const loginWithToken = useCallback(async (loginToken: string) => {
    const res = await requestToken('/api/auth/login-token', { token: loginToken })
    save(res.token, res.user)
  }, [save])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  return { token, user, loginTelegram, loginDev, loginWithToken, logout }
}
