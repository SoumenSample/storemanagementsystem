import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerOrAdmin } from "@/lib/access";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/models/user";
import { BusinessMemberModel } from "@/models/businessMember";

const bodySchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().optional(),
  role: z.enum(["CASHIER", "INVENTORY_MANAGER"]),
});

export async function POST(request: Request) {
  const access = await requireOwnerOrAdmin();
  if (access.error) return access.error;

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  await connectToDatabase();

  const { email, userId, role } = parsed.data;

  let user;
  if (userId) {
    user = await UserModel.findById(userId).lean();
  } else if (email) {
    user = await UserModel.findOne({ email: email.toLowerCase() }).lean();
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await BusinessMemberModel.findOne({
    businessId: access.session.user.businessId,
    userId: user._id,
    isDeleted: false,
  }).lean();

  if (existing) {
    return NextResponse.json({ error: "User is already a member" }, { status: 409 });
  }

  const member = await BusinessMemberModel.create({
    businessId: access.session.user.businessId,
    userId: user._id,
    role,
  });

  return NextResponse.json({ ok: true, memberId: member._id });
}
