import { Navbar } from '@/components/Navbar'
import { Hero } from '@/components/Hero'
import { ProgressSteps } from '@/components/ProgressSteps'
import { About } from '@/components/About'
import { Services } from '@/components/Services'
import { WhyChooseUs } from '@/components/WhyChooseUs'
import { Process } from '@/components/Process'
import { Testimonials } from '@/components/Testimonials'

function App() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <Hero />
      <ProgressSteps />
      <About />
      <Services />
      <WhyChooseUs />
      <Process />
      <Testimonials />
    </main>
  )
}

export default App