/**
 * Layout specifico per sezione Admin
 */
import { AdminLayout } from '@/components/admin'

export default function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayout>{children}</AdminLayout>
}
