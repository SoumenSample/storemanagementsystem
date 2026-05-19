import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireBusinessContext() {
  const session = await requireSession();
  if (session.user.globalRole === "SUPER_ADMIN") return session;
  if (!session.user.businessId) redirect("/onboarding");
  return session;
}

export async function getBusinessId() {
  const session = await requireBusinessContext();
  return session.user.businessId as string;
}
