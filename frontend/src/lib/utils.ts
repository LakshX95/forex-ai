// ── Interval options ──────────────────────────────────────────────────────────

export const INTERVALS = [
  { label: '5m',  value: '5min'  },
  { label: '15m', value: '15min' },
  { label: '1h',  value: '1h'    },
  { label: '4h',  value: '4h'    },
  { label: '1D',  value: '1day'  },
] as const

// ── Pairs that use 3-decimal JPY pricing ─────────────────────────────────────

const JPY_PAIRS = new Set(['USD/JPY', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY'])

// ── Formatting ────────────────────────────────────────────────────────────────

export function fmtPrice(symbol: string, value: number): string {
  if (!value) return '—'
  return value.toFixed(JPY_PAIRS.has(symbol) ? 3 : 5)
}

export function fmtPips(pips: number): string {
  return pips.toFixed(1)
}

export function fmtPct(pct: number): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

export function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals)
}

// ── Colour helpers ────────────────────────────────────────────────────────────

export function pnlColor(pnl: number): string {
  if (pnl > 0) return 'text-emerald-400'
  if (pnl < 0) return 'text-orange-400'
  return 'text-zinc-400'
}

export function directionColor(direction: string): string {
  if (direction === 'BUY')  return 'text-emerald-400'
  if (direction === 'SELL') return 'text-orange-400'
  return 'text-zinc-500'
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 80) return 'bg-emerald-500'
  if (confidence >= 60) return 'bg-sky-500'
  if (confidence >= 40) return 'bg-amber-500'
  return 'bg-zinc-600'
}

// ── Trend icon ────────────────────────────────────────────────────────────────

export function trendIcon(trend: string): string {
  if (trend === 'bullish') return '↑'
  if (trend === 'bearish') return '↓'
  return '→'
}
