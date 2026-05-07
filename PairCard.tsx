import type { Signal } from '../types'
import { useForexStore } from '../store/forex'
import {
  fmtPrice, fmtPct, directionColor, confidenceColor, trendIcon
} from '../lib/utils'

interface PairCardProps {
  signal: Signal
}

export function PairCard({ signal }: PairCardProps) {
  const { selectedPair, setSelectedPair, livePrices } = useForexStore()
  const isSelected = selectedPair === signal.symbol
  const live = livePrices[signal.symbol]
  const price = live?.price ?? signal.entry
  const changePct = live?.change_pct ?? signal.change_pct ?? 0
  const priceUp = changePct >= 0

  if (signal.error) {
    return (
      <div className="card opacity-50 cursor-not-allowed">
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono font-medium text-sm">{signal.symbol}</span>
          <span className="text-xs text-zinc-600">Error</span>
        </div>
        <p className="text-xs text-zinc-600 truncate">{signal.error}</p>
      </div>
    )
  }

  return (
    <div
      onClick={() => setSelectedPair(isSelected ? null : signal.symbol)}
      className={`card cursor-pointer transition-all hover:border-zinc-600 select-none ${
        isSelected ? 'border-emerald-700 ring-1 ring-emerald-700/30' : ''
      }`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono font-medium text-sm">{signal.symbol}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-zinc-200">{fmtPrice(signal.symbol, price)}</span>
          <span className={`text-xs font-mono ${priceUp ? 'text-emerald-400' : 'text-orange-400'}`}>
            {fmtPct(changePct)}
          </span>
        </div>
      </div>

      {/* Signal row */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
          signal.direction === 'BUY'
            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
            : signal.direction === 'SELL'
            ? 'bg-orange-950 text-orange-400 border-orange-800'
            : 'bg-zinc-800 text-zinc-500 border-zinc-700'
        }`}>
          {signal.direction}
        </span>
        <span className={`text-xs ${directionColor(signal.direction)}`}>
          {trendIcon(signal.trend)} {signal.trend}
        </span>
        <span className="text-xs text-zinc-600 ml-auto">
          1:{signal.rr_ratio > 0 ? signal.rr_ratio : '—'}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-zinc-600 mb-1">
          <span>Confluence</span>
          <span className="font-mono">{signal.confidence}%</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${confidenceColor(signal.confidence)}`}
            style={{ width: `${signal.confidence}%` }}
          />
        </div>
      </div>

      {/* Factor pills */}
      <div className="flex flex-wrap gap-1">
        {['Swing', 'FVG', 'Order Block', 'Fib OTE', signal.kill_zone + ' KZ'].map((label, i) => {
          const active = signal.confluence_factors.some(f => f.includes(label.replace(' KZ', '')))
            || (label.includes('KZ') && signal.kill_zone_active)
          return (
            <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${
              active
                ? 'bg-sky-950 text-sky-400 border-sky-800'
                : 'bg-zinc-900 text-zinc-600 border-zinc-800'
            }`}>
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
