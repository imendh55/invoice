'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { UserProfile, AuthResponse } from './api/auth'
import * as authApi from './api/auth'

// MODE DÉVELOPPEMENT - Mettre à false quand le backend est connecté
const DEV_MODE = true

// Utilisateur mock pour le développement
const MOCK_USER: UserProfile = {
  id: '1',
  email: 'admin@pharmaocr.com',
  nom: 'Administrateur',
  prenom: 'PharmaOCR',
  role: 'admin',
  pharmacie: 'Pharmacie Centrale',
  created_at: '2024-01-01T00:00:00Z',
}

const MOCK_TOKEN = 'dev_token_mock_12345'

interface AuthContextType {
  user: UserProfile | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: authApi.RegisterRequest) => Promise<void>
  logout: () => void
  updateUser: (user: UserProfile) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'pharmaocr_token'
const USER_KEY = 'pharmaocr_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Charger l'état d'authentification au démarrage
  useEffect(() => {
    const loadAuth = async () => {
      try {
        // En mode dev, charger automatiquement l'utilisateur mock
        if (DEV_MODE) {
          const storedToken = localStorage.getItem(TOKEN_KEY)
          const storedUser = localStorage.getItem(USER_KEY)
          
          if (storedToken && storedUser) {
            setToken(storedToken)
            setUser(JSON.parse(storedUser))
          }
          setIsLoading(false)
          return
        }

        const storedToken = localStorage.getItem(TOKEN_KEY)
        const storedUser = localStorage.getItem(USER_KEY)
        
        if (storedToken && storedUser) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        }
      } catch (error) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    // Mode développement - login automatique
    if (DEV_MODE) {
      const mockUser = { ...MOCK_USER, email }
      setToken(MOCK_TOKEN)
      setUser(mockUser)
      localStorage.setItem(TOKEN_KEY, MOCK_TOKEN)
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser))
      router.push('/dashboard')
      return
    }

    const response: AuthResponse = await authApi.login({ email, password })
    
    setToken(response.access_token)
    setUser(response.user)
    
    localStorage.setItem(TOKEN_KEY, response.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(response.user))
    
    router.push('/dashboard')
  }, [router])

  const register = useCallback(async (data: authApi.RegisterRequest) => {
    // Mode développement - registration automatique
    if (DEV_MODE) {
      const mockUser = { 
        ...MOCK_USER, 
        email: data.email,
        nom: data.nom,
        prenom: data.prenom,
        pharmacie: data.pharmacie || 'Ma Pharmacie',
        role: 'user' as const
      }
      setToken(MOCK_TOKEN)
      setUser(mockUser)
      localStorage.setItem(TOKEN_KEY, MOCK_TOKEN)
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser))
      router.push('/dashboard')
      return
    }

    const response: AuthResponse = await authApi.register(data)
    
    setToken(response.access_token)
    setUser(response.user)
    
    localStorage.setItem(TOKEN_KEY, response.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(response.user))
    
    router.push('/dashboard')
  }, [router])

  const logout = useCallback(() => {
    if (token && !DEV_MODE) {
      authApi.logout(token).catch(() => {})
    }
    
    setToken(null)
    setUser(null)
    
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    
    router.push('/login')
  }, [token, router])

  const updateUser = useCallback((updatedUser: UserProfile) => {
    setUser(updatedUser)
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

export function useToken(): string | null {
  const { token } = useAuth()
  return token
}
