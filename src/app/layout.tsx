import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions";

export const metadata: Metadata = {
  title: "スマブラ レートランキング",
  description: "身内向けスマブラSPレーティング",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let me: { username: string; display_name: string; is_admin: boolean } | null = null;
  let waiting = 0;
  let disputed = 0;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, is_admin")
      .eq("id", user.id)
      .single();
    me = data;
    const { count } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("player_b", user.id);
    waiting = count ?? 0;
    if (me?.is_admin) {
      const { count: d } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("status", "disputed");
      disputed = d ?? 0;
    }
  }

  const link = "rounded-md px-2.5 py-1.5 text-sm hover:bg-white";
  const badge = "ml-1 rounded-full bg-lose px-1.5 text-xs text-white";

  return (
    <html lang="ja">
      <body>
        <header className="border-b border-line bg-panel">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2">
            <Link href="/" className="mr-3 text-lg font-bold">
              スマブラ レート
            </Link>
            {me && (
              <>
                <nav className="flex flex-wrap items-center">
                  <Link href="/" className={link}>ランキング</Link>
                  <Link href="/matches/new" className={link}>結果を報告</Link>
                  <Link href="/matches" className={link}>
                    試合
                    {waiting > 0 && <span className={badge}>{waiting}</span>}
                  </Link>
                  <Link href={`/users/${me.username}`} className={link}>プロフィール</Link>
                  <Link href="/settings" className={link}>設定</Link>
                  {me.is_admin && (
                    <Link href="/admin" className={link}>
                      管理
                      {disputed > 0 && <span className={badge}>{disputed}</span>}
                    </Link>
                  )}
                </nav>
                <form action={logout} className="ml-auto">
                  <button className="btn">ログアウト</button>
                </form>
              </>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
