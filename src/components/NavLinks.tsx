"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string; badge?: number };

const badgeCls = "ml-1 rounded-full bg-lose px-1.5 text-xs font-bold text-white";

export default function NavLinks({ items, variant }: { items: NavItem[]; variant: "top" | "bottom" }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  if (variant === "top") {
    return (
      <nav aria-label="メイン" className="hidden items-center gap-1 sm:flex">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={isActive(i.href) ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              isActive(i.href) ? "bg-accent/10 text-accent" : "text-mute hover:bg-paper hover:text-ink"
            }`}
          >
            {i.label}
            {!!i.badge && <span className={badgeCls}>{i.badge}</span>}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="メイン"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-panel/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={isActive(i.href) ? "page" : undefined}
          className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
            isActive(i.href) ? "text-accent" : "text-mute"
          }`}
        >
          <span className="text-xl leading-none" aria-hidden>{i.icon}</span>
          {i.label}
          {!!i.badge && (
            <span className="absolute right-[22%] top-1 rounded-full bg-lose px-1.5 text-[10px] font-bold text-white">{i.badge}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
