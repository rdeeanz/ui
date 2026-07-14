import { PageHeader } from "@/components/page-header"
import { TrendLine } from "@/components/charts/trend-line"
import { AvailabilityBadge } from "@/components/availability-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireUser, analyticsScope } from "@/lib/rbac"
import {
  getFasilitasAvailability,
  getPeriodeList,
  groupByRegional,
  labelPeriode,
  overallAvailability,
} from "@/lib/analytics"

export default async function HistoriPage() {
  const user = await requireUser()
  const scope = analyticsScope(user)
  const periodes = await getPeriodeList()

  // hitung availability per periode: nasional + per regional
  const perPeriode: {
    periodeId: string
    label: string
    overall: number | null
    regional: { id: string; nama: string; availability: number | null }[]
  }[] = []

  for (const p of periodes) {
    const rows = await getFasilitasAvailability(p.id, scope)
    perPeriode.push({
      periodeId: p.id,
      label: labelPeriode(p),
      overall: overallAvailability(rows),
      regional: groupByRegional(rows).map((g) => ({ id: g.id, nama: g.nama, availability: g.availability })),
    })
  }

  const regionalCols = perPeriode.length
    ? perPeriode[perPeriode.length - 1].regional
        .map((r) => ({ id: r.id, nama: r.nama }))
        .sort((a, b) => a.nama.localeCompare(b.nama))
    : []

  return (
    <div>
      <PageHeader
        title="Histori & Tren Availability"
        description="Perkembangan availability fasilitas antar periode monitoring"
      />

      <Card>
        <CardHeader>
          <CardTitle>Tren Availability Keseluruhan</CardTitle>
          <CardDescription>Rata-rata availability seluruh fasilitas dalam cakupan Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendLine data={perPeriode.map((p) => ({ label: p.label, availability: p.overall }))} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Matriks Availability per Periode</CardTitle>
          <CardDescription>Nilai availability (%) per regional tiap periode</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Nasional</TableHead>
                {regionalCols.map((r) => (
                  <TableHead key={r.id} className="text-right">
                    {r.nama}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...perPeriode].reverse().map((p) => (
                <TableRow key={p.periodeId}>
                  <TableCell className="font-medium">{p.label}</TableCell>
                  <TableCell className="text-right">
                    <AvailabilityBadge value={p.overall} />
                  </TableCell>
                  {regionalCols.map((rc) => {
                    const v = p.regional.find((r) => r.id === rc.id)?.availability ?? null
                    return (
                      <TableCell key={rc.id} className="text-right">
                        <AvailabilityBadge value={v} />
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
