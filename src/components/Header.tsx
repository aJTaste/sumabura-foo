import Link from "next/link";
import NavLinks, { type NavItem } from "@/components/NavLinks";
import LogoutForm from "@/components/LogoutForm";
import VersionBadge from "@/components/VersionBadge";
import { WaitingBadge, DisputedBadge, prefetchWaiting } from "@/components/Badges";
import { getMe, getUserId, type Me } from "@/lib/auth";

// ヘッダーとナビは、レイアウトの外に切り出して Suspense で包んでいる。
// レイアウトが自分のプロフィールを待つ間に、ページ本体の取得を止めないため（両方が同時に走る）。

// ボタン（バージョン表示）はリンクの中に入れられないので、ロゴ・サイト名・バージョンを別々に並べている。
// 横幅はこれまでと同じなので、スマホでも右側のボタンを押し出さない。
const BRAND = (
  <div className="flex items-center gap-2">
    <Link
      href="/"
      aria-hidden
      tabIndex={-1}
      className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-black text-white"
    >
      S
    </Link>
    <div className="flex flex-col items-start">
      <Link href="/" className="text-base font-bold leading-none">
        スマブラ レート
      </Link>
      <VersionBadge />
    </div>
  </div>
);

// pt-[env(safe-area-inset-top)] と safe-x は、ノッチやステータスバーに隠れないための余白（ふつうの画面では 0）
const SHELL = "sticky top-0 z-20 border-b border-line bg-panel/85 pt-[env(safe-area-inset-top)] backdrop-blur";
const ROW = "safe-x mx-auto flex max-w-4xl items-center gap-3 py-2.5";

function navItems(me: Me, variant: "top" | "bottom"): NavItem[] {
  return [
    { href: "/", label: "ランキング", icon: "🏆" },
    { href: "/battle", label: "対戦", icon: "⚔️", badge: <WaitingBadge userId={me.id} variant={variant} /> },
    { href: "/tournaments", label: "大会", icon: "🏅" },
    { href: "/news", label: "お知らせ", icon: "📢" },
    { href: `/users/${me.username}`, label: "プロフィール", icon: "👤" },
  ];
}

// プロフィールが届くまでの仮のヘッダー（ロゴだけ。高さは本物と同じなので、表示が動かない）
export function HeaderFallback() {
  return (
    <header className={SHELL}>
      <div className={ROW}>{BRAND}</div>
    </header>
  );
}

async function loadMe() {
  // ユーザーIDはログイン情報からその場で分かるので、プロフィールの取得を待たずに数字の取得を始められる
  const userId = await getUserId();
  if (userId) prefetchWaiting(userId);
  return getMe();
}

export async function Header() {
  const me = await loadMe();
  return (
    <header className={SHELL}>
      <div className={ROW}>
        {BRAND}
        {me && (
          <>
            <NavLinks items={navItems(me, "top")} variant="top" />
            <div className="ml-auto flex items-center gap-1.5">
              {me.is_admin && (
                <Link href="/admin" className="btn min-h-9 px-2.5">
                  管理
                  <DisputedBadge userId={me.id} />
                </Link>
              )}
              <Link href="/rules" className="btn min-h-9 px-2.5">ルール</Link>
              <LogoutForm />
            </div>
          </>
        )}
      </div>
    </header>
  );
}

// スマホ用の下のナビ
export async function BottomNav() {
  const me = await loadMe();
  return me ? <NavLinks items={navItems(me, "bottom")} variant="bottom" /> : null;
}
