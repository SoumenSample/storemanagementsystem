import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { BusinessModel } from "@/models/business";
import { BusinessMemberModel } from "@/models/businessMember";
import { InvoiceModel } from "@/models/invoice";
import { PaymentModel } from "@/models/payment";
import { UserModel } from "@/models/user";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

export default async function SuperAdminDashboardPage() {
  const session = await auth();

  if (session?.user?.globalRole !== "SUPER_ADMIN") {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col justify-center px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Super Admin Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          You do not have access to this area.
        </p>
      </div>
    );
  }

  await connectToDatabase();

  const [totalBusinesses, activeBusinesses, totalUsers, totalMembers, totalInvoices, totalRevenue, recentBusinesses] =
    await Promise.all([
      BusinessModel.countDocuments({ isDeleted: false }),
      BusinessModel.countDocuments({ isDeleted: false, subscriptionStatus: "active" }),
      UserModel.countDocuments({ isActive: true }),
      BusinessMemberModel.countDocuments({ isActive: true, isDeleted: false }),
      InvoiceModel.countDocuments({ isDeleted: false }),
      PaymentModel.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      BusinessModel.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(8)
        .select({ name: 1, subscriptionPlan: 1, subscriptionStatus: 1, createdAt: 1 })
        .lean(),
    ]);

  const revenueTotal = totalRevenue[0]?.total ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Platform
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
          Super Admin Dashboard
        </h1>
        <p className="text-sm text-slate-600">
          Platform-wide overview of businesses, users, usage, and revenue.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Businesses</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{totalBusinesses}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Active subscriptions</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{activeBusinesses}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Users</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{totalUsers}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Members</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{totalMembers}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Invoices</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{totalInvoices}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Revenue</div>
          <div className="mt-3 text-3xl font-semibold text-slate-900">
            {currency.format(revenueTotal)}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Onboarding activity</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Recent businesses
            </h2>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentBusinesses.map((business) => (
                <tr key={business._id?.toString?.() ?? business.name} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-slate-900">{business.name}</td>
                  <td className="px-4 py-3 text-slate-700">{business.subscriptionPlan}</td>
                  <td className="px-4 py-3 text-slate-700">{business.subscriptionStatus}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {business.createdAt ? new Date(business.createdAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
              {recentBusinesses.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={4}>
                    No businesses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
