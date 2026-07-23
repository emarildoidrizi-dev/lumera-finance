"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  ChartPie,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  Target,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useEffect, useState } from "react";
import { Brand } from "./Brand";
import { SignOutButton } from "./SignOutButton";
import styles from "./SidebarNavigation.module.css";

const links = [
  ["/dashboard", LayoutDashboard, "Overview"],
  ["/dashboard/transactions", ArrowLeftRight, "Transactions"],
  ["/dashboard/bills", ReceiptText, "Bills"],
  ["/dashboard/budget", ChartPie, "Budget"],
  ["/dashboard/goals", Target, "Goals"],
  ["/dashboard/net-worth", Landmark, "Net worth"],
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingHref) return;
    if (pathname === pendingHref || pathname.startsWith(`${pendingHref}/`)) {
      router.refresh();
      setPendingHref(null);
    }
  }, [pathname, pendingHref, router]);

  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => setPendingHref(null), 8000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  function navigateFresh(event: MouseEvent<HTMLAnchorElement>, href: string, active: boolean) {
    if (active) return;
    event.preventDefault();
    setPendingHref(href);
    router.push(href);
  }

  return (
    <aside className="sidebar">
      <Brand href="/dashboard" />
      <nav className="side-nav" aria-label="Private finance navigation">
        {links.map(([href, Icon, label]) => {
          const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          const isPending = pendingHref === href;

          return (
            <Link
              className={`side-link ${styles.link}${isActive ? " active" : ""}${isPending ? ` ${styles.pending}` : ""}`}
              href={href}
              key={href}
              prefetch={false}
              aria-current={isActive ? "page" : undefined}
              onClick={(event) => navigateFresh(event, href, isActive)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              {isPending ? <span className={styles.spinner} aria-label="Opening page" /> : null}
            </Link>
          );
        })}
        <SignOutButton />
      </nav>
      <div className={`${styles.progress}${pendingHref ? ` ${styles.progressVisible}` : ""}`} aria-hidden="true">
        <span />
      </div>
    </aside>
  );
}
