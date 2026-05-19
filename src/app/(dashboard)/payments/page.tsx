import Link from "next/link";
import { requireCashierAccess } from "@/lib/access";
import { connectToDatabase } from "@/lib/db";
import { PaymentModel } from "@/models/payment";
import { SiteHeader } from "@/components/site-header";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

type PaymentsPageProps = {
  searchParams?: Promise<{
    page?: string;
    search?: string;
  }>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const access = await requireCashierAccess();

  if (access.error) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col justify-center px-8">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Payments</h1>
        <p className="mt-2 text-sm text-slate-600">Access denied. Payments are available to cashiers and owners.</p>
      </div>
    );
  }

  await connectToDatabase();

  const businessId = access.session.user.businessId;
  const pageSize = 20;
  const resolvedSearchParams = (await searchParams) ?? {};
  const page = Math.max(1, Number(resolvedSearchParams.page ?? "1") || 1);
  const search = (resolvedSearchParams.search ?? "").trim();

  const baseMatch: Record<string, unknown> = {
    businessId,
    isDeleted: false,
  };

  const searchMatch = search
    ? {
        $or: [
          { reference: { $regex: search, $options: "i" } },
          { method: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
          { "invoice.invoiceNumber": { $regex: search, $options: "i" } },
          { "invoice.buyerName": { $regex: search, $options: "i" } },
        ],
      }
    : null;

  const pipeline = [
    { $match: baseMatch },
    {
      $lookup: {
        from: "invoices",
        localField: "invoiceId",
        foreignField: "_id",
        as: "invoice",
      },
    },
    { $unwind: { path: "$invoice", preserveNullAndEmptyArrays: true } },
    ...(searchMatch ? [{ $match: searchMatch }] : []),
  ];

  const [items, totalResult, totalCollectedAgg, todayCollectedAgg] = await Promise.all([
    PaymentModel.aggregate([
      ...pipeline,
      { $sort: { paidAt: -1, createdAt: -1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
      {
        $project: {
          amount: 1,
          method: 1,
          reference: 1,
          notes: 1,
          paidAt: 1,
          invoiceId: 1,
          invoiceNumber: "$invoice.invoiceNumber",
          buyerName: "$invoice.buyerName",
          invoiceStatus: "$invoice.status",
          invoicePayableAmount: "$invoice.payableAmount",
        },
      },
    ]),
    PaymentModel.aggregate([...pipeline, { $count: "total" }]),
    PaymentModel.aggregate([
      { $match: { businessId, isDeleted: false } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    PaymentModel.aggregate([
      {
        $match: {
          businessId,
          isDeleted: false,
          paidAt: {
            $gte: (() => {
              const start = new Date();
              start.setHours(0, 0, 0, 0);
              return start;
            })(),
          },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const total = totalResult[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const totalCollected = totalCollectedAgg[0]?.total ?? 0;
  const todayCollected = todayCollectedAgg[0]?.total ?? 0;

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    if (search) params.set("search", search);
    return `/payments?${params.toString()}`;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <SiteHeader />
                    <div className="min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Billing</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Payments</h1>
        <p className="text-sm text-slate-600">
          Track payment receipts across invoices.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Collected today</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{currency.format(todayCollected)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Collected total</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{currency.format(totalCollected)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Matched records</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{total}</div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form method="get" className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by invoice, buyer, method, or reference"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm md:max-w-lg"
          />
          <button
            type="submit"
            className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Search
          </button>
        </form>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Paid at</th>
              </tr>
            </thead>
            <tbody>
              {items.map((payment: any) => (
                <tr key={payment._id?.toString?.() ?? `${payment.invoiceNumber}-${payment.paidAt}`} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {payment.invoiceNumber ? (
                      <Link href={`/invoices/${payment.invoiceId}`} className="hover:underline">
                        {payment.invoiceNumber}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{payment.buyerName ?? "-"}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{currency.format(payment.amount ?? 0)}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{String(payment.method ?? "-").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-slate-700">{payment.reference ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(payment.paidAt)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={buildHref(Math.max(1, page - 1))}
              className={`rounded-xl border px-4 py-2 font-medium transition ${
                page <= 1
                  ? "pointer-events-none border-slate-200 text-slate-400"
                  : "border-slate-300 text-slate-900 hover:bg-slate-50"
              }`}
            >
              Previous
            </Link>
            <Link
              href={buildHref(Math.min(totalPages, page + 1))}
              className={`rounded-xl border px-4 py-2 font-medium transition ${
                page >= totalPages
                  ? "pointer-events-none border-slate-200 text-slate-400"
                  : "border-slate-300 text-slate-900 hover:bg-slate-50"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </section>
    </div>
    </div>
    </div>
  );
}