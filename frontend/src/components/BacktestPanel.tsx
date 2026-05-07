import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { postBacktest } from '../api/client'
import type { BacktestStats, BacktestTrade } from '../types'
import { fmtNum, fmtPct, pnlColor } from '../lib/utils'

// ── Pairs list ────────────────────────────────────────────────────────────────
const PAIRS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD',
  'USD/CAD', 'USD/CHF', 'NZD/USD', 'EUR/GBP',
]

const INTERVALS = [
  { label: '15 min', value: '15min' },
  { label: '1 hour', value: '1h'   },
  { label: '4 hours', value: '4h'  },
  { label: '1 day',  value: '1day' },
]

// ── Equity curve SVG ──────────────────────────────────────────────────────────
function EquityCurve({ data }: { data: number[] }) {
  if (data.length < 2) return null

  const W = 600
  const H = 120
  const pad = 8

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return `${x},${y}`
  })

  const positive = data[data.length - 1] >= data[0]
  const lineColor = positive ? '#10b981' : '#f97316'
  const fillColor = positive ? '#10b98120' : '#f9731620'

  const areaPath =
    `M${pts[0]} L${pts.join(' L')} L${pad + (W - pad * 2)},${H - pad} L${pad},${H - pad} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
      <path d={areaPath} fill={fillColor} />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-zinc-800/60 rounded-lg p-3">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-lg font-mono font-semibold ${color ?? 'text-zinc-100'}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Trade table ───────────────────────────────────────────────────────────────
function TradeTable({ trades }: { trades: BacktestTrade[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-zinc-500 border-b border-zinc-800">
            <th className="text-left py-2 pr-3 font-medium">#</th>
            <th className="text-left py-2 pr-3 font-medium">Dir</th>
            <th className="text-right py-2 pr-3 font-medium">Entry</th>
            <th className="text-right py-2 pr-3 font-medium">SL</th>
            <th className="text-right py-2 pr-3 font-medium">TP</th>
            <th className="text-right py-2 pr-3 font-medium">R:R</th>
            <th className="text-right py-2 pr-3 font-medium">Pips</th>
            <th className="text-right py-2 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.index} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <td className="py-1.5 pr-3 text-zinc-600 font-mono">{t.index + 1}</td>
              <td className={`py-1.5 pr-3 font-medium ${
                t.direction === 'BUY' ? 'text-emerald-400' : 'text-orange-400'
              }`}>{t.direction}</td>
              <td className="py-1.5 pr-3 text-right font-mono text-zinc-300">
                {t.entry.toFixed(5)}
              </td>
              <td className="py-1.5 pr-3 text-right font-mono text-orange-400">
                {t.stop_loss.toFixed(5)}
              </td>
              <td className="py-1.5 pr-3 text-right font-mono text-emerald-400">
                {t.take_profit.toFixed(5)}
              </td>
              <td className="py-1.5 pr-3 text-right font-mono text-zinc-400">
                1:{t.rr_ratio}
              </td>
              <td className={`py-1.5 pr-3 text-right font-mono ${pnlColor(t.pnl_pips)}`}>
                {t.pnl_pips > 0 ? '+' : ''}{t.pnl_pips.toFixed(1)}
              </td>
              <td className={`py-1.5 text-right font-medium ${
                t.result === 'WIN' ? 'text-emerald-400' : t.result === 'LOSS' ? 'text-orange-400' : 'text-zinc-500'
              }`}>{t.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function BacktestPanel() {
  const [params, setParams] = useState({
    symbol:          'EUR/USD',
    interval:        '1h',
    outputsize:      500,
    risk_pct:        1.0,
    initial_balance: 10000,
    min_confidence:  60,
  })

  const { mutate, isPending, data, error, reset } = useMutation({
    mutationFn: () => postBacktest(params),
  })

  const stats: BacktestStats | undefined = data?.result

  function handleChange<K extends keyof typeof params>(key: K, value: typeof params[K]) {
    setParams((p) => ({ ...p, [key]: value }))
    reset()
  }

  return (
    <div className="space-y-6">
      {/* ── Form ── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">Walk-Forward Backtest</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Pair */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-zinc-500 mb-1">Pair</label>
            <select
              value={params.symbol}
              onChange={(e) => handleChange('symbol', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-700"
            >
              {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Interval</label>
            <select
              value={params.interval}
              onChange={(e) => handleChange('interval', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-700"
            >
              {INTERVALS.map((iv) => <option key={iv.value} value={iv.value}>{iv.label}</option>)}
            </select>
          </div>

          {/* Candles */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Candles</label>
            <input
              type="number"
              min={100}
              max={5000}
              step={100}
              value={params.outputsize}
              onChange={(e) => handleChange('outputsize', parseInt(e.target.value, 10))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-700"
            />
          </div>

          {/* Risk % */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Risk %</label>
            <input
              type="number"
              min={0.1}
              max={5}
              step={0.1}
              value={params.risk_pct}
              onChange={(e) => handleChange('risk_pct', parseFloat(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-700"
            />
          </div>

          {/* Balance */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Initial $</label>
            <input
              type="number"
              min={100}
              step={1000}
              value={params.initial_balance}
              onChange={(e) => handleChange('initial_balance', parseFloat(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-700"
            />
          </div>

          {/* Min confidence */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Min conf %</label>
            <input
              type="number"
              min={40}
              max={100}
              step={5}
              value={params.min_confidence}
              onChange={(e) => handleChange('min_confidence', parseInt(e.target.value, 10))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>

        <button
          onClick={() => mutate()}
          disabled={isPending}
          className="mt-4 flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {isPending ? 'Running backtest…' : 'Run Backtest'}
        </button>

        {error && (
          <p className="mt-3 text-sm text-orange-400">
            {error instanceof Error ? error.message : 'Backtest failed'}
          </p>
        )}
      </div>

      {/* ── Results ── */}
      {stats && (
        <>
          {/* Summary stats */}
          <div>
            <h3 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
              {stats.symbol} · {stats.interval} · {stats.total_trades} trades
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              <StatCard
                label="Win Rate"
                value={`${fmtNum(stats.win_rate)}%`}
                sub={`${stats.wins}W / ${stats.losses}L`}
                color={stats.win_rate >= 50 ? 'text-emerald-400' : 'text-orange-400'}
              />
              <StatCard
                label="Profit Factor"
                value={fmtNum(stats.profit_factor)}
                color={stats.profit_factor >= 1.5 ? 'text-emerald-400' : stats.profit_factor >= 1 ? 'text-amber-400' : 'text-orange-400'}
              />
              <StatCard
                label="Net Pips"
                value={`${stats.net_pips > 0 ? '+' : ''}${fmtNum(stats.net_pips)}`}
                color={pnlColor(stats.net_pips)}
              />
              <StatCard
                label="Net P&L"
                value={fmtPct(stats.net_pct)}
                color={pnlColor(stats.net_pct)}
              />
              <StatCard
                label="Max Drawdown"
                value={`${fmtNum(stats.max_drawdown_pct)}%`}
                color="text-orange-400"
              />
              <StatCard
                label="Avg R:R"
                value={`1:${fmtNum(stats.avg_rr)}`}
              />
              <StatCard label="Total Trades" value={String(stats.total_trades)} />
              <StatCard
                label="Wins / Losses"
                value={`${stats.wins} / ${stats.losses}`}
                color={stats.wins > stats.losses ? 'text-emerald-400' : 'text-orange-400'}
              />
            </div>
          </div>

          {/* Equity curve */}
          {stats.equity_curve.length > 1 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                {stats.net_pct >= 0
                  ? <TrendingUp size={14} className="text-emerald-400" />
                  : <TrendingDown size={14} className="text-orange-400" />
                }
                <span className="text-xs font-medium text-zinc-400">Equity Curve</span>
                <span className={`text-xs font-mono ml-auto ${pnlColor(stats.net_pct)}`}>
                  ${stats.equity_curve[stats.equity_curve.length - 1].toFixed(0)}
                </span>
              </div>
              <EquityCurve data={stats.equity_curve} />
            </div>
          )}

          {/* Trade log */}
          {stats.trades.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={14} className="text-zinc-500" />
                <span className="text-xs font-medium text-zinc-400">Trade Log</span>
                <span className="text-xs text-zinc-600 ml-auto">{stats.trades.length} trades</span>
              </div>
              <TradeTable trades={stats.trades} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
