import {
  revokeSessionsSchema,
  type AuthResponse,
  type Role,
  type UserList,
} from '@dentora/contracts'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
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
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) detail = body.error
    } catch {
      // non-JSON error body — keep default detail
    }
    throw new ApiError(res.status, detail)
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
}
