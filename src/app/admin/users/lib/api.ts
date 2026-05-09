import { config } from '@/lib/config'
import type { LabelerSummary } from '@/app/admin/labeling/lib/types'

const BASE = `${config.apiUrl}/api/v1/admin/users`

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (body && typeof body === 'object' && 'detail' in body) {
      const detail = (body as { detail: unknown }).detail
      if (typeof detail === 'string') return detail
      return JSON.stringify(detail)
    }
    return JSON.stringify(body)
  } catch {
    return res.statusText || `HTTP ${res.status}`
  }
}

export class UsersApiError extends Error {
  status: number
  detail: string
  constructor(status: number, detail: string) {
    super(`${status}: ${detail}`)
    this.status = status
    this.detail = detail
  }
}

export interface UsersListResponse {
  users: LabelerSummary[]
}

export async function fetchUsers(
  token: string,
  signal?: AbortSignal,
): Promise<UsersListResponse> {
  const res = await fetch(BASE, { headers: authHeaders(token), signal })
  if (!res.ok) throw new UsersApiError(res.status, await readError(res))
  return res.json()
}

export async function addLabeler(
  token: string,
  body: { email: string; name: string },
): Promise<LabelerSummary> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new UsersApiError(res.status, await readError(res))
  return res.json()
}

export async function patchLabeler(
  token: string,
  userId: string,
  body: { active?: boolean; name?: string },
): Promise<LabelerSummary> {
  const res = await fetch(`${BASE}/${userId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new UsersApiError(res.status, await readError(res))
  return res.json()
}

export async function removeLabeler(
  token: string,
  userId: string,
): Promise<void> {
  const res = await fetch(`${BASE}/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new UsersApiError(res.status, await readError(res))
}
