import { Navigate, Outlet } from 'react-router-dom'
import { JWT_KEY } from '@/lib/constants'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function RequireAuth() {
  const token = localStorage.getItem(JWT_KEY)
  const authenticated = token !== null && !isTokenExpired(token)

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
