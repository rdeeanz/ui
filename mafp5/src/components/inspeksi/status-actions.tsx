"use client"

import * as React from "react"
import { CheckCircle2, Send, Undo2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ubahStatusInspeksi } from "@/app/actions/inspeksi"

export function StatusActions({
  inspeksiId,
  status,
  canInput,
  canVerify,
}: {
  inspeksiId: string
  status: string
  canInput: boolean
  canVerify: boolean
}) {
  const [pending, startTransition] = React.useTransition()

  function run(aksi: "ajukan" | "verifikasi" | "kembalikan") {
    startTransition(async () => {
      const res = await ubahStatusInspeksi(inspeksiId, aksi)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canInput && status === "DRAFT" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("ajukan")}>
          <Send className="size-4" /> Ajukan Verifikasi
        </Button>
      )}
      {canVerify && status === "DIAJUKAN" && (
        <Button size="sm" disabled={pending} onClick={() => run("verifikasi")}>
          <CheckCircle2 className="size-4" /> Verifikasi
        </Button>
      )}
      {canVerify && status === "DIVERIFIKASI" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("kembalikan")}>
          <Undo2 className="size-4" /> Batalkan Verifikasi
        </Button>
      )}
    </div>
  )
}
