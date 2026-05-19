import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/db"
import { InvoiceModel } from "@/models/invoice"
import { PaymentModel } from "@/models/payment"
import { ProductModel } from "@/models/product"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertTriangle,
  BadgeIndianRupee,
  FileText,
  PackageX,
} from "lucide-react"

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat("en-IN")

export async function SectionCards() {
  const session = await auth()

  if (!session?.user?.businessId) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {currency.format(0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Low Stock Alert</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {numberFormatter.format(0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Invoices</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {numberFormatter.format(0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Unpaid / Outstanding</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {numberFormatter.format(0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  await connectToDatabase()

  const businessId = session.user.businessId
  const [revenueAgg, lowStockCount, totalInvoices, outstandingInvoices] = await Promise.all([
    PaymentModel.aggregate([
      { $match: { businessId, isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ProductModel.countDocuments({
      businessId,
      isDeleted: false,
      $expr: {
        $lte: [{ $ifNull: ["$stockQty", "$openingStock"] }, { $ifNull: ["$minStock", 0] }],
      },
    }),
    InvoiceModel.countDocuments({ businessId, isDeleted: false }),
    InvoiceModel.countDocuments({
      businessId,
      isDeleted: false,
      payableAmount: { $gt: 0 },
      status: { $in: ["draft", "sent", "partially_paid", "overdue"] },
    }),
  ])

  const totalRevenue = revenueAgg[0]?.total ?? 0

  const metrics = [
    {
      title: "Total Revenue",
      value: currency.format(totalRevenue),
      badge: "Collected",
      footer: "Total payment collected",
      subfooter: "Summed from all non-deleted payments",
      icon: BadgeIndianRupee,
    },
    {
      title: "Low Stock Alert",
      value: numberFormatter.format(lowStockCount),
      badge: "Inventory watch",
      footer: "Products at or below minimum stock",
      subfooter: "Alert threshold is based on each product's min stock",
      icon: PackageX,
    },
    {
      title: "Total Invoices",
      value: numberFormatter.format(totalInvoices),
      badge: "All records",
      footer: "Invoices created so far",
      subfooter: "Includes every non-deleted invoice",
      icon: FileText,
    },
    {
      title: "Unpaid / Outstanding",
      value: numberFormatter.format(outstandingInvoices),
      badge: "Receivables due",
      footer: "Invoices still waiting on payment",
      // subfooter: "Counts invoices with a remaining payable balance",
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {metrics.map((metric) => {
        const Icon = metric.icon

        return (
          <Card key={metric.title} className="@container/card">
            <CardHeader>
              <CardDescription>{metric.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {metric.value}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <Icon className="size-4" />
                  {metric.badge}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {metric.footer} <Icon className="size-4" />
              </div>
              {/* <div className="text-muted-foreground">{metric.subfooter}</div> */}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
