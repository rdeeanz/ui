import { NextResponse, type NextRequest } from "next/server"
import ExcelJS from "exceljs"

import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRekapRegional } from "@/lib/analytics"

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]

function pct(v: number | null): number | string {
  return v == null ? "N/A" : Math.round(v * 100) / 100
}

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 })

  const regionalId = req.nextUrl.searchParams.get("regional")
  const periodeId = req.nextUrl.searchParams.get("periode")
  if (!regionalId || !periodeId) {
    return NextResponse.json({ error: "Parameter regional & periode wajib" }, { status: 400 })
  }

  const rekap = await getRekapRegional(regionalId, periodeId)

  const wb = new ExcelJS.Workbook()
  wb.creator = "Monitoring Availability Fasilitas - Pelindo"
  const ws = wb.addWorksheet("Rekap Regional")
  ws.columns = [
    { width: 6 },
    { width: 42 },
    { width: 28 },
    { width: 18 },
  ]

  const titleStyle = { bold: true, size: 12 } as const
  ws.mergeCells("A1:D1")
  ws.getCell("A1").value = "REKAPITULASI LAPORAN AVAILABILITY"
  ws.getCell("A1").font = titleStyle
  ws.getCell("A1").alignment = { horizontal: "center" }
  ws.mergeCells("A2:D2")
  ws.getCell("A2").value = `PT PELABUHAN INDONESIA (PERSERO) ${rekap.regionalNama}`
  ws.getCell("A2").font = { bold: true }
  ws.getCell("A2").alignment = { horizontal: "center" }
  ws.mergeCells("A3:D3")
  ws.getCell("A3").value = `PERIODE ${rekap.periodeLabel}`
  ws.getCell("A3").alignment = { horizontal: "center" }

  const headerRow = ws.addRow(["No.", "Fasilitas", "Lokasi", "Availability (%)"])
  headerRow.eachCell((cell) => {
    cell.font = { bold: true }
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }
    cell.border = allBorders()
  })

  rekap.kategori.forEach((kat, i) => {
    const sec = ws.addRow([ROMAN[i] ?? String(i + 1), kat.nama.toUpperCase(), "", ""])
    sec.getCell(1).font = { bold: true }
    sec.getCell(2).font = { bold: true }
    sec.eachCell((c) => (c.border = allBorders()))

    kat.rows.forEach((r, idx) => {
      const row = ws.addRow([idx + 1, `${kat.nama} Pelabuhan ${r.pelabuhanNama}`, r.pelabuhanNama, pct(r.availability)])
      row.getCell(4).alignment = { horizontal: "right" }
      row.eachCell((c) => (c.border = allBorders()))
    })

    const sub = ws.addRow(["", `Availability ${kat.nama}`, "", pct(kat.subtotal)])
    sub.font = { bold: true }
    sub.getCell(4).alignment = { horizontal: "right" }
    sub.eachCell((c) => {
      c.border = allBorders()
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
    })
  })

  const total = ws.addRow(["", `Availability Fasilitas Pelabuhan ${rekap.regionalNama}`, "", pct(rekap.total)])
  total.font = { bold: true }
  total.getCell(4).alignment = { horizontal: "right" }
  total.eachCell((c) => {
    c.border = allBorders()
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } }
  })

  await prisma.auditLog.create({
    data: { userId: user.id, aksi: "EXPORT", entitas: "RekapRegional", entitasId: regionalId, detail: `Periode ${rekap.periodeLabel}` },
  })

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `Rekap-${rekap.regionalNama.replace(/\s+/g, "-")}-${rekap.periodeLabel.replace(/\s+/g, "-")}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

function allBorders(): Partial<ExcelJS.Borders> {
  const s = { style: "thin" as const, color: { argb: "FFCBD5E1" } }
  return { top: s, left: s, bottom: s, right: s }
}
