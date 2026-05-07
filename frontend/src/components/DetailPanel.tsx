import { useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import type { Signal } from '../types'
import { useForexStore } from '../store/forex'
import { useAiAnalysis } from '../hooks'
import { fmtPrice, fmtPips } from '../lib/utils'

interface DetailPanelProps {
  signal: Signal
}

function LevelRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-zinc-800 last:border-0 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-mono ${color ?? 'text-zinc-200'}`}>{value}</span>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-zinc-800/60 rounded-lg p-3">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-base font-mono font-medium ${color ?? 'text-zinc-100'}`}>{value}</div>
    </div>
  )
}

export function DetailPanel({ signal }: DetailPanelProps) {
  const { setSelectedPair, aiAnalysis } = useForexStore()
  const { mutate: analyze, isPending } = useAiAnalysis()
  const [analysisExpanded, setAnalysisExpanded] = useState(false)

  const existingAnalysis = aiAnalysis[signal.symbol]

  const handleAnalyze = () => {
    analyze({ symbol: signal.symbol, signal })
    setAnalysisExpanded(true)
  }

  return (
    <div className="card mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="font-mono font-semibold">{signal.symbol}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
            signal.direction === 'BUY'
              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
              : signal.direction === 'SELL'
              ? 'bg-orange-950 text-orange-400 border-orange-800'
              : 'bg-zinc-800 text-zinc-500 border-zinc-700'
          }`}>
            {signal.direction}
          </span>
          <span className="text-xs text-zinc-500">Confidence: {signal.confidence}%</span>
        </div>
        <button
          onClick={() => setSelectedPair(null)}
          className="text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatCard label="Entry" value={fmtPrice(signal.symbol, signal.entry)} />
        <StatCard label="R:R Ratio" value={signal.rr_ratio > 0 ? `1:${signal.rr_ratio}` : '—'} />
        <StatCard label="SL (pips)" value={signal.sl_pips > 0 ? fmtPips(signal.sl_pips) : '—'} color="text-orange-400" />
        <StatCard label="TP (pips)" value={signal.tp_pips > 0 ? fmtPips(signal.tp_pips) : '—'} color="text-emerald-400" />
      </div>

      {/* Key levels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2">Key Levels</p>
          <LevelRow label="Take Profit" value={fmtPrice(signal.symbol, signal.take_profit)} color="text-emerald-400" />
          <LevelRow label="Entry"       value={fmtPrice(signal.symbol, signal.entry)} />
          <LevelRow label="Stop Loss"   value={fmtPrice(signal.symbol, signal.stop_loss)} color="text-orange-400" />
          <LevelRow label="Swing High"  value={fmtPrice(signal.symbol, signal.swing_high)} />
          <LevelRow label="Swing Low"   value={fmtPrice(signal.symbol, signal.swing_low)} />
        </div>
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2">ICT Levels</p>
          <LevelRow label="Fib 61.8%" value={fmtPrice(signal.symbol, signal.fib_618)} />
          <LevelRow label="Fib 78.6%" value={fmtPrice(signal.symbol, signal.fib_786)} />
          <LevelRow
            label="FVG"
            value={signal.fvg_detected ? `Active (${signal.fvg_direction})` : 'None'}
            color={signal.fvg_detected ? 'text-sky-400' : 'text-zinc-600'}
          />
          <LevelRow
            label="Order Block"
            value={signal.order_block_hit ? 'Hit' : 'Clear'}
            color={signal.order_block_hit ? 'text-amber-400' : 'text-zinc-600'}
          />
          <LevelRow
            label="Kill Zone"
            value={`${signal.kill_zone}${signal.kill_zone_active ? ' ●' : ''}`}
            color={signal.kill_zone_active ? 'text-emerald-400' : 'text-zinc-500'}
          />
        </div>
      </div>

      {/* Confluence factors */}
      {signal.confluence_factors.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-2">Confluence Factors</p>
          <div className="flex flex-wrap gap-2">
            {signal.confluence_factors.map((f, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-sky-950 text-sky-300 border border-sky-800">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="border-t border-zinc-800 pt-4">
        {!existingAnalysis ? (
          <button
            onClick={handleAnalyze}
            disabled={isPending}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-emerald-700 hover:text-emerald-400 transition-all disabled:opacity-50"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Analysing with Claude…</>
            ) : (
              <><Sparkles size={14} /> Get AI Analysis</>
            )}
          </button>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Claude ICT Analysis</span>
              <button
                onClick={() => setAnalysisExpanded(!analysisExpanded)}
                className="text-xs text-zinc-600 hover:text-zinc-400 ml-auto"
              >
                {analysisExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
            {analysisExpanded && (
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-800/40 rounded-lg p-3">
                {existingAnalysis}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
