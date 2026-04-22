import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "sonner";
import { ConvexClientProvider } from "@/components/convex-provider";
import { UserIdProvider } from "@/hooks/use-user-id";
import type { PlanId } from "@/lib/plans";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const stats = await fetchQuery(api.userProfiles.getStats, {
    userId: user._id,
  });
  const email = user.email ?? "";
  const plan = (stats?.plan ?? "trial") as PlanId;

  return (
    <ConvexClientProvider>
      <UserIdProvider value={user._id}>
        <SidebarProvider>
          <AdminSidebar email={email} plan={plan} />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
            </header>
            <main className="flex-1 px-4 py-8 md:px-8" role="main">
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </main>
          </SidebarInset>

          <Toaster
            position="bottom-center"
            toastOptions={{
              className:
                "!border-2 !border-brand !bg-surface !shadow-[3px_3px_0_var(--color-brand)] !rounded-none",
              classNames: {
                title: "!font-[family-name:var(--font-press-start)] !text-[10px] !text-brand",
                description: "!font-[family-name:var(--font-geist-sans)] !text-xs !text-brand/70",
                success: "!border-gold",
                error: "!border-red-600",
              },
            }}
          />
        </SidebarProvider>
      </UserIdProvider>
    </ConvexClientProvider>
  );
}
