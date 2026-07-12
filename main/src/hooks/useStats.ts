import { useState, useEffect } from 'react'
import { API_URL } from './useAuth'

export interface DayData {
  date: string
  sleep_hours: number
  energy: number
}

export interface WeeklyRating {
  date: string
  rating: number
  note: string | null
}

export interface ReflectionEntry {
  date: string
  summary: string | null
}

export interface StatsData {
  streak: number
  avgSleep: number | null
  avgEnergy: number | null
  week: DayData[]
  month: DayData[]
  goalProgressPct: number
  weeklyRatings: WeeklyRating[]
  reflections: ReflectionEntry[]
}

export function useStats(token: string | null) {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetch(`${API_URL}/api/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  return { data, loading, error }
}
