"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ParamSelect({
  param,
  value,
  options,
  placeholder,
  className,
  ariaLabel,
}: {
  param: string
  value: string
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
  ariaLabel?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(param, next)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "w-[200px]"} aria-label={ariaLabel ?? param}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
