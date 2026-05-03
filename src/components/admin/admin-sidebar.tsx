"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChefHat,
  FileText,
  History,
  LayoutDashboard,
  LayoutTemplate,
  Palette,
  KeyRound,
  ChevronsUpDown,
  CreditCard,
  Sparkles,
  LogOut,
  UserCircle,
  Settings,
  Target,
  Bell,
  CalendarRange,
} from "lucide-react";
import { startTransition, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { createPortalSession } from "@/app/(admin)/admin/account/billing-actions";
import { PLANS, type PlanId } from "@/lib/plans";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

// S6.2: promote Sous-Chef (sources + goals) to Main. Demote Kitchen + API Keys
// to Developers group — kept reachable but off the primary path.
const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Briefing", href: "/admin/briefing", icon: Bell },
  { label: "Kitchen", href: "/admin/kitchen", icon: ChefHat },
  { label: "Drafts", href: "/admin/drafts", icon: FileText },
];

const sousChefNav: NavItem[] = [
  { label: "Weekly report", href: "/admin/report", icon: CalendarRange },
  { label: "Goals", href: "/admin/sous-chef/goals", icon: Target },
  { label: "Activity log", href: "/admin/sous-chef/history", icon: History },
  { label: "Settings", href: "/admin/sous-chef", icon: Settings },
];

const configureNav: NavItem[] = [
  { label: "Templates", href: "/admin/templates", icon: LayoutTemplate },
  { label: "Brands", href: "/admin/brands", icon: Palette },
];

const developersNav: NavItem[] = [
  { label: "API history", href: "/admin/history", icon: History },
  { label: "API Keys", href: "/admin/keys", icon: KeyRound },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  // Exact match for Sous-Chef Settings so deeper sous-chef sub-routes
  // (history, goals) don't also light up Settings.
  if (href === "/admin/sous-chef") return pathname === "/admin/sous-chef";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  email,
  plan,
}: {
  email: string;
  plan: PlanId;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const planConfig = PLANS[plan];
  const unseenBriefing =
    useQuery(api.triggerEvents.countUnseenBriefingDrafts, {}) ?? 0;
  const [portalPending, setPortalPending] = useState(false);

  function handleLogout() {
    authClient.signOut().then(() => {
      router.push("/login");
    });
  }

  async function handleBilling() {
    if (portalPending) return;
    setPortalPending(true);
    try {
      const url = await createPortalSession();
      if (!url) {
        toast.error("No active subscription — pick a plan first");
        router.push("/admin/account/upgrade");
        return;
      }
      window.location.href = url;
    } catch (err) {
      console.error(err);
      toast.error("Could not open billing portal");
    } finally {
      setPortalPending(false);
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="brag.fast"
              className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <Link href="/">
                <Image
                  src="/logo-icon.svg"
                  alt=""
                  width={32}
                  height={32}
                  className="hidden size-5 shrink-0 group-data-[collapsible=icon]:block"
                />
                <Image
                  src="/logo.svg"
                  alt="brag.fast"
                  width={120}
                  height={30}
                  className="h-7 w-auto shrink-0 group-data-[collapsible=icon]:hidden"
                />
                <span className="sr-only">brag.fast — Release kitchen</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => {
                const active = isItemActive(pathname, item.href);
                const showBadge =
                  item.href === "/admin/briefing" && unseenBriefing > 0;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={
                        showBadge
                          ? `${item.label} (${unseenBriefing} new)`
                          : item.label
                      }
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                        {showBadge ? (
                          <span
                            aria-label={`${unseenBriefing} new briefing items`}
                            className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-medium leading-none text-white group-data-[collapsible=icon]:hidden"
                          >
                            {unseenBriefing > 99 ? "99+" : unseenBriefing}
                          </span>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sous-Chef</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sousChefNav.map((item) => {
                const active = isItemActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configure</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configureNav.map((item) => {
                const active = isItemActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Developers</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {developersNav.map((item) => {
                const active = isItemActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{email}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {planConfig.name} plan
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                className="min-w-56 rounded-lg"
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex flex-col gap-0.5 px-2 py-1.5 text-left text-sm">
                    <span className="truncate font-medium">{email}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {planConfig.name} plan
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/account">
                    <UserCircle />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/account/upgrade">
                    <Sparkles />
                    Plans
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    startTransition(() => {
                      void handleBilling();
                    });
                  }}
                  disabled={portalPending}
                >
                  <CreditCard />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
