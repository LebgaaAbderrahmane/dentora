import { Navbar } from '@/components/Navbar'
import { Hero } from '@/components/Hero'
import { ProgressSteps } from '@/components/ProgressSteps'
import { About } from '@/components/About'
import { Services } from '@/components/Services'

function App() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <Hero />
      <ProgressSteps />
      <About />
      <Services />
    </main>
  )
}

export default App