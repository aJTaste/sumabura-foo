import { Suspense, cache } from "react";
import { getSupabase } from "@/lib/auth";
import { challengeCutoff } from "@/lib/types";

// ヘッダーの数字バッジ。
// 数字を待たずにヘッダーとページを先に表示し、数字だけ後から出すために Suspense で包んでいる。

type Variant = "top" | "bottom" | "admin";

const CLS: Record<Variant, string> = {
  top: "ml-1 rounded-full bg-lose px-1.5 text-xs font-bold text-white",
  bottom: "absolute right-[22%] top-1 rounded-full bg-lose px-1.5 text-[10px] font-bold text-white",
  admin: "rounded-full bg-lose px-1.5 text-xs font-bold text-white",
};

// 上下2つのナビで同じ数字を使っても、問い合わせは1回
const waitingCount = cache(async (userId: string) => {
  const supabase = await getSupabase();
  const { count } = await supabase
    .from("challenges")
    .select("from_user", { count: "exact", head: true })
    .eq("to_user", userId)
    .gt("created_at", challengeCutoff());
  return count ?? 0;
});

const disputedCount = cache(async () => {
  const supabase = await getSupabase();
  const [{ count: d1 }, { count: d2 }] = await Promise.all([
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "disputed"),
    supabase.from("tournament_matches").select("id", { count: "exact", head: true }).eq("status", "disputed"),
  ]);
  return (d1 ?? 0) + (d2 ?? 0);
});

/** バッジの数字を、ヘッダーの準備と同時に取りに行き始める（結果は cache に残り、あとで表示側が受け取る） */
export function prefetchWaiting(userId: string) {
  waitingCount(userId).catch(() => {});
}

async function Count({ kind, userId, variant }: { kind: "waiting" | "disputed"; userId: string; variant: Variant }) {
  const n = kind === "waiting" ? await waitingCount(userId) : await disputedCount();
  return n > 0 ? <span className={CLS[variant]}>{n}</span> : null;
}

/** あなたを選んでいる人の数（対戦の合図） */
export function WaitingBadge({ userId, variant }: { userId: string; variant: "top" | "bottom" }) {
  return (
    <Suspense fallback={null}>
      <Count kind="waiting" userId={userId} variant={variant} />
    </Suspense>
  );
}

/** 管理者向け: 裁定が必要な対戦・大会の試合の数 */
export function DisputedBadge({ userId }: { userId: string }) {
  return (
    <Suspense fallback={null}>
      <Count kind="disputed" userId={userId} variant="admin" />
    </Suspense>
  );
}
