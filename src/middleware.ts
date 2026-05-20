import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

function isPublicApi(pathname: string) {
  return (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/uploads") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email"
  );
}

export default auth(async (req: NextRequest) => {
  const { pathname } = req.nextUrl;

  if (isPublicApi(pathname)) return NextResponse.next();

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/shelves") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/employees") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/pos") ||
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/api")
  ) {
    const user = req.auth?.user;

    if (!user?.id) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const isSuperAdmin = user.globalRole === "SUPER_ADMIN";
    if (pathname.startsWith("/super-admin") && !isSuperAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (!isSuperAdmin && !user.businessId) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    const role = (user.role as string | undefined) ?? null;
    const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";

    if (!isOwnerOrAdmin) {
      const cashierAllowed = [
        "/dashboard",
        "/pos",
        "/invoices",
        "/payments",
        "/api/invoices",
        "/api/products",
        "/api/categories",
      ];
      const inventoryAllowed = ["/dashboard", "/products", "/shelves", "/categories", "/api/products", "/api/shelves", "/api/categories"];

      if (role === "CASHIER") {
        const allowed = cashierAllowed.some((prefix) => pathname.startsWith(prefix));
        if (!allowed) {
          return NextResponse.redirect(new URL("/pos", req.url));
        }
      }

      if (role === "INVENTORY_MANAGER") {
        const allowed = inventoryAllowed.some((prefix) => pathname.startsWith(prefix));
        if (!allowed) {
          return NextResponse.redirect(new URL("/products", req.url));
        }
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/invoices/:path*",
    "/products/:path*",
    "/shelves/:path*",
    "/categories/:path*",
    "/payments/:path*",
    "/employees/:path*",
    "/uploads/:path*",
    "/settings/:path*",
    "/pos/:path*",
    "/reports/:path*",
    "/super-admin/:path*",
    "/api/:path*",
  ],
};
