import { Activity, Wifi, WifiOff } from 'lucide-react'
import { useForexStore } from '../store/forex'
import { INTERVALS } from '../lib/utils'
import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '../api/client'

export function Header() {
  const { interval, setInterval, activeTab, setActiveTab } = useForexStore()

  const { data: health, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 15_000,
    retry: false,
  })

  const connected = !isError && health?.status === 'ok'

  return (
    <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <Activity size={18} className="text-emerald-400" />
          <span className="font-semibold text-sm tracking-tight">
            Forex Signal Engine
          </span>
          <span className="text-xs text-zinc-600 font-mono">v2</span>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1">
          {(['signals', 'backtest'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm rounded-md capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Interval selector */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {INTERVALS.map((iv) => (
            <button
              key={iv.value}
              onClick={() => setInterval(iv.value)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors font-mono ${
                interval === iv.value
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>

        {/* Connection badge */}
        <div
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${
            connected
              ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
              : 'bg-zinc-900 border-zinc-800 text-zinc-500'
          }`}
        >
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {connected ? 'Live' : 'Offline'}
        </div>
      </div>
    </header>
  )
}
