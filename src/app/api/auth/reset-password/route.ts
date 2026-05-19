import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { resetPasswordSchema } from "@/schemas/auth";
import { PasswordResetTokenModel } from "@/models/passwordResetToken";
import { UserModel } from "@/models/user";
import { hashToken } from "@/utils/tokens";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const hashed = hashToken(parsed.data.token);
  const tokenDoc = await PasswordResetTokenModel.findOne({
    token: hashed,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!tokenDoc) {
    return NextResponse.json({ error: "Token expired or invalid" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(parsed.data.password, 12);

  await UserModel.updateOne(
    { _id: tokenDoc.userId },
    { $set: { passwordHash: newHash } }
  );

  await PasswordResetTokenModel.updateOne(
    { _id: tokenDoc._id },
    { $set: { usedAt: new Date() } }
  );

  return NextResponse.json({ ok: true });
}
