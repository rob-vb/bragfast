import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { AdminNav } from "@/components/admin/nav";
import { Toaster } from "sonner";
import { ConvexClientProvider } from "@/components/convex-provider";
import { UserIdProvider } from "@/hooks/use-user-id";

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

  return (
    <ConvexClientProvider>
      <UserIdProvider value={user._id}>
        <div className="min-h-screen bg-surface">
          {/* Top bar */}
          <header className="sticky top-0 z-50 border-b-2 border-brand bg-surface" role="banner">
            <div className="mx-auto flex max-w-6xl items-center gap-3 md:gap-6 px-4 py-3">
              <Link href="/" className="flex shrink-0 items-center gap-2">
                <Image src="/logo.svg" alt="brag.fast" width={120} height={30} className="h-6 md:h-8 w-auto" />
              </Link>
              <AdminNav />
            </div>
          </header>

          {/* Content */}
          <main className="mx-auto max-w-6xl px-4 py-8" role="main">
            {children}
          </main>

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
        </div>
      </UserIdProvider>
    </ConvexClientProvider>
  );
}
