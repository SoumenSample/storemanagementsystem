import bcrypt from "bcryptjs";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mailer";
import { BusinessMemberModel } from "@/models/businessMember";
import { UserModel } from "@/models/user";
import { createToken } from "@/utils/tokens";

export type EmployeeBusinessRole = "CASHIER" | "INVENTORY_MANAGER";

export type EmployeeAccessInput = {
  businessId: string;
  name: string;
  email: string;
  phone: string;
  role: EmployeeBusinessRole;
  existingUserId?: string | null;
};

export type EmployeeAccessResult = {
  userId: string;
  createdUser: boolean;
  createdTemporaryPassword?: string;
};

function createTemporaryPassword() {
  return `Emp-${createToken(4)}!`;
}

async function sendEmployeeAccessEmail(params: {
  email: string;
  name: string;
  businessId: string;
  role: EmployeeBusinessRole;
  createdTemporaryPassword?: string;
}) {
  const appUrl = env.APP_URL ?? env.NEXTAUTH_URL ?? "http://localhost:3000";
  const loginUrl = `${appUrl}/login`;
  const resetUrl = `${appUrl}/forgot-password`;

  const passwordLine = params.createdTemporaryPassword
    ? `<p><strong>Temporary password:</strong> ${params.createdTemporaryPassword}</p>`
    : `<p>You can sign in with your existing account and use <a href="${resetUrl}">Forgot password</a> if needed.</p>`;

  try {
    await sendMail({
      to: params.email,
      subject: "Your employee account is ready",
      text: [
        `Hello ${params.name},`,
        `Your employee account for business ${params.businessId} has been created.`,
        `Role: ${params.role}`,
        params.createdTemporaryPassword ? `Temporary password: ${params.createdTemporaryPassword}` : "",
        `Sign in here: ${loginUrl}`, 
        `If you need to change your password later, use the Forgot password link on the login page: ${resetUrl}`,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Your employee account is ready</h2>
          <p>Hello ${params.name},</p>
          <p>Your employee account for business <strong>${params.businessId}</strong> has been created.</p>
          <p><strong>Role:</strong> ${params.role}</p>
          ${passwordLine}
          <p><a href="${loginUrl}">Sign in</a></p>
          <p>If you need to change your password later, use <a href="${resetUrl}">Forgot password</a> on the login page.</p>
        </div>
      `,
    });
  } catch (error) {
    console.warn("Failed to send employee access email", error);
  }
}

async function upsertBusinessMembership(params: {
  businessId: string;
  userId: string;
  role: EmployeeBusinessRole;
}) {
  const membership = await BusinessMemberModel.findOne({
    businessId: params.businessId,
    userId: params.userId,
    isDeleted: { $ne: true },
  });

  if (membership) {
    membership.role = params.role;
    membership.isActive = true;
    await membership.save();
    return membership;
  }

  return BusinessMemberModel.create({
    businessId: params.businessId,
    userId: params.userId,
    role: params.role,
  });
}

export async function ensureEmployeeAccess(params: EmployeeAccessInput): Promise<EmployeeAccessResult> {
  const normalizedEmail = params.email.toLowerCase();
  const existingUser = params.existingUserId
    ? await UserModel.findById(params.existingUserId)
    : await UserModel.findOne({ email: normalizedEmail });

  if (existingUser) {
    existingUser.name = params.name;
    existingUser.email = normalizedEmail;
    existingUser.phone = params.phone;
    if (!existingUser.emailVerifiedAt) {
      existingUser.emailVerifiedAt = new Date();
    }
    existingUser.isActive = true;
    await existingUser.save();

    await upsertBusinessMembership({
      businessId: params.businessId,
      userId: existingUser._id.toString(),
      role: params.role,
    });

    await sendEmployeeAccessEmail({
      email: normalizedEmail,
      name: params.name,
      businessId: params.businessId,
      role: params.role,
    });

    return {
      userId: existingUser._id.toString(),
      createdUser: false,
    };
  }

  const createdTemporaryPassword = createTemporaryPassword();
  const passwordHash = await bcrypt.hash(createdTemporaryPassword, 12);

  const user = await UserModel.create({
    name: params.name,
    email: normalizedEmail,
    phone: params.phone,
    passwordHash,
    emailVerifiedAt: new Date(),
    isActive: true,
  });

  await upsertBusinessMembership({
    businessId: params.businessId,
    userId: user._id.toString(),
    role: params.role,
  });

  await sendEmployeeAccessEmail({
    email: normalizedEmail,
    name: params.name,
    businessId: params.businessId,
    role: params.role,
    createdTemporaryPassword,
  });

  return {
    userId: user._id.toString(),
    createdUser: true,
    createdTemporaryPassword,
  };
}
