import type {
  InvoiceDetail,
  PortalAppointments,
  PortalBooked,
  PortalBooking,
  PortalDentistList,
  PortalInvoices,
  PortalMe,
  SafeUser,
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
    request<{ user: SafeUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then((r) => r.user),

  me: () => request<{ user: SafeUser }>('/api/auth/me').then((r) => r.user),

  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  profile: () => request<PortalMe>('/api/portal/me'),

  dentists: () => request<PortalDentistList>('/api/portal/dentists'),

  appointments: () => request<PortalAppointments>('/api/portal/appointments'),

  book: (input: PortalBooking) =>
    request<PortalBooked>('/api/portal/bookings', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  cancelAppointment: (id: string) =>
    request<PortalBooked>(`/api/portal/appointments/${id}/cancel`, { method: 'POST' }),

  invoices: () => request<PortalInvoices>('/api/portal/invoices'),

  invoice: (id: string) => request<InvoiceDetail>(`/api/portal/invoices/${id}`),
}
