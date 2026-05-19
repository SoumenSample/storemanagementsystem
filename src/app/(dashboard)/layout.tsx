import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { BusinessModel } from "@/models/business";
import type { CSSProperties } from "react";

export const metadata = {
  title: "Dashboard - Store Management System",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  let workspaceName = "Workspace";
  let workspaceLogoUrl: string | null = null;

  if (session?.user?.businessId) {
    await connectToDatabase();
    const business = await BusinessModel.findOne({
      businessId: session.user.businessId,
      isDeleted: false,
    })
      .select({ name: 1, logoUrl: 1 })
      .lean();

    workspaceName = business?.name ?? "Workspace";
    workspaceLogoUrl = business?.logoUrl ?? null;
  } else if (session?.user?.globalRole === "SUPER_ADMIN") {
    workspaceName = "Platform Admin";
  }

  return (
    <SidebarProvider
      className="h-svh overflow-hidden"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        workspaceName={workspaceName}
        workspaceLogoUrl={workspaceLogoUrl}
        userName={session?.user?.name ?? null}
        userEmail={session?.user?.email ?? null}
        userRole={session?.user?.role ?? null}
      />
      <SidebarInset className="min-h-0 overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
