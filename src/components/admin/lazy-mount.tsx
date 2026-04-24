"use client";

import { useEffect, useRef, useState } from "react";

interface LazyMountProps {
  rootMargin?: string;
  placeholder?: React.ReactNode;
  children: React.ReactNode;
}

/** Mounts children only once the wrapper enters the viewport (with rootMargin buffer).
 *  Keeps Convex subscriptions + @remotion/player bundles off the initial-paint path
 *  when a user has many drafts on screen. */
export function LazyMount({ rootMargin = "200px", placeholder, children }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            return;
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return <div ref={ref}>{visible ? children : placeholder}</div>;
}
