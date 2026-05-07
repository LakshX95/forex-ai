import { create } from 'zustand'
import type { Signal, LivePrice } from '../types'

type Tab      = 'signals' | 'backtest'
type Interval = string

interface ForexStore {
  // Signals list
  signals: Signal[]
  setSignals: (signals: Signal[]) => void

  // Selected pair for the detail panel
  selectedPair: string | null
  setSelectedPair: (pair: string | null) => void

  // Live WebSocket prices keyed by symbol
  livePrices: Record<string, LivePrice>
  setLivePrice: (symbol: string, price: LivePrice) => void

  // AI analysis cache: symbol → analysis text
  aiAnalysis: Record<string, string>
  setAiAnalysis: (symbol: string, analysis: string) => void

  // Active candle interval
  interval: Interval
  setInterval: (interval: Interval) => void

  // Active tab
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
}

export const useForexStore = create<ForexStore>((set) => ({
  signals: [],
  setSignals: (signals) => set({ signals }),

  selectedPair: null,
  setSelectedPair: (selectedPair) => set({ selectedPair }),

  livePrices: {},
  setLivePrice: (symbol, price) =>
    set((state) => ({ livePrices: { ...state.livePrices, [symbol]: price } })),

  aiAnalysis: {},
  setAiAnalysis: (symbol, analysis) =>
    set((state) => ({ aiAnalysis: { ...state.aiAnalysis, [symbol]: analysis } })),

  interval: '15min',
  setInterval: (interval) => set({ interval }),

  activeTab: 'signals',
  setActiveTab: (activeTab) => set({ activeTab }),
}))
