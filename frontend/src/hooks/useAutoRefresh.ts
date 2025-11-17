import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export interface AutoRefreshConfig {
  enabled: boolean
  interval: number // in milliseconds
  queryKey?: string[] // optional query key to refresh specific query
}

export const DEFAULT_REFRESH_INTERVALS = {
  OFF: 0,
  THIRTY_SECONDS: 30 * 1000,
  ONE_MINUTE: 60 * 1000,
  TWO_MINUTES: 2 * 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  TEN_MINUTES: 10 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000
} as const

export function useAutoRefresh(config: AutoRefreshConfig) {
  const queryClient = useQueryClient()
  const intervalRef = useRef<number | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [remainingTime, setRemainingTime] = useState<number>(0)
  const countdownRef = useRef<number | null>(null)

  // Manual refresh function
  const manualRefresh = () => {
    if (config.queryKey) {
      queryClient.invalidateQueries({ queryKey: config.queryKey })
    } else {
      queryClient.invalidateQueries()
    }
    setLastRefresh(new Date())
    setRemainingTime(config.interval)
  }

  // Start countdown timer
  const startCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }
    
    setRemainingTime(config.interval)
    
    countdownRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1000) {
          return config.interval
        }
        return prev - 1000
      })
    }, 1000) as unknown as number
  }

  // Stop countdown timer
  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setRemainingTime(0)
  }

  // Setup auto-refresh
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    if (!config.enabled || config.interval <= 0) {
      stopCountdown()
      return
    }

    // Start the countdown
    startCountdown()

    // Set up the refresh interval
    intervalRef.current = setInterval(() => {
      manualRefresh()
    }, config.interval) as unknown as number

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      stopCountdown()
    }
  }, [config.enabled, config.interval, config.queryKey?.join(',')])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      stopCountdown()
    }
  }, [])

  // Format remaining time for display
  const formatRemainingTime = (ms: number): string => {
    if (ms <= 0) return '0s'
    
    const totalSeconds = Math.ceil(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  // Format interval for display
  const formatInterval = (ms: number): string => {
    if (ms === 0) return 'Off'
    if (ms < 60000) return `${ms / 1000}s`
    if (ms < 3600000) return `${ms / 60000}m`
    return `${ms / 3600000}h`
  }

  return {
    isEnabled: config.enabled && config.interval > 0,
    lastRefresh,
    remainingTime,
    remainingTimeFormatted: formatRemainingTime(remainingTime),
    intervalFormatted: formatInterval(config.interval),
    manualRefresh
  }
}

// Hook for managing auto-refresh settings
export function useAutoRefreshSettings(defaultInterval: number = DEFAULT_REFRESH_INTERVALS.FIVE_MINUTES) {
  const [enabled, setEnabled] = useState(false)
  const [interval, setInterval] = useState(defaultInterval)

  const toggleEnabled = () => setEnabled(prev => !prev)
  
  const setIntervalValue = (newInterval: number) => {
    setInterval(newInterval)
    if (newInterval === 0) {
      setEnabled(false)
    }
  }

  return {
    enabled,
    interval,
    setEnabled,
    toggleEnabled,
    setInterval: setIntervalValue,
    config: { enabled, interval }
  }
}