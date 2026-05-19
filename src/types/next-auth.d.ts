import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      businessId?: string | null;
      role?: string | null;
      globalRole?: "SUPER_ADMIN" | "USER";
    };
  }

  interface User {
    businessId?: string | null;
    role?: string | null;
    globalRole?: "SUPER_ADMIN" | "USER";
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    businessId?: string | null;
    role?: string | null;
    globalRole?: "SUPER_ADMIN" | "USER";
    rememberMe?: boolean;
  }
}
