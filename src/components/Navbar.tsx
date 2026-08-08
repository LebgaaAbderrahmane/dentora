import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, Phone, X } from 'lucide-react'
import { ToothIcon } from '@/components/shared/ToothIcon'
import { Button } from '@/components/shared/Button'

const links = [
  { label: 'Services', href: '#services' },
  { label: 'About Us', href: '#about' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Contact', href: '#contact' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <nav className="flex items-center justify-between gap-8 px-[60px] py-[22px] max-md:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-white/25 bg-white/15">
            <ToothIcon className="h-4 w-4 text-white" />
          </span>
          <span className="text-[0.95rem] font-bold tracking-[-0.01em] text-white">
            DENTORA
          </span>
        </div>

        <div className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[0.72rem] font-normal text-white/70 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-6 lg:flex">
          <a
            href="tel:+18005592648"
            className="text-[0.72rem] font-medium text-white/60 transition-colors hover:text-white"
          >
            (800) 559-2648
          </a>
          <Button href="#book" className="h-9 px-5 text-[0.72rem]">
            Book a Call
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
                  DENTORA
                </span>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
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
                  {link.label}
                </motion.a>
              ))}
            </div>

            <div className="mt-auto flex flex-col gap-4 px-6 pb-10">
              <a
                href="tel:+18005592648"
                className="flex items-center gap-2 text-[0.82rem] text-white/70"
              >
                <Phone className="h-4 w-4 text-[hsl(var(--primary))]" />
                (800) 559-2648
              </a>
              <Button href="#book" onClick={() => setOpen(false)} className="h-11 w-full">
                Book Appointment
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}