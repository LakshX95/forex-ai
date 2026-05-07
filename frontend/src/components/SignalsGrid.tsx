import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useForexStore } from '../store/forex'
import { fetchAllSignals, createPriceSocket } from '../api/client'
import { PairCard } from './PairCard'
import { DetailPanel } from './DetailPanel'
import type { Signal } from '../types'

export function SignalsGrid() {
  const { interval, selectedPair, signals, setSignals, setLivePrice } = useForexStore()

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['signals', interval],
    queryFn: () => fetchAllSignals(interval),
    refetchInterval: 60_000,
  })

  // Sync fetched signals into Zustand
  useEffect(() => {
    if (data?.signals) setSignals(data.signals)
  }, [data, setSignals])

  // WebSocket live price feed
  useEffect(() => {
    const ws = createPriceSocket((msg) =>
      setLivePrice(msg.symbol, { symbol: msg.symbol, price: msg.price, change_pct: msg.change_pct })
    )
    return () => ws.close()
  }, [setLivePrice])

  const selectedSignal = signals.find((s: Signal) => s.symbol === selectedPair)

  // ── States ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <RefreshCw size={20} className="animate-spin mr-2" />
        Loading signals…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-orange-400">Failed to load signals. Is the backend running?</p>
        <button
          onClick={() => refetch()}
          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    )
  }

  // ── Grid ────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-zinc-500">
          {signals.length} pairs · updated {new Date().toLocaleTimeString()}
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {signals.map((signal: Signal) => (
          <PairCard key={signal.symbol} signal={signal} />
        ))}
      </div>

      {/* Detail panel */}
      {selectedSignal && <DetailPanel signal={selectedSignal} />}
    </div>
  )
}
