import { useState } from 'react'
import type { FormEvent } from 'react'
import { useI18n } from '@dentora/i18n'
import type { SafeUser } from '@dentora/contracts'
import { Button, Input } from '@dentora/ui'
import { Stethoscope } from 'lucide-react'
import { api, ApiError } from '../lib/api'

// Consumes the one-time activation token that arrives from the web booking
// success screen (?token=…): the visitor sets a password, gets their PATIENT
// session immediately, and lands in the portal.
export default function ActivateView({
  token,
  onActivated,
}: {
  token: string
  onActivated: (user: SafeUser) => void
}) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(t('portal.activation.mismatch'))
      return
    }
    setSubmitting(true)
    try {
      await api.activate({ token, password })
      // accept endpoint already created the session cookie — fetch the user
      onActivated(await api.me())
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 410) setError(t('portal.activation.expired'))
        else if (err.status === 409) setError(t('portal.activation.exists'))
        else setError(t('portal.activation.invalid'))
      } else {
        setError(t('auth.serverError'))
      }
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
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {t('portal.activation.title')}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <label
            htmlFor="activation-password"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {t('portal.activation.password')}
          </label>
          <Input
            id="activation-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label
            htmlFor="activation-confirm"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {t('portal.activation.confirm')}
          </label>
          <Input
            id="activation-confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-500 dark:text-red-400">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-6 w-full">
          {submitting ? t('auth.connecting') : t('portal.activation.submit')}
        </Button>

        <p className="mt-4 text-center text-xs text-neutral-400">{t('portal.activation.hint')}</p>
      </form>
    </main>
  )
}
