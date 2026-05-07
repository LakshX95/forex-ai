import { useMutation } from '@tanstack/react-query'
import { postAiAnalyze } from '../api/client'
import { useForexStore } from '../store/forex'
import type { Signal } from '../types'

/**
 * Mutation hook for Claude AI analysis.
 * On success, the result is stored in the Zustand aiAnalysis map.
 */
export function useAiAnalysis() {
  const { setAiAnalysis } = useForexStore()

  return useMutation({
    mutationFn: ({ symbol, signal }: { symbol: string; signal: Signal }) =>
      postAiAnalyze(symbol, signal),
    onSuccess: (data, variables) => {
      setAiAnalysis(variables.symbol, data.analysis)
    },
  })
}
