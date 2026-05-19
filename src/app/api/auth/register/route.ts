import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { registerSchema } from "@/schemas/auth";
import { UserModel } from "@/models/user";
import { VerificationTokenModel } from "@/models/verificationToken";
import { createToken, hashToken } from "@/utils/tokens";
import { sendMail } from "@/lib/mailer";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimit(`register:${ip}`, 10, 60_000);
  if (!limiter.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const { name, email, phone, password } = parsed.data;
  await connectToDatabase();

  const existing = await UserModel.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await UserModel.create({
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
  });

  const rawToken = createToken();
  const hashedToken = hashToken(rawToken);

  await VerificationTokenModel.create({
    userId: user._id,
    token: hashedToken,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
  });

  const appUrl = env.APP_URL ?? env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify-email?token=${rawToken}`;

  await sendMail({
    to: user.email,
    subject: "Verify your GST Billing account",
    text: `Verify your email: ${verifyUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Verify your email</h2>
        <p>Click the button below to verify your account.</p>
        <p><a href="${verifyUrl}">Verify Email</a></p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
