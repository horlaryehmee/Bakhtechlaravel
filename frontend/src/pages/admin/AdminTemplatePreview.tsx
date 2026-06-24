import { Navigate, useParams } from 'react-router-dom'
import { AgencyHomeTemplate } from '@/pages/templates/AgencyHomeTemplate'
import { getAdminToken } from '@/lib/api'

export function AdminTemplatePreview() {
  const { template = '' } = useParams()

  if (!getAdminToken()) {
    return <Navigate to="/admin/login" replace />
  }

  if (template !== 'agency-v2') {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <AgencyHomeTemplate preview />
}
