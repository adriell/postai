'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import { getMe, clearToken, getToken } from '@/lib/api'

interface User {
  id: string
  email: string
  name: string
  plan: string
  credits: number
  email_verified: boolean
  is_admin: boolean
}

interface AuthCtx {
  user: User | null
  loading: boolean
  setUser: (u: User | null) => void
  logout: () => void
}

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true,
  setUser: () => {}, logout: () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) { setLoading(false); return }
    getMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  function logout() {
    clearToken()
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
