import { API_BASE_URL, getHeaders, handleApiResponse } from './config'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  nom: string
  prenom: string
  email: string
  password: string
  dateAnniversaire: string
  cin: string
}

export interface UpdateProfileRequest {
  nom: string
  prenom: string
  dateAnniversaire?: string
  cin?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
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

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserProfile
}

export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(credentials),
  })
  return handleApiResponse<AuthResponse>(response)
}

export async function register(userData: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(userData),
  })
  return handleApiResponse<AuthResponse>(response)
}

export async function getMe(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: getHeaders(token),
  })
  return handleApiResponse<UserProfile>(response)
}

export async function updateProfile(
  token: string,
  data: UpdateProfileRequest
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  })
  return handleApiResponse<UserProfile>(response)
}

export async function changePassword(
  token: string,
  data: ChangePasswordRequest
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/password`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(data),
  })
  return handleApiResponse<void>(response)
}

export async function logout(token: string): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: getHeaders(token),
  }).catch(() => {})
}
