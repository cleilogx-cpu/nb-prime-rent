import { Navigate } from 'react-router-dom'
import { useCompany } from '../hooks/useCompany.js'

/** Só administrador (app_metadata.role = 'admin') entra; os demais voltam pro Dashboard. */
export default function AdminRoute({ children }) {
  const { isAdmin } = useCompany()

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
