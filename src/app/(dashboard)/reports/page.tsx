import Link from "next/link";
import DashboardCharts from "@/components/shared/DashboardCharts";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { InvoiceModel } from "@/models/invoice";
import { PaymentModel } from "@/models/payment";
import { ProductModel } from "@/models/product";
import { SiteHeader } from "@/components/site-header";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user?.businessId) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col justify-center px-8">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to view reports.</p>
      </div>
    );
  }

  await connectToDatabase();

  const businessId = session.user.businessId;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const [todayPaymentsAgg, monthPaymentsAgg, invoiceStats, lowStockCount, recentPayments] =
    await Promise.all([
      PaymentModel.aggregate([
        { $match: { businessId, isDeleted: false, paidAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      PaymentModel.aggregate([
        { $match: { businessId, isDeleted: false, paidAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Promise.all([
        InvoiceModel.countDocuments({ businessId, isDeleted: false }),
        InvoiceModel.countDocuments({ businessId, isDeleted: false, payableAmount: { $gt: 0 } }),
        InvoiceModel.countDocuments({ businessId, isDeleted: false, status: "overdue" }),
      ]),
      ProductModel.countDocuments({
        businessId,
        isDeleted: false,
        $expr: {
          $lte: [{ $ifNull: ["$stockQty", "$openingStock"] }, { $ifNull: ["$minStock", 0] }],
        },
      }),
      PaymentModel.aggregate([
        { $match: { businessId, isDeleted: false } },
        {
          $lookup: {
            from: "invoices",
            localField: "invoiceId",
            foreignField: "_id",
            as: "invoice",
          },
        },
        { $unwind: { path: "$invoice", preserveNullAndEmptyArrays: true } },
        { $sort: { paidAt: -1, createdAt: -1 } },
        { $limit: 8 },
        {
          $project: {
            amount: 1,
            method: 1,
            reference: 1,
            notes: 1,
            paidAt: 1,
            invoiceNumber: "$invoice.invoiceNumber",
            buyerName: "$invoice.buyerName",
            invoiceStatus: "$invoice.status",
          },
        },
      ]),
    ]);

  const [totalInvoices, openInvoices, overdueInvoices] = invoiceStats;
  const collectedToday = todayPaymentsAgg[0]?.total ?? 0;
  const collectedThisMonth = monthPaymentsAgg[0]?.total ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <SiteHeader />
                <div className="min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Analytics
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Reports</h1>
        <p className="text-sm text-slate-600">
          A finance and operations view across invoices, payments, and stock.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Collected today</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{currency.format(collectedToday)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Collected this month</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{currency.format(collectedThisMonth)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total invoices</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{totalInvoices}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Open invoices</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{openInvoices}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Low stock items</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{lowStockCount}</div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <DashboardCharts />
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-500">Status</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">Invoice health</div>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {overdueInvoices} overdue
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-600">Outstanding invoices</span>
              <span className="font-semibold text-slate-900">{openInvoices}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-600">Overdue invoices</span>
              <span className="font-semibold text-slate-900">{overdueInvoices}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-600">Low stock items</span>
              <span className="font-semibold text-slate-900">{lowStockCount}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Recent activity</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Latest payments</h2>
          </div>
          <Link href="/payments" className="text-sm font-semibold text-slate-900 underline-offset-4 hover:underline">
            View all payments
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Paid at</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((payment) => (
                <tr key={payment._id?.toString?.() ?? `${payment.invoiceNumber}-${payment.paidAt}`} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {payment.invoiceNumber ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{payment.buyerName ?? "-"}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{currency.format(payment.amount ?? 0)}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{String(payment.method ?? "-").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(payment.paidAt)}</td>
                </tr>
              ))}
              {recentPayments.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
    </div>
    </div>
  );
}