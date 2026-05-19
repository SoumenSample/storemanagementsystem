import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { BusinessMemberModel } from "@/models/businessMember";

async function requireRoleAccess(allowed: string[]) {
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

  // OWNER and ADMIN always allowed
  if (membership.role === "OWNER" || membership.role === "ADMIN") {
    return { session, membership };
  }

  if (!allowed.includes(membership.role)) {
    return { error: NextResponse.json({ error: "Access denied" }, { status: 403 }) };
  }

  return { session, membership };
}

export async function requireCashierAccess() {
  return requireRoleAccess(["CASHIER"]);
}

export async function requireInventoryAccess() {
  return requireRoleAccess(["INVENTORY_MANAGER"]);
}

export async function requireOwnerOrAdmin() {
  return requireRoleAccess([]);
}

export default requireRoleAccess;
