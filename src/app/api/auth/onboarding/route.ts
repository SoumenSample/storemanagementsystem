import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { auth } from "@/lib/auth";
import { businessOnboardingSchema } from "@/schemas/business";
import { BusinessModel } from "@/models/business";
import { BusinessMemberModel } from "@/models/businessMember";
import { UserModel } from "@/models/user";
import { createId } from "@paralleldrive/cuid2";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = businessOnboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const user = await UserModel.findById(session.user.id);
  if (!user?.emailVerifiedAt) {
    return NextResponse.json(
      { error: "Email not verified" },
      { status: 403 }
    );
  }

  const existingMembership = await BusinessMemberModel.findOne({
    userId: user._id,
    isDeleted: false,
  });

  if (existingMembership) {
    return NextResponse.json(
      { error: "Business already exists" },
      { status: 409 }
    );
  }

  const businessId = createId();
  const payload = parsed.data;

  const business = await BusinessModel.create({
    businessId,
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
    enabledFeatures: ["*"],
  });

  await BusinessMemberModel.create({
    businessId: business.businessId,
    userId: user._id,
    role: "OWNER",
  });

  return NextResponse.json({ ok: true, businessId: business.businessId });
}
