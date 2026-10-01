import Link from "next/link";
import NavLinks, { type NavItem } from "@/components/NavLinks";
import SubmitButton from "@/components/SubmitButton";
import { WaitingBadge, DisputedBadge, prefetchWaiting } from "@/components/Badges";
import { getMe, getUserId, type Me } from "@/lib/auth";
import { logout } from "@/app/actions";

// ヘッダーとナビは、レイアウトの外に切り出して Suspense で包んでいる。
// レイアウトが自分のプロフィールを待つ間に、ページ本体の取得を止めないため（両方が同時に走る）。

const BRAND = (
  <Link href="/" className="flex items-center gap-2 font-bold">
    <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-black text-white">S</span>
    <span className="text-base">スマブラ レート</span>
  </Link>
);

const SHELL = "sticky top-0 z-20 border-b border-line bg-panel/85 backdrop-blur";
const ROW = "mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5";

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
              <form action={logout}>
                <SubmitButton className="btn min-h-9 px-2.5">ログアウト</SubmitButton>
              </form>
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
