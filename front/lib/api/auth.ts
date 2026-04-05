// lib/api/auth.ts
import { API_BASE_URL, getHeaders, handleApiResponse } from './config'

// ====================== TYPES ======================

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  nom: string
  prenom: string
  email: string
  password: string
}

export interface UserProfile {
  id: number
  nom: string
  prenom: string
  email: string
  role: 'admin' | 'user'
  createdAt: string  // ✅ camelCase — correspond à ce que retourne le backend
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserProfile
}

// ====================== API CALLS ======================

// POST /api/auth/login
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  // ✅ JSON — le backend FastAPI attend LoginRequest (Pydantic), pas OAuth2 form-data
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),   // Content-Type: application/json
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  })

  return handleApiResponse<AuthResponse>(response)
}

// POST /api/auth/register
export async function register(userData: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(userData),
  })
  return handleApiResponse<AuthResponse>(response)
}

// GET /api/auth/me
export async function getMe(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: getHeaders(token),
  })
  return handleApiResponse<UserProfile>(response)
}

// POST /api/auth/logout (fire & forget — pas de route backend requise)
export async function logout(token: string): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: getHeaders(token),
  }).catch(() => {
    // Ignorer les erreurs réseau au logout
  })
}
