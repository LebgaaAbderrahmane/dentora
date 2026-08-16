import {
  revokeSessionsSchema,
  type AppointmentConflict,
  type AppointmentDetail,
  type AppointmentInput,
  type AppointmentList,
  type AppointmentQueryParams,
  type AppointmentUpdate,
  type AuditAction,
  type AuditList,
  type AuthResponse,
  type MedicalHistoryResponse,
  type MedicalHistoryWrite,
  type OdontogramResponse,
  type OdontogramWrite,
  type Patient,
  type PatientDetail,
  type PatientDocument,
  type PatientDocumentList,
  type PatientInput,
  type PatientList,
  type PatientQueryParams,
  type Role,
  type SystemStatus,
  type UserList,
} from '@dentora/contracts'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    let body: unknown
    try {
      body = await res.json()
      const parsed = body as { error?: string }
      if (parsed.error) detail = parsed.error
    } catch {
      // non-JSON error body — keep default detail
    }
    throw new ApiError(res.status, detail, body)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then((r) => r.user),

  me: () => request<AuthResponse>('/api/auth/me').then((r) => r.user),

  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  users: () => request<UserList>('/api/users').then((r) => r.users),

  updateRole: (id: string, role: Role) =>
    request<AuthResponse>(`/api/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }).then((r) => r.user),

  revokeSessions: (id: string) =>
    request(`/api/users/${id}/revoke-sessions`, { method: 'POST' }).then((r) =>
      revokeSessionsSchema.parse(r),
    ),

  audit: (params: { limit?: number; action?: AuditAction } = {}) => {
    const q = new URLSearchParams()
    if (params.limit) q.set('limit', String(params.limit))
    if (params.action) q.set('action', params.action)
    return request<AuditList>(`/api/audit?${q.toString()}`)
  },

  systemStatus: () => request<SystemStatus>('/api/system/status'),

  patients: (params: PatientQueryParams = {}) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.archived) q.set('archived', params.archived)
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    return request<PatientList>(`/api/patients?${q.toString()}`)
  },

  patient: (id: string) => request<PatientDetail>(`/api/patients/${id}`),

  createPatient: (input: PatientInput) =>
    request<PatientDetail>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updatePatient: (id: string, input: Partial<PatientInput>) =>
    request<PatientDetail>(`/api/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  archivePatient: (id: string) =>
    request<Patient>(`/api/patients/${id}/archive`, { method: 'POST' }),

  restorePatient: (id: string) =>
    request<Patient>(`/api/patients/${id}/restore`, { method: 'POST' }),

  medicalHistory: (id: string) =>
    request<MedicalHistoryResponse>(`/api/patients/${id}/medical-history`),

  saveMedicalHistory: (id: string, input: MedicalHistoryWrite) =>
    request<MedicalHistoryResponse>(`/api/patients/${id}/medical-history`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  odontogram: (id: string) => request<OdontogramResponse>(`/api/patients/${id}/odontogram`),

  saveOdontogram: (id: string, input: OdontogramWrite) =>
    request<OdontogramResponse>(`/api/patients/${id}/odontogram`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  documents: (id: string, params: { limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams()
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    return request<PatientDocumentList>(`/api/patients/${id}/documents?${q.toString()}`)
  },

  uploadDocument: (
    id: string,
    file: File,
    onProgress?: (fraction: number) => void,
  ): Promise<PatientDocument> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/patients/${id}/documents`)
      xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name))
      xhr.setRequestHeader('X-File-Mime', file.type || 'application/octet-stream')
      xhr.withCredentials = true
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as PatientDocument)
          } catch {
            reject(new ApiError(xhr.status, 'INVALID_RESPONSE'))
          }
        } else {
          let detail = `${xhr.status} ${xhr.statusText}`
          try {
            const body = JSON.parse(xhr.responseText) as { error?: string }
            if (body.error) detail = body.error
          } catch {
            // non-JSON body — keep default detail
          }
          reject(new ApiError(xhr.status, detail))
        }
      }
      xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR'))
      xhr.send(file)
    }),

  documentUrl: (id: string, documentId: string) => `/api/patients/${id}/documents/${documentId}`,

  appointments: (params: AppointmentQueryParams) => {
    const q = new URLSearchParams()
    if (params.start) q.set('start', params.start)
    if (params.end) q.set('end', params.end)
    if (params.status) q.set('status', params.status)
    if (params.dentistId) q.set('dentistId', params.dentistId)
    if (params.patientId) q.set('patientId', params.patientId)
    return request<AppointmentList>(`/api/appointments?${q.toString()}`)
  },

  appointment: (id: string) => request<AppointmentDetail>(`/api/appointments/${id}`),

  createAppointment: (input: AppointmentInput) =>
    request<AppointmentDetail>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateAppointment: (id: string, input: AppointmentUpdate) =>
    request<AppointmentDetail>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
}

export function parseConflict(e: ApiError): AppointmentConflict | null {
  if (e instanceof ApiError && e.message === 'CONFLICT' && e.body) {
    return e.body as AppointmentConflict
  }
  return null
}
