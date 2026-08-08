import { Navbar } from '@/components/Navbar'
import { Hero } from '@/components/Hero'
import { ProgressSteps } from '@/components/ProgressSteps'

function App() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <Hero />
      <ProgressSteps />
    </main>
  )
}

export default App