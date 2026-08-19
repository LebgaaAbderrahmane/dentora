import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Input, useTheme } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { Locale } from '@dentora/i18n'
import type { SafeUser } from '@dentora/contracts'
import { CalendarDays, CalendarPlus, House, LogOut, ReceiptText, Stethoscope } from 'lucide-react'
import { api, ApiError } from './lib/api'
import HomeView from './views/HomeView'
import AppointmentsView from './views/AppointmentsView'
import BookingView from './views/BookingView'
import InvoicesView from './views/InvoicesView'

type View = 'home' | 'appointments' | 'book' | 'invoices'

const NAV: Array<{
  id: View
  label: 'portal.home' | 'portal.appointments' | 'portal.book' | 'portal.invoices'
  icon: typeof House
}> = [
  { id: 'home', label: 'portal.home', icon: House },
  { id: 'appointments', label: 'portal.appointments', icon: CalendarDays },
  { id: 'book', label: 'portal.book', icon: CalendarPlus },
  { id: 'invoices', label: 'portal.invoices', icon: ReceiptText },
]

export default function App() {
  const [user, setUser] = useState<SafeUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-neutral-400">
        …
      </main>
    )
  }

  if (!user) return <Login onLoggedIn={setUser} />

  return <Shell user={user} onLoggedOut={() => setUser(null)} />
}

function Login({ onLoggedIn }: { onLoggedIn: (user: SafeUser) => void }) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const user = await api.login(email, password)
      if (user.role !== 'PATIENT') {
        setError(t('portal.error'))
        await api.logout()
        return
      }
      onLoggedIn(user)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401 ? t('auth.invalid') : t('auth.serverError'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <span className="flex items-center gap-2">
          <Stethoscope className="size-5 text-brand-500" aria-hidden="true" />
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t('app.name')}
          </h1>
        </span>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('portal.title')}</p>

        <div className="mt-6 flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {t('auth.email')}
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {t('auth.password')}
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-500 dark:text-red-400">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-6 w-full">
          {submitting ? t('auth.connecting') : t('auth.login')}
        </Button>

        <p className="mt-4 text-center text-xs text-neutral-400">{t('portal.loginHint')}</p>
      </form>
    </main>
  )
}

function Shell({ user, onLoggedOut }: { user: SafeUser; onLoggedOut: () => void }) {
  const { t } = useI18n()
  const [view, setView] = useState<View>('home')

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-4 px-4 py-3">
          <span className="flex items-center gap-2">
            <Stethoscope className="size-5 text-brand-500" aria-hidden="true" />
            <span className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              {t('app.name')}
            </span>
          </span>
          <nav className="mx-auto flex items-center gap-1">
            {NAV.map((item) => {
              const active = view === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                      : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {t(item.label)}
                </button>
              )
            })}
          </nav>
          <UserMenu user={user} onLoggedOut={onLoggedOut} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6">
        {view === 'home' && <HomeView user={user} onNavigate={setView} />}
        {view === 'appointments' && <AppointmentsView />}
        {view === 'book' && <BookingView onDone={() => setView('appointments')} />}
        {view === 'invoices' && <InvoicesView />}
      </main>

      <footer className="border-t border-neutral-200 px-6 py-4 text-center text-xs text-neutral-400 dark:border-neutral-800">
        {t('app.name')} — {t('portal.contactOffice')}
      </footer>
    </div>
  )
}

function UserMenu({ user, onLoggedOut }: { user: SafeUser; onLoggedOut: () => void }) {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t('auth.account')}
        className="flex size-9 items-center justify-center rounded-full border border-brand-500/30 bg-brand-50 text-sm font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
      >
        {user.name
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()}
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-64 rounded-lg border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="px-2.5 py-2">
            <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {user.name}
            </div>
            <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {user.email}
            </div>
          </div>
          <div className="px-2.5 pb-2">
            <span className="inline-flex rounded-full border border-brand-500/30 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {t('role.patient')}
            </span>
          </div>
          <div className="mx-1 border-t border-neutral-100 dark:border-neutral-800" />
          <div className="flex items-center gap-2 px-2.5 py-2">
            <label className="text-xs text-neutral-500" htmlFor="portal-theme">
              {t('locale.label')}
            </label>
            <select
              id="portal-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              aria-label={t('locale.label')}
            >
              <option value="system">{t('theme.system')}</option>
              <option value="light">{t('theme.light')}</option>
              <option value="dark">{t('theme.dark')}</option>
            </select>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
              aria-label={t('locale.label')}
            >
              <option value="fr">{t('locale.fr')}</option>
              <option value="ar">{t('locale.ar')}</option>
              <option value="en">{t('locale.en')}</option>
            </select>
          </div>
          <div className="mx-1 border-t border-neutral-100 dark:border-neutral-800" />
          <button
            onClick={onLoggedOut}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            {t('auth.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
