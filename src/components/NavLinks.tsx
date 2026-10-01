"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// badge は、数字バッジ（サーバー側で後から出てくる部品）をそのまま受け取る
export type NavItem = { href: string; label: string; icon: string; badge?: ReactNode };

// タップしてから画面が切り替わるまでの間、ラベルを脈打たせて「反応している」ことを伝える
// （Link の中に置いたときだけ、そのリンクの読み込み状態が分かる）
function Pending({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { pending } = useLinkStatus();
  return <span className={`${className} ${pending ? "animate-pulse" : ""}`}>{children}</span>;
}

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
            <Pending>{i.label}</Pending>
            {i.badge}
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
          className={`relative flex flex-col items-center py-2 text-[11px] font-medium transition ${
            isActive(i.href) ? "text-accent" : "text-mute"
          }`}
        >
          <Pending className="flex flex-col items-center gap-0.5">
            <span className="text-xl leading-none" aria-hidden>{i.icon}</span>
            {i.label}
          </Pending>
          {i.badge}
        </Link>
      ))}
    </nav>
  );
}
