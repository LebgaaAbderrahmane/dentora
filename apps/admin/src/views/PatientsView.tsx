import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  Gender,
  MedicalHistory,
  Odontogram,
  Patient,
  PatientDetail,
  PatientInput,
  PortalAccessResponse,
  PortalAccessStatus,
  ToothCondition,
  ToothEntry,
  ToothStatus,
  ToothSurface,
} from '@dentora/contracts'
import { useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import { api, ApiError } from '../lib/api'
import { DocumentsTab } from './DocumentsTab'
import { OdontogramChart } from '../components/OdontogramChart'
import { TOOTH_CONDITIONS, TOOTH_STATUSES, TOOTH_SURFACES } from '../components/odontogram'
import { SearchInput } from '@/components/ui/search-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
        <SearchInput
          aria-label={t('patients.search')}
          placeholder={t('patients.search')}
          value={q}
          onChange={setQ}
        />
        <Select value={archived} onValueChange={(v) => setArchived(v as ArchivedFilter)}>
          <SelectTrigger className="w-fit text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="exclude">{t('patients.activeOnly')}</SelectItem>
            <SelectItem value="include">{t('patients.all')}</SelectItem>
            <SelectItem value="only">{t('patients.archivedOnly')}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
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
                      <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                        {t('patients.edit')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void toggleArchived(p)}>
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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{patient ? t('patients.edit') : t('patients.newPatient')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('patients.firstName')} *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('patients.lastName')} *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t('patients.gender')}</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('patients.gender')} />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {t(GENDER_KEY[g])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('patients.birthDate')}</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('patients.phone')}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('patients.email')}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('patients.address')}</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('patients.notes')}</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:border-ring focus-visible:outline-none disabled:opacity-50 dark:bg-input/30"
            />
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              {t('patients.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {t('patients.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type DetailTab = 'details' | 'medical' | 'odontogram' | 'documents'

function PatientDetail({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [detail, setDetail] = useState<PatientDetail | null>(null)
  const [tab, setTab] = useState<DetailTab>('details')
  const [portalOpen, setPortalOpen] = useState(false)

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
        detail
          ? {
              label: t('appointments.status.noshow'),
              value: t('patients.noShowStat', {
                count: String(detail.noShowCount),
                rate: String(Math.round(detail.noShowRate * 100)),
              }),
            }
          : null,
      ].filter((f): f is { label: string; value: string } => f !== null),
    [detail, t],
  )

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'details', label: t('patients.tabs.details') },
    { id: 'medical', label: t('patients.tabs.medicalHistory') },
    { id: 'odontogram', label: t('patients.tabs.odontogram') },
    { id: 'documents', label: t('patients.tabs.documents') },
  ]

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{`${patient.lastName} ${patient.firstName}`}</DialogTitle>
        </DialogHeader>
        <div role="tablist" aria-label={t('patients.tabs.details')} className="mb-3 flex gap-1">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              role="tab"
              aria-selected={tab === tb.id}
              onClick={() => setTab(tb.id)}
              className={
                tab === tb.id
                  ? 'rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white'
                  : 'rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent'
              }
            >
              {tb.label}
            </button>
          ))}
        </div>
        {tab === 'details' && (
          <dl className="flex flex-col gap-2 text-sm">
            {fields.map((f) => (
              <div key={f.label} className="flex justify-between border-b border-border py-1">
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="text-foreground">{f.value}</dd>
              </div>
            ))}
            {detail?.notes ? (
              <div className="flex flex-col gap-1 border-b border-border py-1">
                <dt className="text-muted-foreground">{t('patients.notes')}</dt>
                <dd className="whitespace-pre-wrap text-foreground">{detail.notes}</dd>
              </div>
            ) : null}
          </dl>
        )}
        {tab === 'medical' && <MedicalHistoryTab patientId={patient.id} />}
        {tab === 'odontogram' && <OdontogramTab patientId={patient.id} />}
        {tab === 'documents' && <DocumentsTab patientId={patient.id} />}
        <DialogFooter className="flex justify-between">
          <Button variant="outline" size="sm" onClick={() => setPortalOpen(true)}>
            {t('patients.portalAccess')}
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('patients.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
      {portalOpen && <PortalAccessModal patient={patient} onClose={() => setPortalOpen(false)} />}
    </Dialog>
  )
}

