import { Badge } from "@/components/ui/badge"

const MAP: Record<string, { label: string; variant: "secondary" | "warning" | "success" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  DIAJUKAN: { label: "Diajukan", variant: "warning" },
  DIVERIFIKASI: { label: "Diverifikasi", variant: "success" },
}

export function StatusInspeksiBadge({ status }: { status: string }) {
  const s = MAP[status] ?? MAP.DRAFT
  return <Badge variant={s.variant}>{s.label}</Badge>
}
