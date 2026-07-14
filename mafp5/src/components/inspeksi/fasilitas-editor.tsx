"use client"

import * as React from "react"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AvailabilityBadge } from "@/components/availability-badge"
import { saveCatatanFasilitas } from "@/app/actions/inspeksi"
import { availabilityObjek, rataRata } from "@/lib/availability"

type Baris = {
  objekId: string
  nama: string
  satuan: string
  tersedia: number
  rusakRingan: number
  rusakSedang: number
  rusakBerat: number
  siapPakai: number
  keterangan: string
}

export function FasilitasEditor({
  inspeksiId,
  fasilitasId,
  locked,
  initial,
}: {
  inspeksiId: string
  fasilitasId: string
  locked: boolean
  initial: Baris[]
}) {
  const [rows, setRows] = React.useState<Baris[]>(initial)
  const [pending, startTransition] = React.useTransition()

  function update(objekId: string, field: keyof Baris, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.objekId === objekId
          ? { ...r, [field]: field === "keterangan" ? value : toNum(value) }
          : r
      )
    )
  }

  const fasAvail = rataRata(rows.map((r) => availabilityObjek(r.tersedia, r.siapPakai)))

  function errorFor(r: Baris): string | null {
    if (r.siapPakai > r.tersedia) return "Siap pakai > tersedia"
    if (r.rusakRingan + r.rusakSedang + r.rusakBerat > r.tersedia) return "Total rusak > tersedia"
    if ([r.tersedia, r.rusakRingan, r.rusakSedang, r.rusakBerat, r.siapPakai].some((v) => v < 0))
      return "Nilai negatif"
    return null
  }

  const hasError = rows.some((r) => errorFor(r) != null)

  function onSave() {
    startTransition(async () => {
      const res = await saveCatatanFasilitas({
        inspeksiId,
        fasilitasId,
        baris: rows.map((r) => ({
          objekId: r.objekId,
          tersedia: r.tersedia,
          rusakRingan: r.rusakRingan,
          rusakSedang: r.rusakSedang,
          rusakBerat: r.rusakBerat,
          siapPakai: r.siapPakai,
          keterangan: r.keterangan || null,
        })),
      })
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Availability fasilitas: <AvailabilityBadge value={fasAvail} />
        </div>
        {!locked && (
          <Button size="sm" onClick={onSave} disabled={pending || hasError}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Simpan
          </Button>
        )}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Objek</TableHead>
              <TableHead className="w-24">Tersedia</TableHead>
              <TableHead className="w-24">R. Ringan</TableHead>
              <TableHead className="w-24">R. Sedang</TableHead>
              <TableHead className="w-24">R. Berat</TableHead>
              <TableHead className="w-24">Siap Pakai</TableHead>
              <TableHead className="w-20 text-right">Avail.</TableHead>
              <TableHead className="min-w-[180px]">Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const err = errorFor(r)
              return (
                <TableRow key={r.objekId}>
                  <TableCell className="font-medium">
                    {r.nama}
                    <span className="text-muted-foreground ml-1 text-xs">({r.satuan})</span>
                    {err && <div className="text-destructive text-xs">{err}</div>}
                  </TableCell>
                  <TableCell>
                    <NumCell value={r.tersedia} disabled={locked} onChange={(v) => update(r.objekId, "tersedia", v)} />
                  </TableCell>
                  <TableCell>
                    <NumCell value={r.rusakRingan} disabled={locked} onChange={(v) => update(r.objekId, "rusakRingan", v)} />
                  </TableCell>
                  <TableCell>
                    <NumCell value={r.rusakSedang} disabled={locked} onChange={(v) => update(r.objekId, "rusakSedang", v)} />
                  </TableCell>
                  <TableCell>
                    <NumCell value={r.rusakBerat} disabled={locked} onChange={(v) => update(r.objekId, "rusakBerat", v)} />
                  </TableCell>
                  <TableCell>
                    <NumCell value={r.siapPakai} disabled={locked} onChange={(v) => update(r.objekId, "siapPakai", v)} invalid={!!err} />
                  </TableCell>
                  <TableCell className="text-right">
                    <AvailabilityBadge value={availabilityObjek(r.tersedia, r.siapPakai)} />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={r.keterangan}
                      disabled={locked}
                      onChange={(e) => update(r.objekId, "keterangan", e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function NumCell({
  value,
  onChange,
  disabled,
  invalid,
}: {
  value: number
  onChange: (v: string) => void
  disabled?: boolean
  invalid?: boolean
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={0}
      step="any"
      value={Number.isFinite(value) ? value : 0}
      disabled={disabled}
      aria-invalid={invalid}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 tabular-nums"
    />
  )
}

function toNum(v: string): number {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}
