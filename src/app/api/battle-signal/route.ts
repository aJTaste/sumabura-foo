import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { challengeCutoff } from "@/lib/types";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

// 対戦画面のポーリング用: 状態が変わったかどうかだけを軽量に判定する。
// 3つの問い合わせは同時に投げる（待ち時間は1回分）。
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const meId = data?.claims?.sub;
  if (!meId) return NextResponse.json({ signal: "logout" }, { status: 401, headers: NO_STORE });

  const [{ data: active }, { data: challenges }, { data: busyRows }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, status, a_report, b_report")
      .in("status", ["pending", "disputed"])
      .or(`player_a.eq.${meId},player_b.eq.${meId}`)
      .limit(1),
    supabase
      .from("challenges")
      .select("from_user, to_user")
      .or(`from_user.eq.${meId},to_user.eq.${meId}`)
      .gt("created_at", challengeCutoff()),
    supabase.from("matches").select("player_a, player_b").in("status", ["pending", "disputed"]),
  ]);

  const m = (active ?? [])[0];
  if (m) {
    return NextResponse.json({ signal: `match:${m.id}:${m.status}:${m.a_report}:${m.b_report}` }, { headers: NO_STORE });
  }

  const relevant = (challenges ?? []).map((c) => `${c.from_user}>${c.to_user}`).sort();
  const busy = (busyRows ?? []).flatMap((r) => [r.player_a as string, r.player_b as string]).sort();
  return NextResponse.json({ signal: `idle:${relevant.join(",")}:${busy.join(",")}` }, { headers: NO_STORE });
}
