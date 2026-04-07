// lib/api/admin.ts
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

// Interface des statistiques (déjà présente dans ton page.tsx)
export interface AdminStats {
  users: {
    total: number
    admins: number
    users: number
    newThisWeek: number
  }
  invoices: {
    total: number
    validated: number
    rejected: number
    uploaded: number
    extracted: number
    newThisWeek: number
    successRate: number
    totalTTC: number
  }
  monthlyData: { month: string; total: number; validated: number }[]
  recentUsers: {
    id: number
    nom: string
    prenom: string
    email: string
    role: string
    createdAt: string
  }[]
  recentInvoices: {
    id: number
    fileName: string
    status: string
    totalTTC?: number
    createdAt: string
  }[]
}

export async function getUsers(
  token: string,
  params?: {
    page?: number
    limit?: number
    search?: string
    role?: string
  }
): Promise<PaginatedUsers> {
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

// Fonction corrigée
export async function getAdminStats(token: string): Promise<AdminStats> {
  const response = await fetch(`${API_BASE_URL}/admin/stats`, {
    headers: getHeaders(token),
  })
  return handleApiResponse<AdminStats>(response)
}
