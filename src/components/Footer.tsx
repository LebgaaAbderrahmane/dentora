import { Phone } from 'lucide-react'
import { Container } from '@/components/shared/Container'
import { ToothIcon } from '@/components/shared/ToothIcon'
import {
  FacebookIcon,
  GoogleIcon,
  InstagramIcon,
  YelpIcon,
} from '@/components/shared/BrandIcons'
import { EMAIL, PHONE } from '@/data/content'

const servicesLinks = [
  'Dental Check-Up',
  'Teeth Cleaning',
  'Whitening',
  'Implants',
  'Veneers',
  'Emergency Care',
]

const clinicLinks = ['About Us', 'Meet the Team', 'Patient Reviews', 'Blog', 'Careers']

const hours = ['Mon – Fri: 8:00am – 7:00pm', 'Saturday: 9:00am – 5:00pm', 'Sunday: Emergency only']

const socials = [
  { label: 'Facebook', Icon: FacebookIcon },
  { label: 'Instagram', Icon: InstagramIcon },
  { label: 'Google', Icon: GoogleIcon },
  { label: 'Yelp', Icon: YelpIcon },
]

export function Footer() {
  return (
    <footer className="bg-[hsl(var(--surface-dark))]">
      <Container className="py-16">
        <div className="mb-14 grid grid-cols-4 gap-12 max-md:grid-cols-1 md:max-lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-white/25 bg-white/15">
                <ToothIcon className="h-4 w-4 text-white" />
              </span>
              <span className="text-[1.1rem] font-extrabold tracking-[-0.01em] text-white">
                DENTORA
              </span>
            </div>
            <p className="mt-1 text-[0.7rem] font-light tracking-[0.1em] text-white/40">
              Your Family&apos;s Dental Clinic
            </p>
            <p className="mt-5 text-sm font-semibold text-white">{PHONE}</p>
            <p className="text-sm font-light text-white/50">{EMAIL}</p>
          </div>

          <div>
            <p className="mb-5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/30">
              Services
            </p>
            {servicesLinks.map((link) => (
              <a
                key={link}
                href="#services"
                className="mb-3 block text-sm font-normal text-white/55 transition-colors hover:text-white"
              >
                {link}
              </a>
            ))}
          </div>

          <div>
            <p className="mb-5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/30">
              Clinic
            </p>
            {clinicLinks.map((link) => (
              <a
                key={link}
                href="#about"
                className="mb-3 block text-sm font-normal text-white/55 transition-colors hover:text-white"
              >
                {link}
              </a>
            ))}
          </div>

          <div>
            <p className="mb-5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/30">
              Opening Hours
            </p>
            {hours.map((h) => (
              <p key={h} className="mb-3 text-sm font-light text-white/55">
                {h}
              </p>
            ))}
            <p className="mt-2 flex items-center gap-2 text-sm font-light text-white/70">
              <Phone className="h-4 w-4 text-[hsl(var(--primary))]" />
              24/7 Emergency: {PHONE}
            </p>
            <div className="mt-5 flex gap-5">
              {socials.map(({ label, Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="text-white/30 transition-colors hover:text-white"
                >
                  <Icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8">
          <p className="text-xs font-light text-white/30">
            © 2026 Dentora Dental Clinic. All rights reserved.
          </p>
          <p className="flex gap-6 text-xs font-light text-white/30">
            <a href="#" className="transition-colors hover:text-white/60">
              Privacy Policy
            </a>
            <a href="#" className="transition-colors hover:text-white/60">
              Terms of Service
            </a>
          </p>
        </div>
      </Container>
    </footer>
  )
}