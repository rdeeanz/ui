import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { PeriodeSelect } from "@/components/periode-select"
import { StatCard } from "@/components/stat-card"
import { AvailabilityBadge } from "@/components/availability-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/rbac"
import {
  getDetailPelabuhan,
  getPeriodeList,
  labelPeriode,
  resolvePeriode,
} from "@/lib/analytics"
import { formatAngka, formatPct, rataRata } from "@/lib/availability"

export default async function PelabuhanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ periode?: string }>
}) {
  await requireUser()
  const { id } = await params
  const sp = await searchParams

  const pelabuhan = await prisma.pelabuhan.findUnique({
    where: { id },
    include: { regional: true },
  })
  if (!pelabuhan) notFound()

  const periode = await resolvePeriode(sp.periode)
  const periodes = await getPeriodeList()
  if (!periode) notFound()

  const detail = await getDetailPelabuhan(id, periode.id)
  const overall = rataRata(detail.map((k) => k.availability))
  const jumlahFasilitas = detail.reduce((a, k) => a + k.fasilitas.length, 0)
  const jumlahObjek = detail.reduce((a, k) => a + k.fasilitas.reduce((b, f) => b + f.objek.length, 0), 0)

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href={`/regional/${pelabuhan.regionalId}?periode=${periode.id}`}>
          <ChevronLeft className="size-4" /> {pelabuhan.regional.nama}
        </Link>
      </Button>
      <PageHeader
        title={`Pelabuhan ${pelabuhan.nama}`}
        description={`${pelabuhan.regional.nama} · Periode ${labelPeriode(periode)}${
          pelabuhan.operatorDefault ? ` · Operator ${pelabuhan.operatorDefault}` : ""
        }`}
      >
        <PeriodeSelect
          periodes={periodes.map((p) => ({ id: p.id, label: labelPeriode(p) }))}
          value={periode.id}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Availability Pelabuhan" value={<AvailabilityBadge value={overall} showLabel />} />
        <StatCard label="Jumlah Fasilitas" value={formatAngka(jumlahFasilitas)} />
        <StatCard label="Jumlah Objek" value={formatAngka(jumlahObjek)} />
      </div>

      <div className="mt-4 space-y-4">
        {detail.map((kat) => (
          <Card key={kat.kategoriId}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {kat.nama}
                <Badge variant="outline">{kat.fasilitas.length} fasilitas</Badge>
              </CardTitle>
              <AvailabilityBadge value={kat.availability} showLabel />
            </CardHeader>
            <CardContent className="space-y-6">
              {kat.fasilitas.map((fas) => (
                <div key={fas.fasilitasId}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-medium">{fas.nama}</span>
                    {fas.konstruksi && (
                      <Badge variant="secondary" className="font-normal">
                        {fas.konstruksi}
                      </Badge>
                    )}
                    {fas.operator && (
                      <Badge variant="outline" className="font-normal">
                        {fas.operator}
                      </Badge>
                    )}
                    <span className="ml-auto">
                      <AvailabilityBadge value={fas.availability} />
                    </span>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Objek</TableHead>
                          <TableHead className="text-right">Tersedia</TableHead>
                          <TableHead className="text-right">R. Ringan</TableHead>
                          <TableHead className="text-right">R. Sedang</TableHead>
                          <TableHead className="text-right">R. Berat</TableHead>
                          <TableHead className="text-right">Siap Pakai</TableHead>
                          <TableHead className="text-right">Avail.</TableHead>
                          <TableHead>Keterangan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fas.objek.map((o) => (
                          <TableRow key={o.objekId}>
                            <TableCell className="font-medium">
                              {o.nama}
                              <span className="text-muted-foreground ml-1 text-xs">({o.satuan})</span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatAngka(o.tersedia, 2)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatAngka(o.rusakRingan, 2)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatAngka(o.rusakSedang, 2)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatAngka(o.rusakBerat, 2)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatAngka(o.siapPakai, 2)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatPct(o.availability)}</TableCell>
                            <TableCell className="text-muted-foreground max-w-[220px] truncate text-xs">
                              {o.keterangan}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
