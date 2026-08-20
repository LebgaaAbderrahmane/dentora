import { useEffect, useRef, useState } from 'react'
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
  FlaskConical,
  Syringe,
  ClipboardCheck,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Stethoscope,
  Banknote,
  BarChart3,
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
import { ConsumptionView } from './views/ConsumptionView'
import { SterilizationsView } from './views/SterilizationsView'
import { StaffView } from './views/StaffView'
import { AttendanceView } from './views/AttendanceView'
import { InternsView } from './views/InternsView'
import { PayrollView } from './views/PayrollView'
import { NotificationsView } from './views/NotificationsView'
import { ReportsView } from './views/ReportsView'

const VIEW_TITLE: Record<View, MessageKey> = {
  dashboard: 'nav.dashboard',
  appointments: 'nav.appointments',
  waitlist: 'nav.waitlist',
  catalog: 'nav.catalog',
  invoices: 'nav.invoices',
  expenses: 'nav.expenses',
  finance: 'nav.finance',
  products: 'nav.products',
  suppliers: 'nav.suppliers',
  purchaseOrders: 'nav.purchaseOrders',
  alerts: 'nav.alerts',
  consumption: 'nav.consumption',
  sterilizations: 'nav.sterilizations',
  patients: 'nav.patients',
  users: 'nav.users',
  staff: 'nav.staff',
  attendance: 'nav.attendance',
  interns: 'nav.interns',
  payroll: 'nav.payroll',
  audit: 'nav.audit',
  notifications: 'nav.notifications',
  reports: 'nav.reports',
}

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
  | 'staff'
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
  | 'consumption'
  | 'sterilizations'
  | 'attendance'
  | 'interns'
  | 'payroll'
  | 'notifications'
  | 'reports'

type NavItem = {
  id: View
  label: MessageKey
  icon: ComponentType<{ className?: string }>
}
type NavSection = { label: MessageKey; items: NavItem[] }

