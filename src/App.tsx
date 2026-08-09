import { useEffect, useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { Hero } from '@/components/Hero'
import { About } from '@/components/About'
import { Services } from '@/components/Services'
import { WhyChooseUs } from '@/components/WhyChooseUs'
import { Process } from '@/components/Process'
import { Testimonials } from '@/components/Testimonials'
import { PhotoCTA } from '@/components/PhotoCTA'
import { Faq } from '@/components/Faq'
import { FinalCta } from '@/components/FinalCta'
import { Footer } from '@/components/Footer'
import { BookingModal } from '@/components/BookingModal'
import { LegalPage, type LegalKind } from '@/components/LegalPage'

function App() {
  const [legal, setLegal] = useState<LegalKind | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [legal])

  if (legal) {
    return (
      <main className="min-h-screen bg-[hsl(var(--background))]">
        <LegalPage kind={legal} onBack={() => setLegal(null)} onOpenLegal={setLegal} />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <Hero />
      <About />
      <Services />
      <WhyChooseUs />
      <Process />
      <Testimonials />
      <PhotoCTA />
      <Faq />
      <FinalCta />
      <Footer onOpenLegal={setLegal} />
      <BookingModal />
    </main>
  )
}

export default App