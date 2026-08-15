import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  Gender,
  MedicalHistory,
  Odontogram,
  Patient,
  PatientDetail,
  PatientInput,
  ToothCondition,
  ToothEntry,
  ToothStatus,
  ToothSurface,
} from '@dentora/contracts'
import { Button, Field, Input, Modal, useToast } from '@dentora/ui'
import { useI18n } from '@dentora/i18n'
import type { MessageKey } from '@dentora/i18n'
import { api, ApiError } from '../lib/api'
import { OdontogramChart } from '../components/OdontogramChart'
import { TOOTH_CONDITIONS, TOOTH_STATUSES, TOOTH_SURFACES } from '../components/odontogram'

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
    <Modal
      onClose={onClose}
      title={patient ? t('patients.edit') : t('patients.newPatient')}
      closeLabel={t('common.close')}
    >
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

type DetailTab = 'details' | 'medical' | 'odontogram'

function PatientDetail({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [detail, setDetail] = useState<PatientDetail | null>(null)
  const [tab, setTab] = useState<DetailTab>('details')

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

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'details', label: t('patients.tabs.details') },
    { id: 'medical', label: t('patients.tabs.medicalHistory') },
    { id: 'odontogram', label: t('patients.tabs.odontogram') },
  ]

  return (
    <Modal
      onClose={onClose}
      title={`${patient.lastName} ${patient.firstName}`}
      closeLabel={t('common.close')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('patients.cancel')}
          </Button>
        </div>
      }
    >
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
                : 'rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }
          >
            {tb.label}
          </button>
        ))}
      </div>
      {tab === 'details' && (
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
      )}
      {tab === 'medical' && <MedicalHistoryTab patientId={patient.id} />}
      {tab === 'odontogram' && <OdontogramTab patientId={patient.id} />}
    </Modal>
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
        <Field key={f.name} label={t(f.key)}>
          <textarea
            value={form[f.name]}
            onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
            rows={2}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </Field>
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
      <OdontogramChart teeth={data?.teeth} selected={selected} onSelect={setSelected} t={t} />
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
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {t('patients.od.status')} — {code}
        </span>
        <div className="flex flex-wrap gap-2">
          {TOOTH_STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={entry.status === s ? 'primary' : 'secondary'}
              onClick={() => setStatus(s)}
            >
              {t(OD_STATUS_KEY[s])}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {t('patients.od.surfaces')}
        </span>
        {TOOTH_SURFACES.map((surface) => (
          <div key={surface} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
              {t(OD_SURFACE_KEY[surface])}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TOOTH_CONDITIONS.map((c) => {
                const active = entry.surfaces[surface].includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleSurfaceCondition(surface, c)}
                    aria-pressed={active}
                    className={
                      active
                        ? 'min-h-11 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white'
                        : 'min-h-11 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300'
                    }
                  >
                    {t(OD_CONDITION_KEY[c])}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
