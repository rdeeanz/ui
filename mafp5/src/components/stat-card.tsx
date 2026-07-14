import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon?: LucideIcon
  className?: string
}) {
  return (
    <Card className={cn("py-4", className)}>
      <CardContent className="px-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">{label}</span>
          {Icon && <Icon className="text-muted-foreground size-4" />}
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  )
}
