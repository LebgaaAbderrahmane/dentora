import { useEffect, useState } from 'react'
import type { MessageKey } from '@dentora/i18n'
import type { Appointment, PortalMe } from '@dentora/contracts'
import { api, ApiError } from './api'

export const STATUS_KEY: Record<
  Appointment['status'],
  MessageKey & `appointments.status.${string}`
> = {
  PENDING: 'appointments.status.pending',
  CONFIRMED: 'appointments.status.confirmed',
  CANCELLED: 'appointments.status.cancelled',
  COMPLETED: 'appointments.status.completed',
  NOSHOW: 'appointments.status.noshow',
}

export function isCancellable(a: Appointment): boolean {
  if (a.status === 'CANCELLED' || a.status === 'COMPLETED' || a.status === 'NOSHOW') return false
  return new Date(a.startAt).getTime() > Date.now()
}

export function useProfile() {
  const [profile, setProfile] = useState<PortalMe | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .profile()
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.message === 'NO_PORTAL_PATIENT') {
          setError('portal.notLinked')
        } else {
          setError('portal.error')
        }
      })
  }, [])

  return { profile, error }
}
