import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { MasterManager } from "@/components/master/master-manager"
import { ImportDialog } from "@/components/master/import-dialog"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/rbac"
import { simpanKategori, simpanPelabuhan, simpanRegional } from "@/app/actions/master"

export default async function MasterPage() {
  await requireRole(["ADMIN"])

  const [regionals, pelabuhan, kategori] = await Promise.all([
    prisma.regional.findMany({ orderBy: { nama: "asc" }, include: { _count: { select: { pelabuhan: true } } } }),
    prisma.pelabuhan.findMany({ orderBy: { nama: "asc" }, include: { regional: true, _count: { select: { fasilitas: true } } } }),
    prisma.kategoriFasilitas.findMany({ orderBy: { urutan: "asc" }, include: { _count: { select: { fasilitas: true } } } }),
  ])

  const regionalOptions = regionals.map((r) => ({ value: r.id, label: r.nama }))

  return (
    <div>
      <PageHeader title="Master Data" description="Kelola regional, pelabuhan, dan kategori fasilitas">
        <ImportDialog />
      </PageHeader>

      <Tabs defaultValue="regional">
        <TabsList>
          <TabsTrigger value="regional">Regional</TabsTrigger>
          <TabsTrigger value="pelabuhan">Pelabuhan</TabsTrigger>
          <TabsTrigger value="kategori">Kategori Fasilitas</TabsTrigger>
        </TabsList>

        <TabsContent value="regional">
          <Card>
            <CardContent className="pt-6">
              <MasterManager
                title="Regional"
                entitas="regional"
                saveAction={simpanRegional}
                columns={[
                  { key: "kode", label: "Kode" },
                  { key: "nama", label: "Nama" },
                  { key: "jumlah", label: "Jumlah Pelabuhan" },
                ]}
                fields={[
                  { name: "kode", label: "Kode", type: "text", required: true },
                  { name: "nama", label: "Nama", type: "text", required: true },
                ]}
                rows={regionals.map((r) => ({
                  id: r.id,
                  values: { kode: r.kode, nama: r.nama, jumlah: r._count.pelabuhan },
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pelabuhan">
          <Card>
            <CardContent className="pt-6">
              <MasterManager
                title="Pelabuhan"
                entitas="pelabuhan"
                saveAction={simpanPelabuhan}
                columns={[
                  { key: "nama", label: "Nama" },
                  { key: "regional", label: "Regional" },
                  { key: "operatorDefault", label: "Operator" },
                  { key: "jumlah", label: "Jumlah Fasilitas" },
                ]}
                fields={[
                  { name: "nama", label: "Nama", type: "text", required: true },
                  { name: "regionalId", label: "Regional", type: "select", options: regionalOptions, required: true },
                  { name: "operatorDefault", label: "Operator", type: "text" },
                ]}
                rows={pelabuhan.map((p) => ({
                  id: p.id,
                  values: {
                    nama: p.nama,
                    regional: p.regional.nama,
                    regionalId: p.regionalId,
                    operatorDefault: p.operatorDefault,
                    jumlah: p._count.fasilitas,
                  },
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kategori">
          <Card>
            <CardContent className="pt-6">
              <MasterManager
                title="Kategori"
                entitas="kategori"
                saveAction={simpanKategori}
                columns={[
                  { key: "urutan", label: "Urutan" },
                  { key: "nama", label: "Nama" },
                  { key: "jumlah", label: "Jumlah Fasilitas" },
                ]}
                fields={[
                  { name: "nama", label: "Nama", type: "text", required: true },
                  { name: "urutan", label: "Urutan", type: "number" },
                ]}
                rows={kategori.map((k) => ({
                  id: k.id,
                  values: { urutan: k.urutan, nama: k.nama, jumlah: k._count.fasilitas },
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
