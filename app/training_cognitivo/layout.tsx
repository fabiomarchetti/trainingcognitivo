/**
 * Layout per sezione Training
 */
import { Header } from '@/components/shared'

export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        {children}
      </main>
    </div>
  )
}
