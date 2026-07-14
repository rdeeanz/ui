import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { UsersManager } from "@/components/users/users-manager"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/rbac"

export default async function UsersPage() {
  await requireRole(["ADMIN"])

  const [users, regionals, pelabuhan] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { regional: true, pelabuhan: true },
    }),
    prisma.regional.findMany({ orderBy: { nama: "asc" } }),
    prisma.pelabuhan.findMany({ orderBy: { nama: "asc" }, include: { regional: true } }),
  ])

  return (
    <div>
      <PageHeader title="Manajemen Pengguna" description="Kelola akun dan hak akses pengguna" />
      <Card>
        <CardContent className="pt-6">
          <UsersManager
            users={users.map((u) => ({
              id: u.id,
              nama: u.nama,
              email: u.email,
              role: u.role,
              regionalId: u.regionalId,
              pelabuhanId: u.pelabuhanId,
              aktif: u.aktif,
              regionalNama: u.regional?.nama ?? null,
              pelabuhanNama: u.pelabuhan?.nama ?? null,
            }))}
            regionals={regionals.map((r) => ({ value: r.id, label: r.nama }))}
            pelabuhan={pelabuhan.map((p) => ({ value: p.id, label: `${p.nama} (${p.regional.nama})` }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
