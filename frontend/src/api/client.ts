import type { HealthResponse, BacktestStats, Signal } from '../types'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const WS   = import.meta.env.VITE_WS_URL  ?? 'ws://localhost:8000'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export function fetchHealth() {
  return apiFetch<HealthResponse>('/health')
}

export function fetchAllSignals(interval: string) {
  return apiFetch<{ source: string; signals: Signal[] }>(
    `/api/signals/all?interval=${encodeURIComponent(interval)}`
  )
}

export function fetchSignal(symbol: string, interval: string) {
  const slug = symbol.replace('/', '-')
  return apiFetch<{ source: string; signal: Signal }>(
    `/api/signals/${slug}?interval=${encodeURIComponent(interval)}`
  )
}

export function postAiAnalyze(symbol: string, signal: Signal) {
  return apiFetch<{ analysis: string }>('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, signal }),
  })
}

export function postBacktest(params: {
  symbol: string
  interval: string
  outputsize: number
  risk_pct: number
  initial_balance: number
  min_confidence: number
}) {
  return apiFetch<{ source: string; result: BacktestStats }>('/api/backtest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}

// ── WebSocket price feed ──────────────────────────────────────────────────────

export function createPriceSocket(
  onMessage: (data: { symbol: string; price: number; change_pct: number }) => void,
  onError?: () => void,
): WebSocket {
  const ws = new WebSocket(`${WS}/ws/prices`)

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string)
      onMessage(data)
    } catch {
      // ignore malformed frames
    }
  }

  ws.onerror = () => onError?.()

  return ws
}
