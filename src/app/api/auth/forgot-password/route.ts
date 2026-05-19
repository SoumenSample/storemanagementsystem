import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { forgotPasswordSchema } from "@/schemas/auth";
import { UserModel } from "@/models/user";
import { PasswordResetTokenModel } from "@/models/passwordResetToken";
import { createToken, hashToken } from "@/utils/tokens";
import { sendMail } from "@/lib/mailer";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const limiter = rateLimit(`forgot-password:${ip}`, 6, 60 * 60_000);
  if (!limiter.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  await connectToDatabase();

  const email = parsed.data.email.toLowerCase();
  const user = await UserModel.findOne({ email });

  if (user) {
    const rawToken = createToken();
    const hashed = hashToken(rawToken);

    await PasswordResetTokenModel.create({
      userId: user._id,
      token: hashed,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
    });

    const appUrl = env.APP_URL ?? env.NEXTAUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    await sendMail({
      to: user.email,
      subject: "Reset your password",
      text: `Reset your password: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Reset your password</h2>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}">Reset Password</a></p>
          <p>If you did not request a password reset, you can ignore this email.</p>
        </div>
      `,
    });
  }

  // Always return ok to avoid account enumeration
  return NextResponse.json({ ok: true });
}
