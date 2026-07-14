import { Download } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { ParamSelect } from "@/components/param-select"
import { AvailabilityBadge } from "@/components/availability-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { prisma } from "@/lib/prisma"
import { requireUser, analyticsScope } from "@/lib/rbac"
import { getPeriodeList, getRekapRegional, labelPeriode, resolvePeriode } from "@/lib/analytics"
import { formatPct } from "@/lib/availability"

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]

export default async function RekapPage({
  searchParams,
}: {
  searchParams: Promise<{ regional?: string; periode?: string }>
}) {
  const user = await requireUser()
  const scope = analyticsScope(user)
  const sp = await searchParams

  const regionals = await prisma.regional.findMany({
    where: scope.regionalId ? { id: scope.regionalId } : {},
    orderBy: { nama: "asc" },
  })
  const periodes = await getPeriodeList()
  const periode = await resolvePeriode(sp.periode)

  const regionalId = sp.regional && regionals.some((r) => r.id === sp.regional) ? sp.regional : regionals[0]?.id

  if (!regionalId || !periode) {
    return (
      <div>
        <PageHeader title="Rekapitulasi" />
        <p className="text-muted-foreground">Data belum tersedia.</p>
      </div>
    )
  }

  const rekap = await getRekapRegional(regionalId, periode.id)

  return (
    <div>
      <PageHeader
        title="Rekapitulasi Availability"
        description="Rekap availability fasilitas per regional dan periode"
      >
        <ParamSelect
          param="regional"
          value={regionalId}
          options={regionals.map((r) => ({ value: r.id, label: r.nama }))}
          ariaLabel="Pilih regional"
        />
        <ParamSelect
          param="periode"
          value={periode.id}
          options={periodes.map((p) => ({ value: p.id, label: labelPeriode(p) }))}
          className="w-[160px]"
          ariaLabel="Pilih periode"
        />
        <Button asChild>
          <a href={`/api/export/rekap?regional=${regionalId}&periode=${periode.id}`}>
            <Download className="size-4" /> Export Excel
          </a>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>REKAPITULASI LAPORAN AVAILABILITY</CardTitle>
          <CardDescription>
            PT PELABUHAN INDONESIA (PERSERO) {rekap.regionalNama} · Periode {rekap.periodeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No.</TableHead>
                <TableHead>Fasilitas</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead className="text-right">Availability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rekap.kategori.map((kat, i) => (
                <RekapSection key={kat.kategoriId} kat={kat} roman={ROMAN[i] ?? String(i + 1)} />
              ))}
              <TableRow className="bg-primary/5 font-semibold">
                <TableCell />
                <TableCell colSpan={2}>
                  Availability Fasilitas Pelabuhan {rekap.regionalNama}
                </TableCell>
                <TableCell className="text-right">
                  <AvailabilityBadge value={rekap.total} showLabel />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function RekapSection({
  kat,
  roman,
}: {
  kat: Awaited<ReturnType<typeof getRekapRegional>>["kategori"][number]
  roman: string
}) {
  return (
    <>
      <TableRow className="bg-muted/50">
        <TableCell className="font-bold">{roman}</TableCell>
        <TableCell className="font-bold" colSpan={3}>
          {kat.nama.toUpperCase()}
        </TableCell>
      </TableRow>
      {kat.rows.map((r, idx) => (
        <TableRow key={r.pelabuhanId}>
          <TableCell>{idx + 1}</TableCell>
          <TableCell>
            {kat.nama} Pelabuhan {r.pelabuhanNama}
          </TableCell>
          <TableCell className="text-muted-foreground">{r.pelabuhanNama}</TableCell>
          <TableCell className="text-right tabular-nums">{formatPct(r.availability)}</TableCell>
        </TableRow>
      ))}
      <TableRow className="font-medium">
        <TableCell />
        <TableCell colSpan={2}>Availability {kat.nama}</TableCell>
        <TableCell className="text-right">
          <AvailabilityBadge value={kat.subtotal} />
        </TableCell>
      </TableRow>
    </>
  )
}
