import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { ComponentType } from 'react'
import { useTheme } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { Locale, MessageKey } from '@dentora/i18n'
import type { SafeUser } from '@dentora/contracts'
import {
  LayoutDashboard,
  Users,
  UserCog,
  ScrollText,
  CalendarDays,
  ListTodo,
  Tags,
  Receipt,
  Wallet,
  LineChart,
  Package,
  Truck,
  ShoppingCart,
  Bell,
} from 'lucide-react'
import { api, ApiError } from './lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DashboardView } from './views/DashboardView'
import { UsersView } from './views/UsersView'
import { AuditView } from './views/AuditView'
import { PatientsView } from './views/PatientsView'
import { AppointmentsView } from './views/AppointmentsView'
import { WaitlistView } from './views/WaitlistView'
import { CatalogView } from './views/CatalogView'
import { InvoicesView } from './views/InvoicesView'
import { ExpensesView } from './views/ExpensesView'
import { FinanceView } from './views/FinanceView'
import { ProductsView } from './views/ProductsView'
import { SuppliersView } from './views/SuppliersView'
import { PurchaseOrdersView } from './views/PurchaseOrdersView'
import { AlertsView } from './views/AlertsView'

const ROLE_KEY: Record<SafeUser['role'], MessageKey> = {
  ADMIN: 'role.admin',
  DENTIST: 'role.dentist',
  RECEPTIONIST: 'role.receptionist',
  ACCOUNTANT: 'role.accountant',
  INTERN: 'role.intern',
  PATIENT: 'role.patient',
}

type View =
  | 'dashboard'
  | 'users'
  | 'audit'
  | 'patients'
  | 'appointments'
  | 'waitlist'
  | 'catalog'
  | 'invoices'
  | 'expenses'
  | 'finance'
  | 'products'
  | 'suppliers'
  | 'purchaseOrders'
  | 'alerts'

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
      <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
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
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {t('app.name')}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('app.tagline')}</p>

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
      </form>
    </main>
  )
}

