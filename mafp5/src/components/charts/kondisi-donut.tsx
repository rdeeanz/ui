"use client"

import { Label, Pie, PieChart } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const config: ChartConfig = {
  baik: { label: "Baik (≥90%)", color: "var(--chart-2)" },
  perhatian: { label: "Perhatian (70-89%)", color: "var(--chart-4)" },
  kritis: { label: "Kritis (<70%)", color: "var(--chart-5)" },
  na: { label: "N/A", color: "var(--muted-foreground)" },
}

export function KondisiDonut({
  data,
}: {
  data: { baik: number; perhatian: number; kritis: number; na: number }
}) {
  const chartData = [
    { key: "baik", value: data.baik, fill: "var(--chart-2)" },
    { key: "perhatian", value: data.perhatian, fill: "var(--chart-4)" },
    { key: "kritis", value: data.kritis, fill: "var(--chart-5)" },
    { key: "na", value: data.na, fill: "var(--muted-foreground)" },
  ].filter((d) => d.value > 0)

  const total = data.baik + data.perhatian + data.kritis + data.na

  return (
    <ChartContainer config={config} className="mx-auto aspect-square max-h-[240px]">
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent hideLabel formatter={(v, n) => `${config[n as string]?.label ?? n}: ${v}`} />}
        />
        <Pie data={chartData} dataKey="value" nameKey="key" innerRadius={60} strokeWidth={4}>
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                      {total}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs">
                      Fasilitas
                    </tspan>
                  </text>
                )
              }
              return null
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
