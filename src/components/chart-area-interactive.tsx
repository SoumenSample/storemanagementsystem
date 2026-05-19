"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

const chartConfig = {
  revenue: {
    label: "Revenue collected",
    color: "var(--primary)",
  },
} satisfies ChartConfig

type RevenuePoint = {
  date: string
  total: number
}

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")
  const [data, setData] = React.useState<RevenuePoint[]>([])
  const [totalRevenue, setTotalRevenue] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  React.useEffect(() => {
    const controller = new AbortController()

    async function loadRevenue() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/dashboard/revenue?range=${timeRange}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Failed to load revenue chart")
        }

        const result = await response.json()
        setData(result.series ?? [])
        setTotalRevenue(result.totalRevenue ?? 0)
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") {
          setError("Unable to load revenue data.")
          setData([])
        }
      } finally {
        setLoading(false)
      }
    }

    loadRevenue()

    return () => controller.abort()
  }, [timeRange])

  const totalLabel = React.useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(totalRevenue),
    [totalRevenue]
  )

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Revenue Collected</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Total revenue collected for the selected range, including today
          </span>
          <span className="@[540px]/card:hidden">Revenue collected</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
            <ToggleGroupItem value="15d">Last 15 days</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a revenue range"
            >
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
              <SelectItem value="15d" className="rounded-lg">
                Last 15 days
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                  Last 30 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Loading revenue chart...
          </div>
        ) : error ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-destructive">
            {error}
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={data}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    formatter={(value) => {
                      const amount = Number(value ?? 0)
                      return (
                        <div className="ml-auto font-medium tabular-nums text-foreground">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 2,
                          }).format(amount)}
                        </div>
                      )
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="total"
                type="natural"
                fill="url(#fillRevenue)"
                stroke="var(--color-revenue)"
              />
            </AreaChart>
          </ChartContainer>
        )}
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>{timeRange === "7d" ? "Last 7 days" : timeRange === "15d" ? "Last 15 days" : "Last 30 days"}</span>
          <span className="font-medium text-foreground">{totalLabel}</span>
        </div>
      </CardContent>
    </Card>
  )
}
