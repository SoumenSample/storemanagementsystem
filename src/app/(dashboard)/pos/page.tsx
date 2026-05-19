import { auth } from "@/lib/auth";
import { requireCashierAccess } from "@/lib/access";
import { connectToDatabase } from "@/lib/db";
import { BusinessModel } from "@/models/business";
import PosTerminal from "@/components/pos/PosTerminal";
import { SiteHeader } from "@/components/site-header";

export default async function PosPage() {
  const access = await requireCashierAccess();

  if (access.error) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col justify-center px-8">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">POS</h1>
        <p className="mt-2 text-sm text-slate-600">Access denied. POS is available to cashiers and owners.</p>
      </div>
    );
  }

  await connectToDatabase();
  const business = await BusinessModel.findOne({
    businessId: access.session.user.businessId,
    isDeleted: false,
  })
    .select({ name: 1, state: 1, invoicePrefix: 1 })
    .lean();

  if (!business) {
    return (
       
              // <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col justify-center px-8">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">POS</h1>
        <p className="mt-2 text-sm text-slate-600">Complete business onboarding first.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SiteHeader />
            <div className="min-h-0 flex-1 overflow-y-auto">
    <div className="px-2 py-2 sm:px-4 sm:py-4">
      <PosTerminal
        businessName={business.name}
        businessState={business.state}
        invoicePrefix={business.invoicePrefix ?? "INV"}
      />
    </div>
    </div>
    </div>
  );
}