// API Admin - Endpoints d'administration
import { API_BASE_URL, getHeaders, handleApiResponse } from './config'
import type { UserProfile } from './auth'

// Types pour l'administration
export interface SystemLog {
  id: number
  timestamp: string
  type: 'info' | 'warning' | 'error' | 'success'
  action: string
  message: string
  userId?: number
  userName?: string
  ipAddress?: string
}

export interface UserListParams {
  page?: number
  limit?: number
  role?: string
  search?: string
}

export interface PaginatedUsers {
  items: UserProfile[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedLogs {
  items: SystemLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalInvoices: number
  totalProcessed: number
  successRate: number
  avgProcessingTime: number
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
  email?: string
  role?: 'admin' | 'user'
  dateAnniversaire?: string
  cin?: string
  isActive?: boolean
}

// GET /admin/users - Liste des utilisateurs
export async function getUsers(token: string, params?: UserListParams): Promise<PaginatedUsers> {
  const queryParams = new URLSearchParams()
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value))
      }
    })
  }
  
  const url = `${API_BASE_URL}/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  })
  
  return handleApiResponse<PaginatedUsers>(response)
}

// GET /admin/users/:id - Obtenir un utilisateur
export async function getUser(id: number, token: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'GET',
    headers: getHeaders(token),
  })
  
  return handleApiResponse<UserProfile>(response)
}

// POST /admin/users - Créer un utilisateur
export async function createUser(token: string, data: CreateUserRequest): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  })
  
  return handleApiResponse<UserProfile>(response)
}

// PUT /admin/users/:id - Modifier un utilisateur
export async function updateUser(id: number, token: string, data: UpdateUserRequest): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  })
  
  return handleApiResponse<UserProfile>(response)
}

// DELETE /admin/users/:id - Supprimer un utilisateur
export async function deleteUser(id: number, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Erreur suppression' }))
    throw new Error(errorData.detail || 'Erreur lors de la suppression')
  }
}

// GET /admin/logs - Logs système
export async function getSystemLogs(token: string, params?: {
  page?: number
  limit?: number
  type?: string
  dateFrom?: string
  dateTo?: string
}): Promise<PaginatedLogs> {
  const queryParams = new URLSearchParams()
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value))
      }
    })
  }
  
  const url = `${API_BASE_URL}/admin/logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(token),
  })
  
  return handleApiResponse<PaginatedLogs>(response)
}

// GET /admin/stats - Statistiques admin
export async function getAdminStats(token: string): Promise<AdminStats> {
  const response = await fetch(`${API_BASE_URL}/admin/stats`, {
    method: 'GET',
    headers: getHeaders(token),
  })
  
  return handleApiResponse<AdminStats>(response)
}