const COLLAPSED_KEY = 'dentora-sidebar-collapsed'

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
  const [collapsed, setCollapsed] = useState(
    () => window.localStorage.getItem(COLLAPSED_KEY) === '1',
  )

  function toggleCollapsed() {
    setCollapsed((c) => {
      window.localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1')
      return !c
    })
  }

  const isAdmin = user.role === 'ADMIN'
  const canManagePatients = ['ADMIN', 'DENTIST', 'RECEPTIONIST'].includes(user.role)
  const canManageBilling = ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'].includes(user.role)
  const canManageExpenses = ['ADMIN', 'ACCOUNTANT'].includes(user.role)
  const canManageFinance = ['ADMIN', 'ACCOUNTANT'].includes(user.role)
  const canViewProducts = ['ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT'].includes(user.role)
  const canEditProducts = ['ADMIN', 'ACCOUNTANT'].includes(user.role)
  const canManageProcurement = ['ADMIN', 'ACCOUNTANT'].includes(user.role)
  const canEditInvoices = ['ADMIN', 'RECEPTIONIST'].includes(user.role)
  const canViewAttendance = ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'].includes(user.role)
  const canEditAttendance = ['ADMIN', 'RECEPTIONIST'].includes(user.role)
  const canManageInterns = ['ADMIN', 'ACCOUNTANT'].includes(user.role)
  const canViewReports = ['ADMIN', 'DENTIST', 'RECEPTIONIST', 'ACCOUNTANT'].includes(user.role)

  const navSections: NavSection[] = [
    {
      label: 'nav.section.clinical',
      items: [
        { id: 'dashboard', label: 'nav.dashboard', icon: LayoutDashboard },
        ...(canManagePatients
          ? [
              {
                id: 'appointments' as const,
                label: 'nav.appointments' as MessageKey,
                icon: CalendarDays,
              },
              { id: 'waitlist' as const, label: 'nav.waitlist' as MessageKey, icon: ListTodo },
              { id: 'catalog' as const, label: 'nav.catalog' as MessageKey, icon: Tags },
            ]
          : []),
        ...(canViewProducts
          ? [
              {
                id: 'consumption' as const,
                label: 'nav.consumption' as MessageKey,
                icon: Syringe,
              },
              {
                id: 'sterilizations' as const,
                label: 'nav.sterilizations' as MessageKey,
                icon: FlaskConical,
              },
            ]
          : []),
        ...(canManagePatients
          ? [{ id: 'patients' as const, label: 'nav.patients' as MessageKey, icon: Users }]
          : []),
      ],
    },
    {
      label: 'nav.section.stock',
      items: [
        ...(canViewProducts
          ? [
              { id: 'products' as const, label: 'nav.products' as MessageKey, icon: Package },
              { id: 'alerts' as const, label: 'nav.alerts' as MessageKey, icon: Bell },
              { id: 'suppliers' as const, label: 'nav.suppliers' as MessageKey, icon: Truck },
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
      ],
    },
    {
      label: 'nav.section.billing',
      items: [
        ...(canManageBilling
          ? [{ id: 'invoices' as const, label: 'nav.invoices' as MessageKey, icon: Receipt }]
          : []),
        ...(canManageExpenses
          ? [{ id: 'expenses' as const, label: 'nav.expenses' as MessageKey, icon: Wallet }]
          : []),
        ...(canManageFinance
          ? [{ id: 'finance' as const, label: 'nav.finance' as MessageKey, icon: LineChart }]
          : []),
        ...(canViewReports
          ? [{ id: 'reports' as const, label: 'nav.reports' as MessageKey, icon: BarChart3 }]
          : []),
      ],
    },
    ...(isAdmin || canViewAttendance || canManageInterns
      ? [
          {
            label: 'nav.section.admin' as MessageKey,
            items: [
              ...(canViewAttendance
                ? [
                    {
                      id: 'attendance' as const,
                      label: 'nav.attendance' as MessageKey,
                      icon: ClipboardCheck,
                    },
                  ]
                : []),
              ...(canManageInterns
                ? [
                    {
                      id: 'interns' as const,
                      label: 'nav.interns' as MessageKey,
                      icon: GraduationCap,
                    },
                  ]
                : []),
              ...(canManageFinance
                ? [
                    {
                      id: 'payroll' as const,
                      label: 'nav.payroll' as MessageKey,
                      icon: Banknote,
                    },
                  ]
                : []),
              ...(isAdmin
                ? [
                    { id: 'staff' as const, label: 'nav.staff' as MessageKey, icon: UserCog },
                    {
                      id: 'notifications' as const,
                      label: 'nav.notifications' as MessageKey,
                      icon: Bell,
                    },
                    { id: 'users' as const, label: 'nav.users' as MessageKey, icon: Users },
                    { id: 'audit' as const, label: 'nav.audit' as MessageKey, icon: ScrollText },
                  ]
                : []),
            ],
          },
        ]
      : []),
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`flex shrink-0 flex-col border-e border-neutral-200 bg-white transition-[width] duration-200 dark:border-neutral-800 dark:bg-neutral-950 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        <div className="flex h-14 shrink-0 items-center px-2">
          {collapsed ? (
            <span className="mx-auto flex size-8 items-center justify-center rounded-lg bg-brand-500 text-white">
              <Stethoscope className="size-4" aria-hidden="true" />
            </span>
          ) : (
            <span className="flex items-baseline gap-2 px-2">
              <Stethoscope className="size-4 self-center text-brand-500" aria-hidden="true" />
              <span className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                {t('app.name')}
              </span>
            </span>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto">
          {navSections.map((section) =>
            section.items.length === 0 ? null : (
              <div key={section.label} className="flex flex-col gap-0.5">
                {collapsed ? (
                  <div
                    className="mx-2 my-1 h-px bg-neutral-100 dark:bg-neutral-800"
                    aria-hidden="true"
                  />
                ) : (
                  <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {t(section.label)}
                  </p>
                )}
                {section.items.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setView(v.id)}
                    title={collapsed ? t(v.label) : undefined}
                    className={
                      collapsed
                        ? `mx-2 flex h-10 items-center justify-center rounded-lg ${
                            view === v.id
                              ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                              : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'
                          }`
                        : view === v.id
                          ? 'flex items-center gap-3 rounded-lg bg-neutral-100 px-3 py-2 text-start text-sm font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                          : 'flex items-center gap-3 rounded-lg px-3 py-2 text-start text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'
                    }
                  >
                    <v.icon className="size-4 shrink-0" aria-hidden="true" />
                    {!collapsed && t(v.label)}
                  </button>
                ))}
              </div>
            ),
          )}
        </nav>
        <div className="shrink-0 border-t border-neutral-200 px-2 py-2 dark:border-neutral-800">
          <button
            onClick={toggleCollapsed}
            title={t(collapsed ? 'nav.expand' : 'nav.collapse')}
            aria-label={t(collapsed ? 'nav.expand' : 'nav.collapse')}
            className={
              collapsed
                ? 'mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'
                : 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100'
            }
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-4 shrink-0" aria-hidden="true" />
            )}
            {!collapsed && t('nav.collapse')}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppBar view={view} user={user} onLoggedOut={onLoggedOut} />
        <main className="flex-1 overflow-y-auto p-6">
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
          {view === 'consumption' && canViewProducts && <ConsumptionView />}
          {view === 'sterilizations' && canViewProducts && <SterilizationsView />}
          {view === 'patients' && canManagePatients && <PatientsView />}
          {view === 'users' && isAdmin && <UsersView />}
          {view === 'staff' && isAdmin && <StaffView />}
          {view === 'attendance' && canViewAttendance && (
            <AttendanceView canEdit={canEditAttendance} />
          )}
          {view === 'interns' && canManageInterns && <InternsView canEdit={isAdmin} />}
          {view === 'payroll' && canManageFinance && <PayrollView canEdit={isAdmin} />}
          {view === 'audit' && isAdmin && <AuditView />}
          {view === 'notifications' && isAdmin && <NotificationsView />}
          {view === 'reports' && canViewReports && <ReportsView canFinances={canManageFinance} />}
        </main>
      </div>
    </div>
  )
}

function AppBar({
  view,
  user,
  onLoggedOut,
}: {
  view: View
  user: SafeUser
  onLoggedOut: () => void
}) {
  const { t } = useI18n()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-950">
      <h1 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {t(VIEW_TITLE[view])}
      </h1>
      <div className="ms-auto flex items-center gap-2">
        <Controls />
        <UserMenu user={user} onLoggedOut={onLoggedOut} />
      </div>
    </header>
  )
}

function UserMenu({ user, onLoggedOut }: { user: SafeUser; onLoggedOut: () => void }) {
  const { t } = useI18n()
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

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t('auth.account')}
        className="flex size-9 items-center justify-center rounded-full border border-brand-500/30 bg-brand-50 text-sm font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
      >
        {initials}
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-56 rounded-lg border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
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
              {t(ROLE_KEY[user.role])}
            </span>
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
