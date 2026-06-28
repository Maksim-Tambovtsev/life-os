import { useState, useEffect } from 'react'

export interface DayData {
  date: string
  sleep_hours: number
  energy: number
}

export interface StatsData {
  streak: number
  avgSleep: number | null
  avgEnergy: number | null
  week: DayData[]
  month: DayData[]
}

export function useStats() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('http://localhost:3001/api/stats')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
