import { API_BASE_URL, getHeaders, handleApiResponse } from './config'

export interface AdminUser {
  id: number
  nom: string
  prenom: string
  email: string
  role: 'admin' | 'user'
  dateAnniversaire?: string
  cin?: string
  createdAt: string
}

export interface PaginatedUsers {
  items: AdminUser[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateUserRequest {
  nom: string
  prenom: string
  email: string
  password: string
  role: 'admin' | 'user'
  dateAnniversaire?: string
  cin?: string
}

export interface UpdateUserRequest {
  nom?: string
  prenom?: string
  role?: 'admin' | 'user'
  dateAnniversaire?: string
  cin?: string
}

export async function getUsers(token: string, params?: {
  page?: number
  limit?: number
  search?: string
  role?: string
}): Promise<PaginatedUsers> {
  const q = new URLSearchParams()
  if (params?.page) q.append('page', String(params.page))
  if (params?.limit) q.append('limit', String(params.limit))
  if (params?.search) q.append('search', params.search)
  if (params?.role) q.append('role', params.role)

  const response = await fetch(`${API_BASE_URL}/admin/users?${q}`, {
    headers: getHeaders(token),
  })
  return handleApiResponse<PaginatedUsers>(response)
}

export async function createUser(token: string, data: CreateUserRequest): Promise<AdminUser> {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  })
  return handleApiResponse<AdminUser>(response)
}

export async function updateUser(token: string, id: number, data: UpdateUserRequest): Promise<AdminUser> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  })
  return handleApiResponse<AdminUser>(response)
}

export async function deleteUser(token: string, id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  })
  return handleApiResponse<void>(response)
}

export async function getAdminStats(token: string) {
  const response = await fetch(`${API_BASE_URL}/admin/stats`, {
    headers: getHeaders(token),
  })
  return handleApiResponse(response)
}
