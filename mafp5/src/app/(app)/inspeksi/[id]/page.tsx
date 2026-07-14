import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { StatusInspeksiBadge } from "@/components/status-inspeksi-badge"
import { StatusActions } from "@/components/inspeksi/status-actions"
import { FasilitasEditor } from "@/components/inspeksi/fasilitas-editor"
import { AvailabilityBadge } from "@/components/availability-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/prisma"
import { requireRole, can } from "@/lib/rbac"
import { getDetailPelabuhan, labelPeriode } from "@/lib/analytics"

export default async function InspeksiEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireRole(["ADMIN", "PETUGAS", "PIC_REGIONAL"])
  const { id } = await params

  const inspeksi = await prisma.inspeksi.findUnique({
    where: { id },
    include: { pelabuhan: { include: { regional: true } }, periode: true },
  })
  if (!inspeksi) notFound()

  const detail = await getDetailPelabuhan(inspeksi.pelabuhanId, inspeksi.periodeId)
  const locked = inspeksi.status === "DIVERIFIKASI" && user.role !== "ADMIN"

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/inspeksi">
          <ChevronLeft className="size-4" /> Daftar Inspeksi
        </Link>
      </Button>
      <PageHeader
        title={`Inspeksi ${inspeksi.pelabuhan.nama}`}
        description={`${inspeksi.pelabuhan.regional.nama} · Periode ${labelPeriode(inspeksi.periode)}`}
      >
        <StatusInspeksiBadge status={inspeksi.status} />
        <StatusActions
          inspeksiId={inspeksi.id}
          status={inspeksi.status}
          canInput={can.inputInspeksi(user.role)}
          canVerify={can.verifikasi(user.role)}
        />
      </PageHeader>

      {locked && (
        <div className="bg-muted text-muted-foreground mb-4 rounded-md border p-3 text-sm">
          Inspeksi sudah diverifikasi dan terkunci. Hanya Administrator yang dapat mengubah.
        </div>
      )}

      <div className="space-y-4">
        {detail.map((kat) => (
          <Card key={kat.kategoriId}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {kat.nama}
                <Badge variant="outline">{kat.fasilitas.length} fasilitas</Badge>
              </CardTitle>
              <AvailabilityBadge value={kat.availability} showLabel />
            </CardHeader>
            <CardContent className="space-y-8">
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
                  </div>
                  <FasilitasEditor
                    inspeksiId={inspeksi.id}
                    fasilitasId={fas.fasilitasId}
                    locked={locked}
                    initial={fas.objek.map((o) => ({
                      objekId: o.objekId,
                      nama: o.nama,
                      satuan: o.satuan,
                      tersedia: o.tersedia,
                      rusakRingan: o.rusakRingan,
                      rusakSedang: o.rusakSedang,
                      rusakBerat: o.rusakBerat,
                      siapPakai: o.siapPakai,
                      keterangan: o.keterangan ?? "",
                    }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