function PortalAccessModal({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [status, setStatus] = useState<PortalAccessStatus | null>(null)
  const [creds, setCreds] = useState<PortalAccessResponse | null>(null)
  const [error, setError] = useState<MessageKey | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setStatus(await api.portalAccessStatus(patient.id))
    } catch {
      setError('portal.error')
    }
  }, [patient.id])

  useEffect(() => {
    void load()
  }, [load])

  async function provision(action: 'create' | 'reset') {
    if (action === 'reset' && !window.confirm(t('patients.portalAccess.hint'))) return
    setBusy(true)
    setError(null)
    try {
      const response = await api.provisionPortalAccess(patient.id, action)
      setCreds(response)
      setStatus((s) => (s ? { ...s, hasPortalAccess: true } : s))
      toast(
        t(
          action === 'create' ? 'patients.portalAccess.created' : 'patients.portalAccess.resetDone',
        ),
        'success',
      )
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === 'EMAIL_IN_USE') setError('patients.portalAccess.emailInUse')
        else if (err.message === 'NO_EMAIL') setError('patients.portalAccess.noEmail')
        else if (err.message === 'PORTAL_ACCESS_EXISTS') setError('patients.portalAccess.exists')
        else if (err.message === 'NO_PORTAL_ACCESS') setError('patients.portalAccess.noPortal')
        else setError('portal.error')
      } else {
        setError('portal.error')
      }
    } finally {
      setBusy(false)
    }
  }

  async function copyPassword() {
    if (!creds) return
    try {
      await navigator.clipboard.writeText(creds.password)
      toast(t('patients.portalAccess.copied'), 'success')
    } catch {
      // clipboard unavailable — keep the box visible
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('patients.portalAccess')} — {patient.lastName} {patient.firstName}
          </DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{t(error)}</p>}
        <p className="text-sm text-muted-foreground">{t('patients.portalAccess.hint')}</p>

        {status && (
          <p className="text-sm">
            {status.hasPortalAccess
              ? t('patients.portalAccess.exists')
              : t('patients.portalAccess.none')}
          </p>
        )}

        {!creds && (
          <div className="flex gap-2">
            {!status?.hasPortalAccess && (
              <Button size="sm" disabled={busy} onClick={() => void provision('create')}>
                {t('patients.portalAccess.create')}
              </Button>
            )}
            {status?.hasPortalAccess && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void provision('reset')}
              >
                {t('patients.portalAccess.reset')}
              </Button>
            )}
          </div>
        )}

        {creds && (
          <div className="rounded-lg border border-border bg-muted p-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t('patients.portalAccess.credentials')}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="min-w-0 text-sm">
                <p className="truncate text-foreground">{creds.email}</p>
                <p className="font-mono text-foreground">{creds.password}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void copyPassword()}>
                {t('patients.portalAccess.copy')}
              </Button>
            </div>
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              {t('patients.portalAccess.passwordOnce')}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('patients.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const MEDICAL_FIELDS: { name: keyof MedicalHistory; key: MessageKey }[] = [
  { name: 'allergies', key: 'patients.mh.allergies' },
  { name: 'conditions', key: 'patients.mh.conditions' },
  { name: 'medications', key: 'patients.mh.medications' },
  { name: 'surgeryHistory', key: 'patients.mh.surgeryHistory' },
  { name: 'familyHistory', key: 'patients.mh.familyHistory' },
  { name: 'lifestyle', key: 'patients.mh.lifestyle' },
  { name: 'otherNotes', key: 'patients.mh.otherNotes' },
]

const EMPTY_FORM: Record<keyof MedicalHistory, string> = {
  allergies: '',
  conditions: '',
  medications: '',
  surgeryHistory: '',
  familyHistory: '',
  lifestyle: '',
  otherNotes: '',
}

function MedicalHistoryTab({ patientId }: { patientId: string }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [version, setVersion] = useState(0)
  const [form, setForm] = useState<Record<keyof MedicalHistory, string>>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api.medicalHistory(patientId)
      setVersion(r.version)
      setForm({ ...EMPTY_FORM, ...(r.data ?? {}) })
    } catch {
      toast(t('auth.serverError'), 'error')
    }
  }, [patientId, t, toast])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave() {
    const data: Partial<MedicalHistory> = {}
    for (const f of MEDICAL_FIELDS) {
      const value = form[f.name].trim()
      if (value) data[f.name] = value
    }
    if (Object.keys(data).length === 0) {
      toast(t('patients.mh.savedError'), 'error')
      return
    }
    setSaving(true)
    try {
      const r = await api.saveMedicalHistory(patientId, { version, data: data as MedicalHistory })
      setVersion(r.version)
      setForm({ ...EMPTY_FORM, ...(r.data ?? {}) })
      toast(t('patients.mh.saved'), 'success')
    } catch (e) {
      if (e instanceof ApiError && e.message === 'VERSION_CONFLICT') {
        toast(t('patients.mh.versionConflict'), 'error')
        await load()
      } else {
        toast(t('patients.mh.savedError'), 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {MEDICAL_FIELDS.map((f) => (
        <div key={f.name} className="flex flex-col gap-1.5">
          <Label>{t(f.key)}</Label>
          <textarea
            value={form[f.name]}
            onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
            rows={2}
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:border-ring focus-visible:outline-none disabled:opacity-50 dark:bg-input/30"
          />
        </div>
      ))}
      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving} size="sm">
          {t('patients.save')}
        </Button>
      </div>
    </div>
  )
}

function OdontogramTab({ patientId }: { patientId: string }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [version, setVersion] = useState(0)
  const [data, setData] = useState<Odontogram | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await api.odontogram(patientId)
      setVersion(r.version)
      setData(r.data)
    } catch {
      toast(t('auth.serverError'), 'error')
    }
  }, [patientId, t, toast])

  useEffect(() => {
    void load()
  }, [load])

  function updateSelected(entry: ToothEntry) {
    setData((prev) => {
      const teeth = { ...(prev?.teeth ?? {}) }
      teeth[selected!] = entry
      return { teeth }
    })
  }

  async function handleSave() {
    if (!data) return
    setSaving(true)
    try {
      const r = await api.saveOdontogram(patientId, { version, data })
      setVersion(r.version)
      setData(r.data)
      toast(t('patients.od.saved'), 'success')
    } catch (e) {
      if (e instanceof ApiError && e.message === 'VERSION_CONFLICT') {
        toast(t('patients.od.versionConflict'), 'error')
        await load()
      } else {
        toast(t('patients.od.savedError'), 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const selectedEntry: ToothEntry | undefined = selected ? data?.teeth?.[selected] : undefined

  return (
    <div className="flex flex-col gap-4">
      <OdontogramChart teeth={data?.teeth} selected={selected} onSelect={setSelected} />
      {selected ? (
        <ToothEditor
          code={selected}
          entry={
            selectedEntry ?? {
              status: 'present',
              surfaces: { m: [], d: [], o: [], b: [], l: [] },
            }
          }
          onChange={updateSelected}
        />
      ) : (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('patients.od.selectTooth')}
        </p>
      )}
      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? t('patients.od.saving') : t('patients.save')}
        </Button>
      </div>
    </div>
  )
}

const OD_STATUS_KEY: Record<ToothStatus, MessageKey> = {
  present: 'patients.od.status.present',
  missing: 'patients.od.status.missing',
  implant: 'patients.od.status.implant',
  crown: 'patients.od.status.crown',
  root: 'patients.od.status.root',
}

const OD_SURFACE_KEY: Record<ToothSurface, MessageKey> = {
  m: 'patients.od.surface.m',
  d: 'patients.od.surface.d',
  o: 'patients.od.surface.o',
  b: 'patients.od.surface.b',
  l: 'patients.od.surface.l',
}

const OD_CONDITION_KEY: Record<ToothCondition, MessageKey> = {
  caries: 'patients.od.condition.caries',
  filling: 'patients.od.condition.filling',
  sealant: 'patients.od.condition.sealant',
  fracture: 'patients.od.condition.fracture',
  wear: 'patients.od.condition.wear',
  stain: 'patients.od.condition.stain',
}

function ToothEditor({
  code,
  entry,
  onChange,
}: {
  code: string
  entry: ToothEntry
  onChange: (entry: ToothEntry) => void
}) {
  const { t } = useI18n()

  function setStatus(status: ToothStatus) {
    onChange({ ...entry, status })
  }

  function toggleSurfaceCondition(surface: ToothSurface, condition: ToothCondition) {
    const current = entry.surfaces[surface]
    const next = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current, condition]
    onChange({ ...entry, surfaces: { ...entry.surfaces, [surface]: next } })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">
          {t('patients.od.status')} — {code}
        </span>
        <div className="flex flex-wrap gap-2">
          {TOOTH_STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={entry.status === s ? 'default' : 'outline'}
              onClick={() => setStatus(s)}
            >
              {t(OD_STATUS_KEY[s])}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t('patients.od.surfaces')}
        </span>
        {TOOTH_SURFACES.map((surface) => (
          <div key={surface} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs text-muted-foreground">
              {t(OD_SURFACE_KEY[surface])}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TOOTH_CONDITIONS.map((c) => {
                const active = entry.surfaces[surface].includes(c)
                return (
                  <Button
                    key={c}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    aria-pressed={active}
                    onClick={() => toggleSurfaceCondition(surface, c)}
                  >
                    {t(OD_CONDITION_KEY[c])}
                  </Button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
