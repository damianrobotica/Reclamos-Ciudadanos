import { AdminReclamos } from "@/components/AdminReclamos"

export default function AdminPage() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Panel de Administración</h1>
      <AdminReclamos />
    </main>
  )
}

