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
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b-2 border-[#4A3326] bg-[#FFF8F0]">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo-icon.svg" alt="Bragfast" width={32} height={33} />
            <span className="font-[family-name:var(--font-press-start)] text-sm text-[#4A3326]">
              BRAGFAST
            </span>
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
