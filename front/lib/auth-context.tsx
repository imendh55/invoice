'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import type { UserProfile, AuthResponse } from './api/auth'
import * as authApi from './api/auth'

// ====================== TYPES ======================

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

// ====================== CONTEXT ======================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'pharmaocr_token'
const USER_KEY = 'pharmaocr_user'

// ====================== PROVIDER ======================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Charger l'état d'authentification depuis le localStorage au démarrage
  useEffect(() => {
    const loadAuth = () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY)
        const storedUser = localStorage.getItem(USER_KEY)

        if (storedToken && storedUser) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        }
      } catch {
        // localStorage corrompu — nettoyer
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    loadAuth()
  }, [])

  // Persister les données d'auth
  const persistAuth = useCallback((token: string, user: UserProfile) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setToken(token)
    setUser(user)
  }, [])

  // Nettoyer les données d'auth
  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  // ====================== LOGIN ======================
  const login = useCallback(
    async (email: string, password: string) => {
      // Peut lever une ApiError — le composant appelant gère l'affichage
      const response: AuthResponse = await authApi.login({ email, password })
      persistAuth(response.access_token, response.user)
      router.push('/dashboard') // ✅ Login réussi → Dashboard
    },
    [router, persistAuth]
  )

  // ====================== REGISTER ======================
  const register = useCallback(
    async (data: authApi.RegisterRequest) => {
      await authApi.register(data)
      // ✅ Inscription réussie → Login (pas de connexion automatique)
      router.push('/login')
    },
    [router]
  )

  // ====================== LOGOUT ======================
  const logout = useCallback(() => {
    if (token) {
      authApi.logout(token) // Fire & forget
    }
    clearAuth()
    router.push('/login')
  }, [token, router, clearAuth])

  // ====================== UPDATE USER ======================
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

// ====================== HOOKS ======================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider")
  }
  return context
}

export function useToken(): string | null {
  const { token } = useAuth()
  return token
}
