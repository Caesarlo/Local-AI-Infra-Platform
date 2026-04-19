import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { JWT_KEY } from '@/lib/constants'
import client from '@/api/client'

interface LoginPayload {
  email: string
  password: string
}

function getToken(): string | null {
  return localStorage.getItem(JWT_KEY)
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function useAuth() {
  const navigate = useNavigate()

  const login = useCallback(async (payload: LoginPayload, mode: 'admin' | 'user') => {
    const endpoint = mode === 'admin' ? '/admin/auth/login' : '/auth/login'
    const { data } = await client.post<{ token: string }>(endpoint, payload)
    localStorage.setItem(JWT_KEY, data.token)
    navigate('/dashboard')
  }, [navigate])

  const logout = useCallback(() => {
    localStorage.removeItem(JWT_KEY)
    navigate('/login')
  }, [navigate])

  const token = getToken()
  const isAuthenticated = token !== null && !isTokenExpired(token)

  return { login, logout, isAuthenticated }
}
