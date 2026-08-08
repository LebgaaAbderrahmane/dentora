import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Menu, Phone, X } from 'lucide-react'
import { ToothIcon } from '@/components/shared/ToothIcon'
import { Button } from '@/components/shared/Button'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useBooking } from '@/providers/booking'
import { PHONE, PHONE_TEL } from '@/data/content'

const links = [
  { label: 'nav.services', href: '#services' },
  { label: 'nav.about', href: '#about' },
  { label: 'nav.testimonials', href: '#testimonials' },
  { label: 'nav.contact', href: '#contact' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  const { openBooking } = useBooking()

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <nav className="flex items-center justify-between gap-6 px-[60px] py-[22px] max-md:px-6">
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
              className="text-[0.72rem] font-normal text-white/80 transition-colors hover:text-white"
            >
              {t(link.label)}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher className="hidden sm:flex" />
          <ThemeToggle />
          <div className="hidden items-center gap-6 lg:flex">
            <a
              href={PHONE_TEL}
              className="text-[0.72rem] font-medium text-white/75 transition-colors hover:text-white"
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
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex flex-col bg-[hsl(var(--background))]"
          >
            <div className="flex items-center justify-between px-6 py-[22px]">
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
                <ThemeToggle />
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
                  className="border-b border-white/10 py-4 text-[1.35rem] font-medium text-white"
                >
                  {t(link.label)}
                </motion.a>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-4 px-6 pb-10">
              <a
                href={PHONE_TEL}
                className="flex items-center gap-2 text-[0.82rem] text-white/70"
              >
                <Phone className="h-4 w-4 text-[hsl(var(--primary))]" />
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
    </header>
  )
}