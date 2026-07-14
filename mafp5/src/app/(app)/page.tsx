import Link from "next/link"
import { Activity, Anchor, Building2, TriangleAlert } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { PeriodeSelect } from "@/components/periode-select"
import { StatCard } from "@/components/stat-card"
import { AvailabilityBadge } from "@/components/availability-badge"
import { TrendLine } from "@/components/charts/trend-line"
import { BarAvailability } from "@/components/charts/bar-availability"
import { KondisiDonut } from "@/components/charts/kondisi-donut"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { requireUser, analyticsScope } from "@/lib/rbac"
import {
  distribusiKondisi,
  getFasilitasAvailability,
  getPeriodeList,
  getTrenAvailability,
  groupByKategori,
  groupByRegional,
  labelPeriode,
  overallAvailability,
  resolvePeriode,
} from "@/lib/analytics"
import { formatAngka, formatPct } from "@/lib/availability"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>
}) {
  const user = await requireUser()
  const scope = analyticsScope(user)
  const sp = await searchParams
  const periode = await resolvePeriode(sp.periode)
  const periodes = await getPeriodeList()

  if (!periode) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <p className="text-muted-foreground">Belum ada periode data.</p>
      </div>
    )
  }

  const rows = await getFasilitasAvailability(periode.id, scope)
  const overall = overallAvailability(rows)
  const dist = distribusiKondisi(rows)
  const perRegional = groupByRegional(rows)
  const perKategori = groupByKategori(rows)
  const tren = await getTrenAvailability(scope)

  const jumlahPelabuhan = new Set(rows.map((r) => r.pelabuhanId)).size
  const jumlahObjek = rows.reduce((a, r) => a + r.jumlahObjek, 0)
  const kritis = rows
    .filter((r) => r.availability != null)
    .sort((a, b) => (a.availability ?? 0) - (b.availability ?? 0))
    .slice(0, 8)

  return (
    <div>
      <PageHeader
        title="Dashboard Availability"
        description={`Ringkasan kondisi fasilitas sipil · Periode ${labelPeriode(periode)}`}
      >
        <PeriodeSelect
          periodes={periodes.map((p) => ({ id: p.id, label: labelPeriode(p) }))}
          value={periode.id}
        />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Availability Keseluruhan"
          value={<AvailabilityBadge value={overall} showLabel className="text-base" />}
          hint="Rata-rata seluruh fasilitas dalam cakupan"
          icon={Activity}
        />
        <StatCard label="Jumlah Pelabuhan" value={formatAngka(jumlahPelabuhan)} icon={Anchor} />
        <StatCard label="Jumlah Fasilitas" value={formatAngka(rows.length)} icon={Building2} />
        <StatCard
          label="Fasilitas Kritis"
          value={formatAngka(dist.kritis)}
          hint={`${formatAngka(jumlahObjek)} objek terpantau`}
          icon={TriangleAlert}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tren Availability</CardTitle>
            <CardDescription>Perkembangan availability antar periode</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendLine data={tren.map((t) => ({ label: t.label, availability: t.availability }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribusi Kondisi</CardTitle>
            <CardDescription>Jumlah fasilitas per tingkat kondisi</CardDescription>
          </CardHeader>
          <CardContent>
            <KondisiDonut data={dist} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Legend color="var(--chart-2)" label={`Baik: ${dist.baik}`} />
              <Legend color="var(--chart-4)" label={`Perhatian: ${dist.perhatian}`} />
              <Legend color="var(--chart-5)" label={`Kritis: ${dist.kritis}`} />
              <Legend color="var(--muted-foreground)" label={`N/A: ${dist.na}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Availability per Regional</CardTitle>
            <CardDescription>Klik untuk detail regional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BarAvailability
              data={perRegional.map((g) => ({ nama: g.nama, availability: g.availability }))}
              height={Math.max(160, perRegional.length * 44)}
            />
            <div className="flex flex-wrap gap-2">
              {perRegional.map((g) => (
                <Link key={g.id} href={`/regional/${g.id}?periode=${periode.id}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                    {g.nama} · {formatPct(g.availability)}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability per Kategori Fasilitas</CardTitle>
            <CardDescription>Dermaga, lapangan, gudang, dll.</CardDescription>
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
          <CardTitle>Fasilitas Kondisi Kritis</CardTitle>
          <CardDescription>Availability terendah pada periode ini</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fasilitas</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Pelabuhan</TableHead>
                <TableHead className="text-right">Availability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kritis.map((r) => (
                <TableRow key={r.fasilitasId}>
                  <TableCell className="font-medium">{r.nama}</TableCell>
                  <TableCell className="text-muted-foreground">{r.kategoriNama}</TableCell>
                  <TableCell>
                    <Link
                      href={`/pelabuhan/${r.pelabuhanId}?periode=${periode.id}`}
                      className="hover:underline"
                    >
                      {r.pelabuhanNama}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <AvailabilityBadge value={r.availability} />
                  </TableCell>
                </TableRow>
              ))}
              {kritis.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center">
                    Tidak ada data.
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}
