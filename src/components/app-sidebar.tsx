"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChartBarIcon, CommandIcon, CreditCardIcon, DatabaseIcon, FileTextIcon, FileUpIcon, LayoutDashboardIcon, MonitorIcon, PackageIcon, Settings2Icon, TagsIcon, UsersIcon } from "lucide-react"

const isActivePath = (pathname: string, target: string) =>
  pathname === target || pathname.startsWith(`${target}/`)

function SidebarHeaderContent({
  workspaceName,
  workspaceLogoUrl,
}: {
  workspaceName: string
  workspaceLogoUrl?: string | null
}) {
  const { state } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild className="h-auto p-2">
          <Link href="/dashboard" className="flex items-center gap-3">
            {workspaceLogoUrl ? (
              <Image
                alt={workspaceName}
                src={workspaceLogoUrl}
                priority
                loading="eager"
                className="size-16 rounded-md object-contain"
                width={80}
                height={80}
                unoptimized
              />
            ) : (
              <CommandIcon className="size-16" />
            )}
            <span className={`text-xl font-bold leading-none ${state === "collapsed" ? "hidden" : ""}`}>
              {workspaceName}
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  workspaceName?: string
  workspaceLogoUrl?: string | null
  userName?: string | null
  userEmail?: string | null
  userRole?: string | null
}

export function AppSidebar({
  workspaceName = "GST Billing",
  workspaceLogoUrl,
  userName = "Guest user",
  userEmail = "guest@example.com",
  userRole = null,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname()

  const isOwnerOrAdmin = userRole === "OWNER" || userRole === "ADMIN"
  const isCashier = userRole === "CASHIER"
  const isInventoryManager = userRole === "INVENTORY_MANAGER"

  const canAccess = (allowed: Array<"OWNER_ADMIN" | "CASHIER" | "INVENTORY_MANAGER">) => {
    if (isOwnerOrAdmin) return true
    if (isCashier && allowed.includes("CASHIER")) return true
    if (isInventoryManager && allowed.includes("INVENTORY_MANAGER")) return true
    return false
  }

  const data = {
    user: {
      name: userName ?? "Guest user",
      email: userEmail ?? "guest@example.com",
      avatar: workspaceLogoUrl ?? "/avatars/shadcn.jpg",
    },
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: <LayoutDashboardIcon />,
        isActive: isActivePath(pathname, "/dashboard"),
        show: true,
      },
      {
        title: "Invoices",
        url: "/invoices",
        icon: <FileTextIcon />,
        isActive: isActivePath(pathname, "/invoices"),
        show: canAccess(["CASHIER"]),
      },
      {
        title: "Products",
        url: "/products",
        icon: <PackageIcon />,
        isActive: isActivePath(pathname, "/products"),
        show: canAccess(["INVENTORY_MANAGER"]),
      },
      {
        title: "Shelves",
        url: "/shelves",
        icon: <DatabaseIcon />,
        isActive: isActivePath(pathname, "/shelves"),
        show: canAccess(["INVENTORY_MANAGER"]),
      },
      {
        title: "Categories",
        url: "/categories",
        icon: <TagsIcon />,
        isActive: isActivePath(pathname, "/categories"),
        show: canAccess(["INVENTORY_MANAGER"]),
      },
      {
        title: "Payments",
        url: "/payments",
        icon: <CreditCardIcon />,
        isActive: isActivePath(pathname, "/payments"),
        show: canAccess(["CASHIER"]),
      },
      {
        title: "POS",
        url: "/pos",
        icon: <MonitorIcon />,
        isActive: isActivePath(pathname, "/pos"),
        show: canAccess(["CASHIER"]),
      },
      {
        title: "Employees",
        url: "/employees",
        icon: <UsersIcon />,
        isActive: isActivePath(pathname, "/employees"),
        show: isOwnerOrAdmin,
      },
      // {
      //   title: "Reports",
      //   url: "/reports",
      //   icon: <ChartBarIcon />,
      //   isActive: isActivePath(pathname, "/reports"),
      // },
      // {
      //   title: "Settings",
      //   url: "/settings",
      //   icon: <Settings2Icon />,
      //   isActive: isActivePath(pathname, "/settings"),
      // },
    ],
    documents: [
      {
        name: "New invoice",
        url: "/invoices/new",
        icon: <FileTextIcon />,
        isActive: isActivePath(pathname, "/invoices/new"),
        show: canAccess(["CASHIER"]),
      },
      {
        name: "Low stock products",
        url: "/products?lowStock=1",
        icon: <DatabaseIcon />,
        isActive: isActivePath(pathname, "/products"),
        show: canAccess(["INVENTORY_MANAGER"]),
      },
      {
        name: "Change Business Info",
        url: "/uploads",
        icon: <FileUpIcon />,
        isActive: isActivePath(pathname, "/uploads"),
        show: isOwnerOrAdmin,
      },
    ],
    navSecondary: [
      {
        title: "Settings",
        url: "/settings",
        icon: <Settings2Icon />,
        isActive: isActivePath(pathname, "/settings"),
        show: isOwnerOrAdmin,
      },
      {
        title: "Reports",
        url: "/reports",
        icon: <ChartBarIcon />,
        isActive: isActivePath(pathname, "/reports"),
        show: isOwnerOrAdmin,
      },
      // {
      //   title: "Payments",
      //   url: "/payments",
      //   icon: <CreditCardIcon />,
      //   isActive: isActivePath(pathname, "/payments"),
      // },
    ],
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-auto py-4">
        <SidebarHeaderContent workspaceName={workspaceName} workspaceLogoUrl={workspaceLogoUrl} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain.filter((item) => item.show)} />
        <NavDocuments items={data.documents.filter((item) => item.show)} />
        <NavSecondary items={data.navSecondary.filter((item) => item.show)} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
