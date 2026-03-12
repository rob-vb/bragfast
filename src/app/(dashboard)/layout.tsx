import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { DashboardNav } from "@/components/dashboard/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b-2 border-brand bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 md:gap-6 px-4 py-3">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <Image src="/logo.svg" alt="brag.fast" width={120} height={30} className="h-6 md:h-8 w-auto" />
          </Link>
          <DashboardNav />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
