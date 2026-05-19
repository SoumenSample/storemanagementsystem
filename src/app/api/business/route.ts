import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { BusinessModel } from "@/models/business";
import { BusinessMemberModel } from "@/models/businessMember";
import { businessSettingsSchema } from "@/schemas/business";

async function requireOwnerAccess() {
  const session = await auth();

  if (!session?.user?.id || !session.user.businessId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  await connectToDatabase();

  const membership = await BusinessMemberModel.findOne({
    businessId: session.user.businessId,
    userId: session.user.id,
    isActive: true,
    isDeleted: false,
  }).lean();

  if (!membership) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (membership.role !== "OWNER") {
    return { error: NextResponse.json({ error: "Owner access required" }, { status: 403 }) };
  }

  return { session };
}

export async function GET() {
  const access = await requireOwnerAccess();
  if (access.error) return access.error;

  const business = await BusinessModel.findOne({
    businessId: access.session.user.businessId,
    isDeleted: false,
  }).lean();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  return NextResponse.json({ business });
}

export async function PATCH(request: Request) {
  const access = await requireOwnerAccess();
  if (access.error) return access.error;

  const body = await request.json();
  const parsed = businessSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  const updated = await BusinessModel.findOneAndUpdate(
    { businessId: access.session.user.businessId, isDeleted: false },
    {
      $set: {
        name: payload.name,
        gstin: payload.gstin.toUpperCase(),
        pan: payload.pan.toUpperCase(),
        address: payload.address,
        state: payload.state,
        stateCode: payload.stateCode,
        phone: payload.phone,
        email: payload.email.toLowerCase(),
        website: payload.website || null,
        invoicePrefix: payload.invoicePrefix,
        gstRegistrationType: payload.gstRegistrationType,
        bankDetails: payload.bankDetails,
        logoUrl: payload.logoUrl || null,
        signatureUrl: payload.signatureUrl || null,
        upiQrUrl: payload.upiQrUrl || null,
        financialYearStartMonth: payload.financialYearStartMonth,
      },
    },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  return NextResponse.json({ business: updated, message: "Business updated" });
}