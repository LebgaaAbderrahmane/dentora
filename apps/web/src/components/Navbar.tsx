import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Menu, Phone, X } from 'lucide-react'
import { ToothIcon } from '@/components/shared/ToothIcon'
import { Button } from '@/components/shared/Button'
import { Container } from '@/components/shared/Container'
import { ThemeDropdown } from '@/components/shared/ThemeDropdown'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useBooking } from '@/providers/booking'
import { useScrolled, useScrollSpy } from '@/lib/hooks'
import { PHONE, PHONE_TEL } from '@/data/content'
import { cn } from '@/lib/utils'

const links = [
  { label: 'nav.home', href: '#top', id: 'top' },
  { label: 'nav.about', href: '#about', id: 'about' },
  { label: 'nav.services', href: '#services', id: 'services' },
  { label: 'nav.testimonials', href: '#testimonials', id: 'testimonials' },
  { label: 'nav.contact', href: '#contact', id: 'contact' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  const { openBooking } = useBooking()
  const scrolled = useScrolled(16)
  const active = useScrollSpy(links.map((l) => l.id))

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300',
          scrolled
            ? 'border-[hsl(var(--border))] bg-[hsl(var(--background))]/90 backdrop-blur-xl'
            : 'border-transparent bg-[hsl(var(--background))]/55 backdrop-blur-md',
        )}
      >
        <nav>
          <Container className="flex items-center justify-between gap-6 py-[18px]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-white/25 bg-white/15">
                <ToothIcon className="h-4 w-4 text-white" />
              </span>
              <span className="text-[0.95rem] font-bold tracking-[-0.01em] text-white">
                {t('brand')}
              </span>
            </div>

            <div className="hidden items-center gap-8 lg:flex">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className={cn(
                    'relative text-[0.72rem] font-normal transition-colors hover:text-white',
                    active === link.id ? 'text-[hsl(var(--primary))]' : 'text-white/80',
                  )}
                >
                  {t(link.label)}
                  {active === link.id && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute -bottom-1.5 inset-x-0 h-[2px] rounded bg-[hsl(var(--primary))]"
                    />
                  )}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitcher className="hidden sm:flex" />
              <ThemeDropdown className="hidden lg:flex" />
              <div className="hidden items-center gap-6 lg:flex">
                <a
                  href={PHONE_TEL}
                  className="ltr-isolate text-[0.72rem] font-medium text-white/80 transition-colors hover:text-white"
                >
                  {PHONE}
                </a>
                <Button onClick={() => openBooking()} className="h-9 px-5 text-[0.72rem]">
                  {t('nav.book')}
                </Button>
              </div>
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white lg:hidden"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>
            </div>
          </Container>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex flex-col bg-[hsl(var(--background))]"
          >
            <div className="flex items-center justify-between px-6 py-[18px]">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-white/25 bg-white/15">
                  <ToothIcon className="h-4 w-4 text-white" />
                </span>
                <span className="text-[0.95rem] font-bold tracking-[-0.01em] text-white">
                  {t('brand')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <LanguageSwitcher />
                <ThemeDropdown />
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 px-6 pt-10">
              {links.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.08 * i }}
                  className={cn(
                    'border-b border-white/10 py-4 text-[1.35rem] font-medium',
                    active === link.id ? 'text-[hsl(var(--primary))]' : 'text-white',
                  )}
                >
                  {t(link.label)}
                </motion.a>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-4 px-6 pb-10">
              <a
                href={PHONE_TEL}
                className="ltr-isolate flex items-center gap-2 text-[0.82rem] text-white/70"
              >
                <Phone className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                {PHONE}
              </a>
              <Button
                onClick={() => {
                  setOpen(false)
                  openBooking()
                }}
                className="h-11 w-full"
              >
                {t('nav.book')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
