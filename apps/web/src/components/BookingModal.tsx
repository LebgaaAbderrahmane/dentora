import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Check, Send, X } from 'lucide-react'
import { useBooking } from '@/providers/booking'
import { EMERGENCY_PHONE } from '@/data/content'

type View = 'form' | 'done'

export function BookingModal() {
  const { t } = useTranslation()
  const { open, service, closeBooking } = useBooking()
  const [view, setView] = useState<View>('form')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [picked, setPicked] = useState(service)
  const [date, setDate] = useState('')
  const [message, setMessage] = useState('')

  const services = t('services.list', { returnObjects: true }) as { title: string }[]

  useEffect(() => {
    if (open) {
      setPicked(service)
      setView('form')
    }
  }, [open, service])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const whatsappHref = () => {
    const lines = [
      `*DENTORA: ${t('booking.title')}*`,
      t('booking.name') + ': ' + name,
      t('booking.phone') + ': ' + phone,
      t('booking.service') + ': ' + picked,
      t('booking.date') + ': ' + date,
      message ? t('booking.message') + ': ' + message : '',
    ].filter(Boolean)
    return `https://wa.me/${EMERGENCY_PHONE.replace(/\D/g, '')}?text=${encodeURIComponent(lines.join('\n'))}`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setView('done')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={closeBooking}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-[hsl(var(--content))] shadow-2xl"
          >
            <div className="relative flex items-center justify-between bg-[hsl(var(--primary))] px-6 py-5">
              <div>
                <h2 className="text-[1.15rem] font-bold text-white">{t('booking.title')}</h2>
                <p className="mt-0.5 text-[0.75rem] font-light text-white/75">
                  {t('booking.subtitle')}
                </p>
              </div>
              <button
                type="button"
                aria-label={t('booking.close')}
                onClick={closeBooking}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {view === 'form' ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    <label className="block">
                      <span className="mb-1.5 block text-[0.72rem] font-semibold text-[hsl(var(--muted-foreground))]">
                        {t('booking.name')}
                      </span>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--soft))] px-3.5 text-[0.85rem] text-[hsl(var(--heading))] outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))]/60 focus:border-[hsl(var(--primary))]"
                        placeholder="Amine H."
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[0.72rem] font-semibold text-[hsl(var(--muted-foreground))]">
                        {t('booking.phone')}
                      </span>
                      <input
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--soft))] px-3.5 text-[0.85rem] text-[hsl(var(--heading))] outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))]/60 focus:border-[hsl(var(--primary))]"
                        placeholder="+213 5 55 00 00 00"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[0.72rem] font-semibold text-[hsl(var(--muted-foreground))]">
                        {t('booking.service')}
                      </span>
                      <select
                        value={picked}
                        onChange={(e) => setPicked(e.target.value)}
                        className="h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--soft))] px-3.5 text-[0.85rem] text-[hsl(var(--heading))] outline-none transition-colors focus:border-[hsl(var(--primary))]"
                      >
                        <option value="" disabled>
                         :{// placeholder
                          }—
                        </option>
                        {services.map((s) => (
                          <option key={s.title} value={s.title}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[0.72rem] font-semibold text-[hsl(var(--muted-foreground))]">
                        {t('booking.date')}
                      </span>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--soft))] px-3.5 text-[0.85rem] text-[hsl(var(--heading))] outline-none transition-colors focus:border-[hsl(var(--primary))]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[0.72rem] font-semibold text-[hsl(var(--muted-foreground))]">
                        {t('booking.message')}
                      </span>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--soft))] px-3.5 py-2.5 text-[0.85rem] text-[hsl(var(--heading))] outline-none transition-colors placeholder:text-[hsl(var(--muted-foreground))]/60 focus:border-[hsl(var(--primary))]"
                      />
                    </label>

                    <button
                      type="submit"
                      className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] font-semibold text-white transition-colors hover:bg-[hsl(180,91%,34%)]"
                    >
                      <Check className="h-4 w-4" />
                      {t('booking.submit')}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="py-4 text-center"
                  >
                    <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--primary-soft))]">
                      <Check className="h-8 w-8 text-[hsl(var(--primary))]" />
                    </span>
                    <h3 className="text-[1.1rem] font-bold text-[hsl(var(--heading))]">
                      {t('booking.success')}
                    </h3>
                    <p className="mt-2 text-[0.85rem] font-light leading-relaxed text-[hsl(var(--muted-foreground))]">
                      {t('booking.successNote')}
                    </p>
                    <a
                      href={whatsappHref()}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-semibold text-white transition-colors hover:bg-[#1fb057]"
                    >
                      <Send className="h-4 w-4" />
                      {t('booking.whatsapp')}
                    </a>
                    <button
                      type="button"
                      onClick={closeBooking}
                      className="mt-3 text-[0.8rem] font-semibold text-[hsl(var(--primary))] transition-colors hover:text-[hsl(180,91%,34%)]"
                    >
                      {t('booking.close')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
