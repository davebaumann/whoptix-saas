import { useAutoRefresh, useAutoRefreshSettings, DEFAULT_REFRESH_INTERVALS } from '../hooks/useAutoRefresh'

interface AutoRefreshControlsProps {
  queryKey?: string[]
  defaultInterval?: number
  className?: string
}

const INTERVAL_OPTIONS = [
  { value: DEFAULT_REFRESH_INTERVALS.OFF, label: 'Off' },
  { value: DEFAULT_REFRESH_INTERVALS.THIRTY_SECONDS, label: '30 seconds' },
  { value: DEFAULT_REFRESH_INTERVALS.ONE_MINUTE, label: '1 minute' },
  { value: DEFAULT_REFRESH_INTERVALS.TWO_MINUTES, label: '2 minutes' },
  { value: DEFAULT_REFRESH_INTERVALS.FIVE_MINUTES, label: '5 minutes' },
  { value: DEFAULT_REFRESH_INTERVALS.TEN_MINUTES, label: '10 minutes' },
  { value: DEFAULT_REFRESH_INTERVALS.FIFTEEN_MINUTES, label: '15 minutes' },
  { value: DEFAULT_REFRESH_INTERVALS.THIRTY_MINUTES, label: '30 minutes' }
]

export default function AutoRefreshControls({ 
  queryKey, 
  defaultInterval = DEFAULT_REFRESH_INTERVALS.FIVE_MINUTES,
  className = ''
}: AutoRefreshControlsProps) {
  const settings = useAutoRefreshSettings(defaultInterval)
  const autoRefresh = useAutoRefresh({
    enabled: settings.enabled,
    interval: settings.interval,
    queryKey
  })

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Auto-refresh toggle */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={settings.toggleEnabled}
            disabled={settings.interval === 0}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          Auto-refresh
        </label>
      </div>

      {/* Interval selector */}
      <select
        value={settings.interval}
        onChange={(e) => settings.setInterval(Number(e.target.value))}
        className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {INTERVAL_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Status indicator */}
      {autoRefresh.isEnabled && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Next: {autoRefresh.remainingTimeFormatted}</span>
          </div>
        </div>
      )}

      {/* Manual refresh button */}
      <button
        onClick={autoRefresh.manualRefresh}
        className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        title="Refresh now"
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
        Refresh
      </button>

      {/* Last refresh time */}
      {autoRefresh.lastRefresh && (
        <span className="text-xs text-gray-400">
          Updated: {autoRefresh.lastRefresh.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}

// Simplified version for compact displays
export function AutoRefreshIndicator({ 
  queryKey, 
  defaultInterval = DEFAULT_REFRESH_INTERVALS.FIVE_MINUTES 
}: AutoRefreshControlsProps) {
  const settings = useAutoRefreshSettings(defaultInterval)
  const autoRefresh = useAutoRefresh({
    enabled: settings.enabled,
    interval: settings.interval,
    queryKey
  })

  if (!autoRefresh.isEnabled) return null

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span>Refreshing in {autoRefresh.remainingTimeFormatted}</span>
    </div>
  )
}