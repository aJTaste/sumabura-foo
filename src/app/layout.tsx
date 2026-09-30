import "./globals.css";
import Link from "next/link";
import type { Metadata, Viewport } from "next";
import NavLinks, { type NavItem } from "@/components/NavLinks";
import SubmitButton from "@/components/SubmitButton";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions";
import { challengeCutoff } from "@/lib/types";

export const metadata: Metadata = {
  title: "スマブラ レートランキング",
  description: "身内向けスマブラSPレーティング",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  let me: { username: string; display_name: string; is_admin: boolean } | null = null;
  let waiting = 0;
  let disputed = 0;
  if (user) {
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, is_admin")
        .eq("id", user.id)
        .single(),
      // あなたを選んでいる人の数（対戦の合図）
      supabase
        .from("challenges")
        .select("from_user", { count: "exact", head: true })
        .eq("to_user", user.id)
        .gt("created_at", challengeCutoff()),
    ]);
    me = data;
    waiting = count ?? 0;

    // 管理者: 裁定が必要な対戦・大会の試合の数
    if (me?.is_admin) {
      const [{ count: d1 }, { count: d2 }] = await Promise.all([
        supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "disputed"),
        supabase.from("tournament_matches").select("id", { count: "exact", head: true }).eq("status", "disputed"),
      ]);
      disputed = (d1 ?? 0) + (d2 ?? 0);
    }
  }

  const items: NavItem[] = me
    ? [
        { href: "/", label: "ランキング", icon: "🏆" },
        { href: "/battle", label: "対戦", icon: "⚔️", badge: waiting },
        { href: "/tournaments", label: "大会", icon: "🏅" },
        { href: "/news", label: "お知らせ", icon: "📢" },
        { href: `/users/${me.username}`, label: "プロフィール", icon: "👤" },
      ]
    : [];

  return (
    <html lang="ja">
      <body>
        <header className="sticky top-0 z-20 border-b border-line bg-panel/85 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-black text-white">S</span>
              <span className="text-base">スマブラ レート</span>
            </Link>
            {me && (
              <>
                <NavLinks items={items} variant="top" />
                <div className="ml-auto flex items-center gap-1.5">
                  {me.is_admin && (
                    <Link href="/admin" className="btn min-h-9 px-2.5">
                      管理
                      {disputed > 0 && <span className="rounded-full bg-lose px-1.5 text-xs font-bold text-white">{disputed}</span>}
                    </Link>
                  )}
                  <Link href="/rules" className="btn min-h-9 px-2.5">ルール</Link>
                  <form action={logout}>
                    <SubmitButton className="btn min-h-9 px-2.5">ログアウト</SubmitButton>
                  </form>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6 pb-28 sm:pb-10">{children}</main>
        {me && <NavLinks items={items} variant="bottom" />}
      </body>
    </html>
  );
}
