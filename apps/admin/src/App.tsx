import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { AuditAction, AuditEntry, Role, SafeUser } from '@dentora/contracts'
import { api, ApiError } from './lib/api'

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  DENTIST: 'Dentiste',
  RECEPTIONIST: 'Réception',
  ACCOUNTANT: 'Comptable',
  INTERN: 'Stagiaire',
  PATIENT: 'Patient',
}

const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN_SUCCESS: 'Connexion',
  LOGIN_FAILURE: 'Échec connexion',
  LOGOUT: 'Déconnexion',
  CHANGE_PASSWORD: 'Changement mot de passe',
  REVOKE_ALL_SESSIONS: 'Révoquer sessions',
  USER_ROLE_CHANGE: 'Changement rôle',
  REVOKE_SESSIONS: 'Révoquer sessions',
  PATIENT_VIEW: 'Consultation patient',
  PATIENT_CREATE: 'Création patient',
  PATIENT_UPDATE: 'Modification patient',
  PATIENT_DELETE: 'Suppression patient',
}

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
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-sm text-neutral-500">
        Chargement…
      </main>
    )
  }

  if (!user) {
    return <LoginScreen onLoggedIn={setUser} />
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">DENTORA Admin</h1>
          <p className="text-xs text-neutral-500">Practice management — squelette (Phase 0.5)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <div className="font-medium">{user.name}</div>
            <div className="text-xs text-neutral-500">{user.email}</div>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            {ROLE_LABELS[user.role]}
          </span>
          <button
            onClick={() => {
              void api.logout().finally(() => setUser(null))
            }}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-500"
          >
            Se déconnecter
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="text-sm font-medium text-neutral-400">Tableau de bord</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Connecté en tant que <span className="text-neutral-200">{user.email}</span> — les
            données en temps réel arrivent à la phase 0.8.
          </p>
        </div>

        {user.role === 'ADMIN' && (
          <>
            <UsersPanel />
            <AuditPanel />
          </>
        )}
      </div>
    </main>
  )
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: (user: SafeUser) => void }) {
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
      if (err instanceof ApiError && err.status === 401) {
        setError('Identifiants invalides')
      } else {
        setError('Erreur du serveur — réessayez')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-8"
      >
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100">DENTORA Admin</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Connectez-vous pour accéder au tableau de bord
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium text-neutral-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium text-neutral-300">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  )
}

function UsersPanel() {
  const [users, setUsers] = useState<SafeUser[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    api
      .users()
      .then(setUsers)
      .catch(() => setUsers([]))
  }, [])

  async function changeRole(id: string, role: Role) {
    setMessage(null)
    await api.updateRole(id, role)
    const updated = await api.users()
    setUsers(updated)
    setMessage('Rôle changé — la session de cet utilisateur a été révoquée.')
  }

  async function revoke(id: string) {
    setMessage(null)
    const { revokedCount } = await api.revokeSessions(id)
    setMessage(`Sessions révoquées : ${revokedCount}.`)
  }

  return (
    <section className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="text-sm font-medium text-neutral-400">Utilisateurs</h2>
      {message && <p className="mt-2 text-xs text-emerald-400">{message}</p>}
      <ul className="mt-4 flex flex-col gap-2">
        {(users ?? []).map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{u.name}</div>
              <div className="truncate text-xs text-neutral-500">{u.email}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <select
                value={u.role}
                onChange={(e) => void changeRole(u.id, e.target.value as Role)}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void revoke(u.id)}
                className="rounded-lg border border-neutral-700 px-2 py-1 text-xs hover:border-amber-500"
                title="Révoquer toutes les sessions"
              >
                Révoquer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AuditPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [action, setAction] = useState<AuditAction | undefined>(undefined)

  useEffect(() => {
    api
      .audit({ limit: 50, action })
      .then((r) => {
        setEntries(r.entries)
        setTotal(r.total)
      })
      .catch(() => {
        setEntries([])
        setTotal(0)
      })
  }, [action])

  return (
    <section className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-400">Journal d'audit</h2>
        <select
          value={action ?? ''}
          onChange={(e) => setAction(e.target.value ? (e.target.value as AuditAction) : undefined)}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs"
        >
          <option value="">Toutes les actions</option>
          {(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 flex flex-col gap-1.5">
        {entries.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 whitespace-nowrap text-xs text-neutral-500">
                {new Date(e.createdAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="shrink-0 font-medium text-neutral-200">
                {ACTION_LABELS[e.action]}
              </span>
              <span className="min-w-0 truncate text-xs text-neutral-500">
                {e.actorEmail ?? '—'}
              </span>
            </div>
            <span className="shrink-0 font-mono text-xs text-neutral-600">{e.ip ?? ''}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-neutral-600">Aucun événement récent.</p>
        )}
      </div>
      <p className="mt-3 text-xs text-neutral-600">
        {total} événement{total === 1 ? '' : 's'}.
      </p>
    </section>
  )
}
