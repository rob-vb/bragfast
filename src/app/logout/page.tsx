"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    authClient.signOut().then(() => {
      router.push("/login");
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF8F0]">
      <p className="font-[family-name:var(--font-press-start)] text-xs text-[#4A3326]">
        Logging out...
      </p>
    </div>
  );
}
