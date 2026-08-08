import { Navbar } from '@/components/Navbar'
import { Hero } from '@/components/Hero'
import { ProgressSteps } from '@/components/ProgressSteps'
import { About } from '@/components/About'
import { Services } from '@/components/Services'
import { WhyChooseUs } from '@/components/WhyChooseUs'
import { Process } from '@/components/Process'
import { Testimonials } from '@/components/Testimonials'
import { PhotoCTA } from '@/components/PhotoCTA'
import { Faq } from '@/components/Faq'
import { FinalCta } from '@/components/FinalCta'
import { Footer } from '@/components/Footer'

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
      <PhotoCTA />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  )
}

export default App