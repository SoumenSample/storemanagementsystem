import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyEmailSchema } from "@/schemas/auth";
import { VerificationTokenModel } from "@/models/verificationToken";
import { UserModel } from "@/models/user";
import { hashToken } from "@/utils/tokens";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = verifyEmailSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const hashed = hashToken(parsed.data.token);
  const tokenDoc = await VerificationTokenModel.findOne({
    token: hashed,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!tokenDoc) {
    return NextResponse.json(
      { error: "Token expired or invalid" },
      { status: 400 }
    );
  }

  await UserModel.updateOne(
    { _id: tokenDoc.userId },
    { $set: { emailVerifiedAt: new Date() } }
  );

  await VerificationTokenModel.updateOne(
    { _id: tokenDoc._id },
    { $set: { usedAt: new Date() } }
  );

  return NextResponse.json({ ok: true });
}
