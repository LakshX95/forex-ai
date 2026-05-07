import { useForexStore } from './store/forex'
import { Header } from './components/Header'
import { SignalsGrid } from './components/SignalsGrid'
import { BacktestPanel } from './components/BacktestPanel'

export default function App() {
  const { activeTab } = useForexStore()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'signals' ? <SignalsGrid /> : <BacktestPanel />}
      </main>
    </div>
  )
}
