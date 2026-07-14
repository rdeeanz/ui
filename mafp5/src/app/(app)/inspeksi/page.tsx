import Link from "next/link"
import { Pencil } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { ParamSelect } from "@/components/param-select"
import { StatusInspeksiBadge } from "@/components/status-inspeksi-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import { requireRole, scopeFilterPelabuhan } from "@/lib/rbac"
import { getPeriodeList, labelPeriode, resolvePeriode } from "@/lib/analytics"

export default async function InspeksiListPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>
}) {
  const user = await requireRole(["ADMIN", "PETUGAS", "PIC_REGIONAL"])
  const sp = await searchParams
  const periode = await resolvePeriode(sp.periode)
  const periodes = await getPeriodeList()
  if (!periode) return <PageHeader title="Input Inspeksi" />

  const pelabuhanFilter = scopeFilterPelabuhan(user)
  const inspeksi = await prisma.inspeksi.findMany({
    where: { periodeId: periode.id, pelabuhan: pelabuhanFilter },
    include: { pelabuhan: { include: { regional: true } }, _count: { select: { catatan: true } } },
    orderBy: [{ pelabuhan: { regional: { nama: "asc" } } }, { pelabuhan: { nama: "asc" } }],
  })

  return (
    <div>
      <PageHeader
        title="Input Inspeksi"
        description="Kelola data inspeksi fasilitas per pelabuhan dan periode"
      >
        <ParamSelect
          param="periode"
          value={periode.id}
          options={periodes.map((p) => ({ value: p.id, label: labelPeriode(p) }))}
          className="w-[160px]"
          ariaLabel="Pilih periode"
        />
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelabuhan</TableHead>
                <TableHead>Regional</TableHead>
                <TableHead className="text-right">Objek Terisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspeksi.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.pelabuhan.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{i.pelabuhan.regional.nama}</TableCell>
                  <TableCell className="text-right tabular-nums">{i._count.catatan}</TableCell>
                  <TableCell>
                    <StatusInspeksiBadge status={i.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/inspeksi/${i.id}`}>
                        <Pencil className="size-3.5" /> Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {inspeksi.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    Tidak ada inspeksi pada periode ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
