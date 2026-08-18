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
  type DashboardKpis,
  type DashboardKpisQueryParams,
  type Expense,
  type ExpenseInput,
  type ExpenseList,
  type ExpenseQueryParams,
  type ExpenseUpdate,
  type FinanceReport,
  type InvoiceCreate,
  type Product,
  type ProductInput,
  type ProductList,
  type ProductQueryParams,
  type ProductUpdate,
  type InvoiceDetail,
  type InvoiceList,
  type InvoiceQueryParams,
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
  type Payment,
  type PaymentCreate,
  type PaymentList,
  type PaymentQueryParams,
  type RefundCreate,
  type PurchaseOrderCreate,
  type PurchaseOrderDetail,
  type PurchaseOrderList,
  type PurchaseOrderQueryParams,
  type PurchaseOrderReceive,
  type PurchaseOrderUpdate,
  type Role,
  type Service,
  type ServiceInput,
  type ServiceList,
  type ServiceQueryParams,
  type ServiceUpdate,
  type StaffDentistList,
  type Supplier,
  type SupplierInput,
  type SupplierList,
  type SupplierQueryParams,
  type SupplierUpdate,
  type SystemStatus,
  type StockAdjustInput,
  type StockEntry,
  type StockList,
  type StockOutInput,
  type StockQueryParams,
  type StockAlerts,
  type UserList,
  type WaitlistEntryDetail,
  type WaitlistInput,
  type WaitlistList,
  type WaitlistQueryParams,
  type WaitlistUpdate,
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

  dashboard: (params: DashboardKpisQueryParams = {}) => {
    const q = new URLSearchParams()
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    if (params.windowStart) q.set('windowStart', params.windowStart)
    return request<DashboardKpis>(`/api/dashboard/kpis?${q.toString()}`)
  },

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

  dentists: () => request<StaffDentistList>('/api/staff/dentists').then((r) => r.dentists),

  waitlist: (params: WaitlistQueryParams = {}) => {
    const q = new URLSearchParams()
    if (params.status) q.set('status', params.status)
    if (params.dentistId) q.set('dentistId', params.dentistId)
    if (params.patientId) q.set('patientId', params.patientId)
    if (params.q) q.set('q', params.q)
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    return request<WaitlistList>(`/api/waitlist?${q.toString()}`)
  },

  waitlistEntry: (id: string) => request<WaitlistEntryDetail>(`/api/waitlist/${id}`),

  createWaitlistEntry: (input: WaitlistInput) =>
    request<WaitlistEntryDetail>('/api/waitlist', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateWaitlistEntry: (id: string, input: WaitlistUpdate) =>
    request<WaitlistEntryDetail>(`/api/waitlist/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  services: (params: ServiceQueryParams = {}) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.category) q.set('category', params.category)
    if (params.archived) q.set('archived', params.archived)
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    return request<ServiceList>(`/api/services?${q.toString()}`)
  },

  createService: (input: ServiceInput) =>
    request<Service>(`/api/services`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateService: (id: string, input: ServiceUpdate) =>
    request<Service>(`/api/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  archiveService: (id: string) =>
    request<Service>(`/api/services/${id}/archive`, { method: 'POST' }),

  restoreService: (id: string) =>
    request<Service>(`/api/services/${id}/restore`, { method: 'POST' }),

  invoices: (params: InvoiceQueryParams = {}) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.status) q.set('status', params.status)
    if (params.patientId) q.set('patientId', params.patientId)
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    return request<InvoiceList>(`/api/invoices?${q.toString()}`)
  },

  invoice: (id: string) => request<InvoiceDetail>(`/api/invoices/${id}`),

  createInvoice: (input: InvoiceCreate) =>
    request<InvoiceDetail>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  voidInvoice: (id: string) =>
    request<InvoiceDetail>(`/api/invoices/${id}/void`, { method: 'POST' }),

  payments: (params: PaymentQueryParams = {}) => {
    const q = new URLSearchParams()
    if (params.invoiceId) q.set('invoiceId', params.invoiceId)
    if (params.invoiceNumber) q.set('invoiceNumber', String(params.invoiceNumber))
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    return request<PaymentList>(`/api/payments?${q.toString()}`)
  },

  createPayment: (input: PaymentCreate) =>
    request<Payment>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  refundPayment: (id: string, input: RefundCreate) =>
    request<Payment>(`/api/payments/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  expenses: (params: ExpenseQueryParams = {}) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.category) q.set('category', params.category)
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    if (params.voided) q.set('voided', params.voided)
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    return request<ExpenseList>(`/api/expenses?${q.toString()}`)
  },

  expense: (id: string) => request<Expense>(`/api/expenses/${id}`),

  createExpense: (input: ExpenseInput) =>
    request<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateExpense: (id: string, input: ExpenseUpdate) =>
    request<Expense>(`/api/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  voidExpense: (id: string) => request<Expense>(`/api/expenses/${id}/void`, { method: 'POST' }),

  financeReport: (params: { from?: string; to?: string } = {}) => {
    const q = new URLSearchParams()
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    return request<FinanceReport>(`/api/finance/report?${q.toString()}`)
  },

  products: (params: ProductQueryParams = {}) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.category) q.set('category', params.category)
    if (params.archived) q.set('archived', params.archived)
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    return request<ProductList>(`/api/products?${q.toString()}`)
  },

  product: (id: string) => request<Product>(`/api/products/${id}`),

  createProduct: (input: ProductInput) =>
    request<Product>('/api/products', { method: 'POST', body: JSON.stringify(input) }),

  updateProduct: (id: string, input: ProductUpdate) =>
    request<Product>(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  archiveProduct: (id: string) =>
    request<Product>(`/api/products/${id}/archive`, { method: 'POST' }),

  restoreProduct: (id: string) =>
    request<Product>(`/api/products/${id}/restore`, { method: 'POST' }),

  suppliers: (params: SupplierQueryParams = {}) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.archived) q.set('archived', params.archived)
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    return request<SupplierList>(`/api/suppliers?${q.toString()}`)
  },

  supplier: (id: string) => request<Supplier>(`/api/suppliers/${id}`),

  createSupplier: (input: SupplierInput) =>
    request<Supplier>('/api/suppliers', { method: 'POST', body: JSON.stringify(input) }),

  updateSupplier: (id: string, input: SupplierUpdate) =>
    request<Supplier>(`/api/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  archiveSupplier: (id: string) =>
    request<Supplier>(`/api/suppliers/${id}/archive`, { method: 'POST' }),

  restoreSupplier: (id: string) =>
    request<Supplier>(`/api/suppliers/${id}/restore`, { method: 'POST' }),

  purchaseOrders: (params: PurchaseOrderQueryParams = {}) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.status) q.set('status', params.status)
    if (params.supplierId) q.set('supplierId', params.supplierId)
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    return request<PurchaseOrderList>(`/api/purchase-orders?${q.toString()}`)
  },

  purchaseOrder: (id: string) => request<PurchaseOrderDetail>(`/api/purchase-orders/${id}`),

  createPurchaseOrder: (input: PurchaseOrderCreate) =>
    request<PurchaseOrderDetail>('/api/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updatePurchaseOrder: (id: string, input: PurchaseOrderUpdate) =>
    request<PurchaseOrderDetail>(`/api/purchase-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  cancelPurchaseOrder: (id: string) =>
    request<PurchaseOrderDetail>(`/api/purchase-orders/${id}/cancel`, { method: 'POST' }),

  receivePurchaseOrder: (id: string, input: PurchaseOrderReceive) =>
    request<PurchaseOrderDetail>(`/api/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  stock: (params: StockQueryParams = {}) => {
    const q = new URLSearchParams()
    if (params.productId) q.set('productId', params.productId)
    if (params.type) q.set('type', params.type)
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    if (params.limit) q.set('limit', String(params.limit))
    if (params.offset) q.set('offset', String(params.offset))
    return request<StockList>(`/api/stock?${q.toString()}`)
  },

  stockOut: (productId: string, input: StockOutInput) =>
    request<StockEntry>(`/api/stock/${productId}/out`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  stockAdjust: (productId: string, input: StockAdjustInput) =>
    request<StockEntry>(`/api/stock/${productId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  alerts: (horizonDays: number = 30) =>
    request<StockAlerts>(`/api/alerts?horizonDays=${horizonDays}`),
}

export function parseConflict(e: ApiError): AppointmentConflict | null {
  if (e instanceof ApiError && e.message === 'CONFLICT' && e.body) {
    return e.body as AppointmentConflict
  }
  return null
}
