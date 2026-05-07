// ── Signal ────────────────────────────────────────────────────────────────────

export interface Signal {
  symbol: string
  direction: 'BUY' | 'SELL' | 'NEUTRAL'
  confidence: number
  trend: string
  entry: number
  stop_loss: number
  take_profit: number
  sl_pips: number
  tp_pips: number
  rr_ratio: number
  kill_zone: string
  kill_zone_active: boolean
  fvg_detected: boolean
  fvg_direction: string
  order_block_hit: boolean
  near_fib_ote: boolean
  swing_high: number
  swing_low: number
  fib_618: number
  fib_786: number
  confluence_factors: string[]
  timestamp: string
  change_pct?: number
  error?: string
}

// ── Live price ────────────────────────────────────────────────────────────────

export interface LivePrice {
  symbol: string
  price: number
  change_pct: number
}

// ── Backtest ──────────────────────────────────────────────────────────────────

export interface BacktestTrade {
  index: number
  symbol: string
  direction: string
  entry: number
  stop_loss: number
  take_profit: number
  sl_pips: number
  tp_pips: number
  rr_ratio: number
  result: 'WIN' | 'LOSS' | 'OPEN'
  pnl_pips: number
  pnl_pct: number
  confidence: number
  factors: string[]
}

export interface BacktestStats {
  symbol: string
  interval: string
  total_trades: number
  wins: number
  losses: number
  win_rate: number
  profit_factor: number
  net_pips: number
  net_pct: number
  max_drawdown_pct: number
  avg_rr: number
  equity_curve: number[]
  trades: BacktestTrade[]
}

export interface BacktestResponse {
  source: string
  result: BacktestStats
}

// ── Health ────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string
  env: string
  twelve_data_key_set: boolean
  anthropic_key_set: boolean
}
