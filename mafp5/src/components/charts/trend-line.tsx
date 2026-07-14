"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const config: ChartConfig = {
  availability: { label: "Availability", color: "var(--chart-1)" },
}

export function TrendLine({
  data,
}: {
  data: { label: string; availability: number | null }[]
}) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          width={36}
          tickFormatter={(v) => `${v}%`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(v) => (v == null ? "N/A" : `${Number(v).toFixed(2)}%`)}
            />
          }
        />
        <Line
          dataKey="availability"
          type="monotone"
          stroke="var(--color-availability)"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  )
}
