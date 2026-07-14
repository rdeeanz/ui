import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatPct, tingkatKondisi, LABEL_KONDISI } from "@/lib/availability"

export function AvailabilityBadge({
  value,
  showLabel = false,
  className,
}: {
  value: number | null
  showLabel?: boolean
  className?: string
}) {
  const t = tingkatKondisi(value)
  const variant =
    t === "baik" ? "success" : t === "perhatian" ? "warning" : t === "kritis" ? "destructive" : "outline"

  return (
    <Badge variant={variant} className={cn("tabular-nums", className)}>
      {formatPct(value)}
      {showLabel && t ? ` · ${LABEL_KONDISI[t]}` : ""}
    </Badge>
  )
}
