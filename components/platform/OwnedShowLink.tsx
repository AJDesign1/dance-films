"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

export function ShowCardAction({ owned, href, className, onPurchase, children }: {
  owned: boolean; href: string; className: string; onPurchase: () => void; children: ReactNode;
}) {
  if (owned) return <OwnedShowLink href={href} className={className}>{children}</OwnedShowLink>;
  return <div role="button" tabIndex={0} className={className} onClick={onPurchase}
    style={{ display: "block", cursor: "pointer" }}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPurchase(); }
    }}>{children}</div>;
}

/** Warm the likely next page in this browser; protected data still uses RLS. */
export default function OwnedShowLink({ href, className, children }: {
  href: string; className: string; children: ReactNode;
}) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const prefetched = useRef(false);

  function prefetch() {
    if (prefetched.current) return;
    prefetched.current = true;
    router.prefetch(href);
  }

  useEffect(() => {
    prefetched.current = false;
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) return;
    // Let the current page's hero load first; prepare only visible show cards.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (!entry.isIntersecting) {
        clearTimeout(timer);
        return;
      }
      timer = setTimeout(() => {
        if (!prefetched.current) {
          prefetched.current = true;
          router.prefetch(href);
        }
        observer.disconnect();
      }, 800);
    });
    observer.observe(element);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [href, router]);

  return <Link ref={ref} href={href} prefetch={false} className={className}
    onMouseEnter={prefetch} onFocus={prefetch} onTouchStart={prefetch}
    style={{ display: "block", cursor: "pointer", textDecoration: "none", color: "inherit" }}>
    {children}
  </Link>;
}
