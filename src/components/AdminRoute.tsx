import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import AdminLayout from './layout/AdminLayout'

export default function AdminRoute() {
  const { user, loading } = useAuthStore()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  // Defense-in-depth: Verify 2FA was completed before allowing admin access
  const is2FAVerified = sessionStorage.getItem('admin_2fa_verified')
  if (!is2FAVerified) {
    return <Navigate to="/login" replace />
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}
