import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { UserModel } from "@/models/user";
import { BusinessMemberModel } from "@/models/businessMember";
import { LoginActivityModel } from "@/models/loginActivity";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  remember: z.string().optional(),
});

async function logLoginAttempt(params: {
  userId?: string;
  businessId?: string | null;
  email?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  success: boolean;
  reason?: string;
}) {
  try {
    await LoginActivityModel.create({
      userId: params.userId,
      businessId: params.businessId ?? null,
      email: params.email,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      success: params.success,
      reason: params.reason,
      isDeleted: false,
    });
  } catch {
    // Avoid failing auth on audit log errors.
  }
}

const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember", type: "text" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        const ipAddress = request?.headers?.get("x-forwarded-for") ?? null;
        const userAgent = request?.headers?.get("user-agent") ?? null;

        if (!parsed.success) {
          await logLoginAttempt({
            email: (credentials as any)?.email,
            ipAddress,
            userAgent,
            success: false,
            reason: "Invalid credentials payload",
          });
          return null;
        }

        const { email, password, remember } = parsed.data;

        await connectToDatabase();

        const user = await UserModel.findOne({
          email: email.toLowerCase(),
          isActive: true,
        }).lean();

        if (!user || !user.passwordHash) {
          await logLoginAttempt({
            email,
            ipAddress,
            userAgent,
            success: false,
            reason: "User not found",
          });
          return null;
        }

        if (!user.emailVerifiedAt) {
          await logLoginAttempt({
            userId: user._id.toString(),
            email,
            ipAddress,
            userAgent,
            success: false,
            reason: "Email not verified",
          });
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await logLoginAttempt({
            userId: user._id.toString(),
            email,
            ipAddress,
            userAgent,
            success: false,
            reason: "Invalid password",
          });
          return null;
        }

        const membership = await BusinessMemberModel.findOne({
          userId: user._id,
          isActive: true,
          isDeleted: false,
        }).lean();

        await logLoginAttempt({
          userId: user._id.toString(),
          businessId: membership?.businessId ?? null,
          email,
          ipAddress,
          userAgent,
          success: true,
        });

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          businessId: membership?.businessId ?? null,
          role: membership?.role ?? null,
          globalRole: user.globalRole,
          rememberMe: remember === "true",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.businessId = user.businessId ?? null;
        token.role = user.role ?? null;
        token.globalRole = user.globalRole ?? "USER";
        token.rememberMe = Boolean(user.rememberMe);
      }
      if (token.userId && !token.businessId) {
        await connectToDatabase();
        const membership = await BusinessMemberModel.findOne({
          userId: token.userId,
          isActive: true,
          isDeleted: false,
        }).lean();
        if (membership) {
          token.businessId = membership.businessId;
          token.role = membership.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.businessId = token.businessId as string | null;
        session.user.role = token.role as string | null;
        session.user.globalRole = token.globalRole as "SUPER_ADMIN" | "USER";
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
export { authConfig };
