"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const data = [
  { date: "Jan 1", orders: 32 },
  { date: "Jan 5", orders: 45 },
  { date: "Jan 10", orders: 28 },
  { date: "Jan 15", orders: 67 },
  { date: "Jan 20", orders: 52 },
  { date: "Jan 25", orders: 73 },
  { date: "Feb 1", orders: 41 },
  { date: "Feb 5", orders: 85 },
  { date: "Feb 10", orders: 62 },
  { date: "Feb 15", orders: 48 },
  { date: "Feb 20", orders: 91 },
  { date: "Feb 25", orders: 78 },
]

function ChartSkeleton() {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}

export function OrderChart() {
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const res = await fetch("/api/shopee/dashboard/stats")
        const json = await res.json()
        if (json.chartData) {
          setChartData(json.chartData)
        }
      } catch (err) {
        console.error("Failed to fetch chart data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()

    // Refresh when sync completes
    const handleSync = () => fetchChartData()
    window.addEventListener("shopee:sync-complete", handleSync)
    return () => window.removeEventListener("shopee:sync-complete", handleSync)
  }, [])

  if (loading) return <ChartSkeleton />

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          Order Volume Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "hsl(215 14% 46%)" }}
                axisLine={{ stroke: "hsl(214 20% 90%)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(215 14% 46%)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0 0% 100%)",
                  border: "1px solid hsl(214 20% 90%)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="hsl(172 66% 30%)"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(172 66% 30%)" }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
