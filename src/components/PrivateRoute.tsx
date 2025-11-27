import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function PrivateRoute() {
  const { user, loading, checkAuth } = useAuthStore()
  const [timeoutReached, setTimeoutReached] = useState(false)

  // Timeout de sécurité: si loading > 5 secondes, forcer une nouvelle vérification
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ [PrivateRoute] Loading timeout reached, forcing checkAuth...')
        setTimeoutReached(true)
        checkAuth()
      }
    }, 5000)

    return () => clearTimeout(timeout)
  }, [loading, checkAuth])

  // Log pour debug
  useEffect(() => {
    console.log('🔒 [PrivateRoute] State:', { user: user?.email, loading, timeoutReached })
  }, [user, loading, timeoutReached])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500">Loading...</p>
        {timeoutReached && (
          <p className="text-sm text-amber-500">Taking longer than expected...</p>
        )}
      </div>
    )
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}
