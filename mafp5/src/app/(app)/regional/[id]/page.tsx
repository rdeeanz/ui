import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { PeriodeSelect } from "@/components/periode-select"
import { StatCard } from "@/components/stat-card"
import { AvailabilityBadge } from "@/components/availability-badge"
import { BarAvailability } from "@/components/charts/bar-availability"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import { requireUser, analyticsScope } from "@/lib/rbac"
import {
  getFasilitasAvailability,
  getPeriodeList,
  groupByKategori,
  groupByPelabuhan,
  labelPeriode,
  overallAvailability,
  resolvePeriode,
} from "@/lib/analytics"
import { formatAngka } from "@/lib/availability"

export default async function RegionalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ periode?: string }>
}) {
  await requireUser()
  const { id } = await params
  const sp = await searchParams

  const regional = await prisma.regional.findUnique({ where: { id } })
  if (!regional) notFound()

  const periode = await resolvePeriode(sp.periode)
  const periodes = await getPeriodeList()
  if (!periode) notFound()

  const rows = await getFasilitasAvailability(periode.id, { regionalId: id })
  const overall = overallAvailability(rows)
  const perPelabuhan = groupByPelabuhan(rows)
  const perKategori = groupByKategori(rows)
  const jumlahPelabuhan = new Set(rows.map((r) => r.pelabuhanId)).size

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href={`/?periode=${periode.id}`}>
          <ChevronLeft className="size-4" /> Dashboard
        </Link>
      </Button>
      <PageHeader
        title={regional.nama}
        description={`Rekap availability regional · Periode ${labelPeriode(periode)}`}
      >
        <PeriodeSelect
          periodes={periodes.map((p) => ({ id: p.id, label: labelPeriode(p) }))}
          value={periode.id}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Availability Regional" value={<AvailabilityBadge value={overall} showLabel />} />
        <StatCard label="Jumlah Pelabuhan" value={formatAngka(jumlahPelabuhan)} />
        <StatCard label="Jumlah Fasilitas" value={formatAngka(rows.length)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Availability per Pelabuhan</CardTitle>
          </CardHeader>
          <CardContent>
            <BarAvailability
              data={perPelabuhan.map((g) => ({ nama: g.nama, availability: g.availability }))}
              height={Math.max(160, perPelabuhan.length * 34)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Availability per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <BarAvailability
              data={perKategori.map((g) => ({ nama: g.nama, availability: g.availability }))}
              height={Math.max(160, perKategori.length * 40)}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Daftar Pelabuhan</CardTitle>
          <CardDescription>Klik pelabuhan untuk detail fasilitas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pelabuhan</TableHead>
                <TableHead className="text-right">Jumlah Fasilitas</TableHead>
                <TableHead className="text-right">Availability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perPelabuhan
                .sort((a, b) => (a.availability ?? 0) - (b.availability ?? 0))
                .map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      <Link href={`/pelabuhan/${g.id}?periode=${periode.id}`} className="hover:underline">
                        {g.nama}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{formatAngka(g.jumlahFasilitas)}</TableCell>
                    <TableCell className="text-right">
                      <AvailabilityBadge value={g.availability} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
