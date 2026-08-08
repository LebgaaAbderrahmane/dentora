import { Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { ToothIcon } from '@/components/shared/ToothIcon'
import { EMAIL, EMERGENCY_PHONE, PHONE } from '@/data/content'
import {
  FacebookIcon,
  GoogleIcon,
  InstagramIcon,
  WhatsAppIcon,
} from '@/components/shared/BrandIcons'

const socials = [
  { label: 'Facebook', Icon: FacebookIcon, href: 'https://www.facebook.com' },
  { label: 'Instagram', Icon: InstagramIcon, href: 'https://www.instagram.com' },
  { label: 'Google', Icon: GoogleIcon, href: 'https://www.google.com/search?q=dentora' },
  { label: 'WhatsApp', Icon: WhatsAppIcon, href: 'https://wa.me/21321558800' },
]

const serviceHrefs = ['#book', '#book', '#book', '#book', '#book', '#book']

export function Footer() {
  const { t } = useTranslation()
  const servicesLinks = t('footer.servicesLinks', { returnObjects: true }) as string[]
  const clinicLinks = t('footer.clinicLinks', { returnObjects: true }) as string[]
  const hours = t('footer.hours', { returnObjects: true }) as string[]

  return (
    <footer className="bg-[hsl(var(--surface-dark))]">
      <Container className="py-16">
        <div className="mb-14 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-white/25 bg-white/15">
                <ToothIcon className="h-4 w-4 text-white" />
              </span>
              <span className="text-[1.1rem] font-extrabold tracking-[-0.01em] text-white">
                {t('brand')}
              </span>
            </div>
            <p className="mt-1 text-[0.7rem] font-light tracking-[0.1em] text-white/40">
              {t('footer.tagline')}
            </p>
            <p className="mt-5 text-sm font-semibold text-white">{PHONE}</p>
            <p className="text-sm font-light text-white/50">{EMAIL}</p>
          </div>

          <div>
            <p className="mb-5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/30">
              {t('footer.servicesLabel')}
            </p>
            {servicesLinks.map((link, i) => (
              <a
                key={link}
                href={serviceHrefs[i]}
                className="mb-3 block text-sm font-normal text-white/55 transition-colors hover:text-white"
              >
                {link}
              </a>
            ))}
          </div>

          <div>
            <p className="mb-5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/30">
              {t('footer.clinicLabel')}
            </p>
            {clinicLinks.map((link, i) => (
              <a
                key={link}
                href={i === 0 || i === 1 ? '#about' : i === 2 ? '#testimonials' : '#contact'}
                className="mb-3 block text-sm font-normal text-white/55 transition-colors hover:text-white"
              >
                {link}
              </a>
            ))}
          </div>

          <div>
            <p className="mb-5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/30">
              {t('footer.hoursLabel')}
            </p>
            {hours.map((h) => (
              <p key={h} className="mb-3 text-sm font-light text-white/55">
                {h}
              </p>
            ))}
            <p className="mt-2 flex items-center gap-2 text-sm font-light text-white/70">
              <Phone className="h-4 w-4 text-[hsl(var(--primary))]" />
              {t('footer.emergency')} {EMERGENCY_PHONE}
            </p>
            <div className="mt-5 flex gap-5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="text-white/30 transition-colors hover:text-white"
                >
                  <s.Icon className="h-4.5 w-4.5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8">
          <p className="text-xs font-light text-white/30">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <p className="flex gap-6 text-xs font-light text-white/30">
            <a href="#about" className="transition-colors hover:text-white/60">
              {t('footer.privacy')}
            </a>
            <a href="#contact" className="transition-colors hover:text-white/60">
              {t('footer.terms')}
            </a>
          </p>
        </div>
      </Container>
    </footer>
  )
}