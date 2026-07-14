"use client"

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const config: ChartConfig = {
  availability: { label: "Availability", color: "var(--chart-1)" },
}

function warna(v: number | null): string {
  if (v == null) return "var(--muted-foreground)"
  if (v >= 90) return "var(--chart-2)"
  if (v >= 70) return "var(--chart-4)"
  return "var(--chart-5)"
}

export function BarAvailability({
  data,
  height = 260,
}: {
  data: { nama: string; availability: number | null }[]
  height?: number
}) {
  const chartData = data.map((d) => ({ ...d, value: d.availability ?? 0 }))

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="nama"
          width={140}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(_v, _n, item) =>
                item?.payload?.availability == null ? "N/A" : `${Number(item.payload.availability).toFixed(2)}%`
              }
            />
          }
        />
        <Bar dataKey="value" radius={4}>
          {chartData.map((d, i) => (
            <Cell key={i} fill={warna(d.availability)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
