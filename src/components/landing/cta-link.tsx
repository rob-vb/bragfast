"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function CtaLink({
  signedOutHref,
  signedInHref,
  children,
  className,
}: {
  signedOutHref: string;
  signedInHref: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    authClient.getSession().then((r) => setLoggedIn(!!r.data?.user));
  }, []);

  return (
    <Link href={loggedIn ? signedInHref : signedOutHref} className={className}>
      {children}
    </Link>
  );
}