function Shell({ user, onLoggedOut }: { user: SafeUser; onLoggedOut: () => void }) {
  const { t } = useI18n()
  const [view, setView] = useState<View>('dashboard')

  const isAdmin = user.role === 'ADMIN'
  const canManagePatients = ['ADMIN', 'DENTIST', 'RECEPTIONIST'].includes(user.role)
  const canManageBilling = ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'].includes(user.role)
  const canManageExpenses = ['ADMIN', 'ACCOUNTANT'].includes(user.role)
  const canManageFinance = ['ADMIN', 'ACCOUNTANT'].includes(user.role)
  const canViewProducts = ['ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT'].includes(user.role)
  const canEditProducts = ['ADMIN', 'ACCOUNTANT'].includes(user.role)
  const canManageProcurement = ['ADMIN', 'ACCOUNTANT'].includes(user.role)
  const canEditInvoices = ['ADMIN', 'RECEPTIONIST'].includes(user.role)
  const views: Array<{ id: View; label: MessageKey; icon: ComponentType<{ className?: string }> }> =
    [
      { id: 'dashboard', label: 'nav.dashboard', icon: LayoutDashboard },
      ...(canManagePatients
        ? [
            {
              id: 'appointments' as const,
              label: 'nav.appointments' as MessageKey,
              icon: CalendarDays,
            },
          ]
        : []),
      ...(canManagePatients
        ? [{ id: 'waitlist' as const, label: 'nav.waitlist' as MessageKey, icon: ListTodo }]
        : []),
      ...(canManagePatients
        ? [{ id: 'catalog' as const, label: 'nav.catalog' as MessageKey, icon: Tags }]
        : []),
      ...(canManageBilling
        ? [{ id: 'invoices' as const, label: 'nav.invoices' as MessageKey, icon: Receipt }]
        : []),
      ...(canManageExpenses
        ? [{ id: 'expenses' as const, label: 'nav.expenses' as MessageKey, icon: Wallet }]
        : []),
      ...(canManageFinance
        ? [{ id: 'finance' as const, label: 'nav.finance' as MessageKey, icon: LineChart }]
        : []),
      ...(canViewProducts
        ? [{ id: 'products' as const, label: 'nav.products' as MessageKey, icon: Package }]
        : []),
      ...(canViewProducts
        ? [
            {
              id: 'suppliers' as const,
              label: 'nav.suppliers' as MessageKey,
              icon: Truck,
            },
          ]
        : []),
      ...(canManageProcurement
        ? [
            {
              id: 'purchaseOrders' as const,
              label: 'nav.purchaseOrders' as MessageKey,
              icon: ShoppingCart,
            },
          ]
        : []),
      ...(canViewProducts
        ? [{ id: 'alerts' as const, label: 'nav.alerts' as MessageKey, icon: Bell }]
        : []),
      ...(canManagePatients
        ? [{ id: 'patients' as const, label: 'nav.patients' as MessageKey, icon: Users }]
        : []),
      ...(isAdmin
        ? [{ id: 'users' as const, label: 'nav.users' as MessageKey, icon: UserCog }]
        : []),
      ...(isAdmin
        ? [{ id: 'audit' as const, label: 'nav.audit' as MessageKey, icon: ScrollText }]
        : []),
    ]

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-e border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-baseline gap-2 px-2">
          <span className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t('app.name')}
          </span>
        </div>
        <nav className="mt-6 flex flex-col gap-1">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={
                view === v.id
                  ? 'flex items-center gap-3 rounded-lg bg-neutral-100 px-3 py-2 text-start text-sm font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                  : 'flex items-center gap-3 rounded-lg px-3 py-2 text-start text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'
              }
            >
              <v.icon className="size-4 shrink-0" aria-hidden="true" />
              {t(v.label)}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div className="flex items-center gap-3 px-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {user.name}
              </div>
              <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {user.email}
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-brand-500/30 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {t(ROLE_KEY[user.role])}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onLoggedOut}>
            {t('auth.logout')}
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t(
              view === 'dashboard'
                ? 'nav.dashboard'
                : view === 'appointments'
                  ? 'nav.appointments'
                  : view === 'waitlist'
                    ? 'nav.waitlist'
                    : view === 'catalog'
                      ? 'nav.catalog'
                      : view === 'invoices'
                        ? 'nav.invoices'
                        : view === 'expenses'
                          ? 'nav.expenses'
                          : view === 'finance'
                            ? 'nav.finance'
                            : view === 'products'
                              ? 'nav.products'
                              : view === 'suppliers'
                                ? 'nav.suppliers'
                                : view === 'purchaseOrders'
                                  ? 'nav.purchaseOrders'
                                  : view === 'alerts'
                                    ? 'nav.alerts'
                                    : view === 'patients'
                                      ? 'nav.patients'
                                      : view === 'users'
                                        ? 'nav.users'
                                        : 'nav.audit',
            )}
          </h1>
          <Controls />
        </header>
        {view === 'dashboard' && <DashboardView />}
        {view === 'appointments' && canManagePatients && <AppointmentsView />}
        {view === 'waitlist' && canManagePatients && <WaitlistView />}
        {view === 'catalog' && canManagePatients && <CatalogView canEdit={isAdmin} />}
        {view === 'invoices' && canManageBilling && <InvoicesView canEdit={canEditInvoices} />}
        {view === 'expenses' && canManageExpenses && <ExpensesView />}
        {view === 'finance' && canManageFinance && <FinanceView />}
        {view === 'products' && canViewProducts && <ProductsView canEdit={canEditProducts} />}
        {view === 'suppliers' && canViewProducts && <SuppliersView canEdit={canEditProducts} />}
        {view === 'purchaseOrders' && canManageProcurement && <PurchaseOrdersView />}
        {view === 'alerts' && canViewProducts && <AlertsView />}
        {view === 'patients' && canManagePatients && <PatientsView />}
        {view === 'users' && isAdmin && <UsersView />}
        {view === 'audit' && isAdmin && <AuditView />}
      </main>
    </div>
  )
}

function Controls() {
  const { locale, setLocale, t } = useI18n()
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-3">
      <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
        <SelectTrigger className="w-[110px]" aria-label={t('locale.label')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="system">{t('theme.system')}</SelectItem>
          <SelectItem value="light">{t('theme.light')}</SelectItem>
          <SelectItem value="dark">{t('theme.dark')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
        <SelectTrigger className="w-fit" aria-label={t('locale.label')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fr">{t('locale.fr')}</SelectItem>
          <SelectItem value="ar">{t('locale.ar')}</SelectItem>
          <SelectItem value="en">{t('locale.en')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
