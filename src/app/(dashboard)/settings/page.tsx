import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { BusinessMemberModel } from "@/models/businessMember";
import { BusinessModel } from "@/models/business";
import BusinessSettingsForm from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id || !session.user.businessId) {
    redirect("/onboarding");
  }

  await connectToDatabase();

  const membership = await BusinessMemberModel.findOne({
    businessId: session.user.businessId,
    userId: session.user.id,
    isActive: true,
    isDeleted: false,
  }).lean();

  if (!membership || membership.role !== "OWNER") {
    redirect("/dashboard");
  }

  const business = await BusinessModel.findOne({
    businessId: session.user.businessId,
    isDeleted: false,
  }).lean();

  if (!business) {
    redirect("/onboarding");
  }

  return <BusinessSettingsForm business={JSON.parse(JSON.stringify(business))} />;
}