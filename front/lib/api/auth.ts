// API Authentication - interface/api/routers/auth_router.py
import { API_BASE_URL, getHeaders, handleApiResponse } from './config'

// Types correspondant aux schemas Pydantic du backend
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  nom: string
  prenom: string
  email: string
  password: string
  dateAnniversaire?: string
  cin?: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: {
    id: number
    nom: string
    prenom: string
    email: string
    role: 'admin' | 'user'
    dateAnniversaire?: string
    cin?: string
    createdAt: string
  }
}

export interface UserProfile {
  id: number
  nom: string
  prenom: string
  email: string
  role: 'admin' | 'user'
  dateAnniversaire?: string
  cin?: string
  createdAt: string
}

// POST /auth/login
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(credentials),
  })
  
  return handleApiResponse<AuthResponse>(response)
}

// POST /auth/register
export async function register(userData: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(userData),
  })
  
  return handleApiResponse<AuthResponse>(response)
}

// GET /auth/me - Obtenir le profil de l'utilisateur connecté
export async function getMe(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: getHeaders(token),
  })
  
  return handleApiResponse<UserProfile>(response)
}

// POST /auth/logout
export async function logout(token: string): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: getHeaders(token),
  })
}
