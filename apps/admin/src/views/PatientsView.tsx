import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Gender, Patient, PatientDetail, PatientInput } from '@dentora/contracts'
import { Button, Input, useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import { api } from '../lib/api'

const GENDERS: Gender[] = ['M', 'F', 'UNSPECIFIED']

const GENDER_KEY: Record<Gender, MessageKey> = {
  M: 'patients.gender.M',
  F: 'patients.gender.F',
  UNSPECIFIED: 'patients.gender.UNSPECIFIED',
}

type ArchivedFilter = 'exclude' | 'include' | 'only'

export function PatientsView() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [archived, setArchived] = useState<ArchivedFilter>('exclude')
  const [editing, setEditing] = useState<Patient | 'new' | null>(null)
  const [viewing, setViewing] = useState<Patient | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => {
    api
      .patients({ q: debouncedQ, archived, limit: 100 })
      .then((r) => {
        setPatients(r.patients)
        setTotal(r.total)
      })
      .catch(() => toast(t('auth.serverError'), 'error'))
      .finally(() => setLoading(false))
  }, [debouncedQ, archived, t, toast])

  async function refetch() {
    const r = await api.patients({ q: debouncedQ, archived, limit: 100 })
    setPatients(r.patients)
    setTotal(r.total)
  }

  async function toggleArchived(p: Patient) {
    try {
      await (p.archivedAt ? api.restorePatient(p.id) : api.archivePatient(p.id))
      toast(t(p.archivedAt ? 'patients.saved' : 'patients.saved'), 'success')
      await refetch()
    } catch {
      toast(t('auth.serverError'), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label={t('patients.search')}
          placeholder={t('patients.search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={archived}
          onChange={(e) => setArchived(e.target.value as ArchivedFilter)}
          className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        >
          <option value="exclude">{t('patients.activeOnly')}</option>
          <option value="include">{t('patients.all')}</option>
          <option value="only">{t('patients.archivedOnly')}</option>
        </select>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {total} {t('patients.total')}
        </span>
        <div className="ms-auto">
          <Button onClick={() => setEditing('new')} size="sm">
            {t('patients.newPatient')}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-start text-xs uppercase text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{t('patients.title')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('patients.phone')}</th>
              <th className="px-4 py-2 text-start font-medium">{t('patients.email')}</th>
              <th className="px-4 py-2 text-end font-medium">{t('patients.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  …
                </td>
              </tr>
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  {t('patients.noResults')}
                </td>
              </tr>
            ) : (
              patients.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                >
                  <td className="px-4 py-3">
                    <button
                      className="text-start font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                      onClick={() => setViewing(p)}
                    >
                      {p.lastName} {p.firstName}
                    </button>
                    {p.archivedAt && (
                      <span className="ms-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {t('patients.archived')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{p.phone}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{p.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditing(p)}>
                        {t('patients.edit')}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => void toggleArchived(p)}>
                        {t(p.archivedAt ? 'patients.restore' : 'patients.archive')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <PatientForm
          patient={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await refetch()
          }}
        />
      )}
      {viewing && <PatientDetail patient={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

function PatientForm({
  patient,
  onClose,
  onSaved,
}: {
  patient: Patient | null
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [firstName, setFirstName] = useState(patient?.firstName ?? '')
  const [lastName, setLastName] = useState(patient?.lastName ?? '')
  const [gender, setGender] = useState<Gender>(patient?.gender ?? 'UNSPECIFIED')
  const [birthDate, setBirthDate] = useState(patient?.birthDate?.slice(0, 10) ?? '')
  const [phone, setPhone] = useState(patient?.phone ?? '')
  const [email, setEmail] = useState(patient?.email ?? '')
  const [address, setAddress] = useState(patient?.address ?? '')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!patient) return
    api
      .patient(patient.id)
      .then((d) => setNotes(d.notes ?? ''))
      .catch(() => toast(t('auth.serverError'), 'error'))
  }, [patient, t, toast])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) return
    setSaving(true)
    const input: PatientInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      ...(birthDate ? { birthDate } : {}),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      notes: notes.trim(),
    }
    try {
      if (patient) await api.updatePatient(patient.id, input)
      else await api.createPatient(input)
      toast(t('patients.saved'), 'success')
      await onSaved()
    } catch {
      toast(t('patients.savedError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title={patient ? t('patients.edit') : t('patients.newPatient')}>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('patients.firstName')} required>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label={t('patients.lastName')} required>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('patients.gender')}>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {t(GENDER_KEY[g])}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('patients.birthDate')}>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </Field>
        </div>
        <Field label={t('patients.phone')}>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label={t('patients.email')}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t('patients.address')}>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label={t('patients.notes')}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </Field>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            {t('patients.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {t('patients.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function PatientDetail({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [detail, setDetail] = useState<PatientDetail | null>(null)

  useEffect(() => {
    api
      .patient(patient.id)
      .then(setDetail)
      .catch(() => toast(t('auth.serverError'), 'error'))
  }, [patient.id, t, toast])

  const fields = useMemo(
    () =>
      [
        detail?.gender
          ? { label: t('patients.gender'), value: t(GENDER_KEY[detail.gender]) }
          : null,
        detail?.birthDate
          ? {
              label: t('patients.birthDate'),
              value: new Date(detail.birthDate).toLocaleDateString(),
            }
          : null,
        detail?.phone ? { label: t('patients.phone'), value: detail.phone } : null,
        detail?.email ? { label: t('patients.email'), value: detail.email } : null,
        detail?.address ? { label: t('patients.address'), value: detail.address } : null,
      ].filter((f): f is { label: string; value: string } => f !== null),
    [detail, t],
  )

  return (
    <Modal
      onClose={onClose}
      title={`${patient.lastName} ${patient.firstName}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('patients.cancel')}
          </Button>
        </div>
      }
    >
      <dl className="flex flex-col gap-2 text-sm">
        {fields.map((f) => (
          <div
            key={f.label}
            className="flex justify-between border-b border-neutral-100 py-1 dark:border-neutral-800"
          >
            <dt className="text-neutral-500 dark:text-neutral-400">{f.label}</dt>
            <dd className="text-neutral-900 dark:text-neutral-100">{f.value}</dd>
          </div>
        ))}
        {detail?.notes ? (
          <div className="flex flex-col gap-1 border-b border-neutral-100 py-1 dark:border-neutral-800">
            <dt className="text-neutral-500 dark:text-neutral-400">{t('patients.notes')}</dt>
            <dd className="whitespace-pre-wrap text-neutral-900 dark:text-neutral-100">
              {detail.notes}
            </dd>
          </div>
        ) : null}
      </dl>
    </Modal>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  )
}

function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('input,select,textarea')
    el?.focus()
  }, [])
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
