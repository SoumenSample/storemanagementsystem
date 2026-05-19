import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { PaymentModel } from "@/models/payment"

const RANGE_DAYS = {
  "7d": 7,
  "15d": 15,
  "30d": 30,
} as const

type RangeKey = keyof typeof RANGE_DAYS

function getRangeKey(value: string | null): RangeKey {
  if (value === "7d" || value === "15d" || value === "30d") {
    return value
  }

  return "30d"
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function toDayKey(date: Date) {
  return date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  })
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const range = getRangeKey(url.searchParams.get("range"))
  const days = RANGE_DAYS[range]

  await connectToDatabase()

  const endDate = startOfDay(new Date())
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - (days - 1))

  const seriesAgg = await PaymentModel.aggregate([
    {
      $match: {
        businessId: session.user.businessId,
        isDeleted: false,
        paidAt: { $gte: startDate, $lte: new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1) },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: "Asia/Kolkata" } },
        total: { $sum: "$amount" },
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        total: 1,
      },
    },
    { $sort: { date: 1 } },
  ])

  const seriesMap = new Map<string, number>()
  seriesAgg.forEach((entry) => {
    const key = String(entry.date)
    seriesMap.set(key, entry.total ?? 0)
  })

  const series = Array.from({ length: days }, (_, index) => {
    const current = new Date(startDate)
    current.setDate(startDate.getDate() + index)
    const key = toDayKey(current)

    return {
      date: key,
      total: seriesMap.get(key) ?? 0,
    }
  })

  const totalRevenue = series.reduce((sum, item) => sum + item.total, 0)

  return NextResponse.json({
    range,
    totalRevenue,
    series,
  })
}