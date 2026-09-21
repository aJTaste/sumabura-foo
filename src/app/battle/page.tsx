import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AutoRefresh from "@/components/AutoRefresh";
import BattleMatch from "@/components/BattleMatch";
import ErrorNote from "@/components/ErrorNote";
import { MATCH_SELECT, challengeCutoff, type MatchRow } from "@/lib/types";
import { selectOpponent, clearOpponent } from "./actions";

export default async function BattlePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meId = user!.id;

  // 進行中の対戦があれば、その画面を出す
  const { data: active } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .in("status", ["pending", "disputed"])
    .or(`player_a.eq.${meId},player_b.eq.${meId}`)
    .limit(1);
  const match = ((active ?? []) as unknown as MatchRow[])[0];

  if (match) {
    return (
      <div className="space-y-4">
        <AutoRefresh />
        <ErrorNote message={error} />
        <BattleMatch m={match} meId={meId} />
      </div>
    );
  }

  const [{ data: me }, { data: players }, { data: challenges }, { data: busyRows }] = await Promise.all([
    supabase.from("profiles").select("username, first_character").eq("id", meId).single(),
    supabase
      .from("profiles")
      .select("id, username, display_name, rating")
      .neq("id", meId)
      .order("rating", { ascending: false }),
    supabase.from("challenges").select("from_user, to_user").gt("created_at", challengeCutoff()),
    supabase.from("matches").select("player_a, player_b").in("status", ["pending", "disputed"]),
  ]);

  const myChoice = (challenges ?? []).find((c) => c.from_user === meId)?.to_user as string | undefined;
  const chosenBy = new Set((challenges ?? []).filter((c) => c.to_user === meId).map((c) => c.from_user as string));
  const busy = new Set((busyRows ?? []).flatMap((r) => [r.player_a as string, r.player_b as string]));
  const myChoiceName = (players ?? []).find((p) => p.id === myChoice)?.display_name;

  return (
    <div className="space-y-4">
      <AutoRefresh />
      <h1 className="text-xl font-bold">対戦</h1>
      <ErrorNote message={error} />
      <p className="text-sm text-mute">
        対戦したい相手を選んでください。相手もあなたを選ぶと対戦が始まります。相手の選択を待つ間は、この画面を開いたままにしてください。
      </p>

      {!me?.first_character && (
        <p className="rounded-md border border-hold/40 bg-hold/10 px-3 py-2 text-sm text-hold">
          1戦目に使うキャラが未設定です。<Link href={`/users/${me?.username}`} className="underline">プロフィール</Link>で、拒否ステージとキャラを設定してから対戦しましょう。
        </p>
      )}

      {myChoice && (
        <section className="panel flex flex-wrap items-center gap-3">
          <p className="text-sm">
            <strong>{myChoiceName}</strong> さんの選択を待っています（30分で自動的に解除されます）
          </p>
          <form action={clearOpponent} className="ml-auto">
            <button className="btn">選択を取り消す</button>
          </form>
        </section>
      )}

      <ul className="panel divide-y divide-line p-0">
        {(players ?? []).length === 0 && <li className="p-4 text-sm text-mute">ほかのプレイヤーがまだいません。</li>}
        {(players ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
            <Link href={`/users/${p.username}`} className="font-medium hover:underline">{p.display_name}</Link>
            <span className="num text-sm text-mute">{p.rating}</span>
            {chosenBy.has(p.id) && !busy.has(p.id) && (
              <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs text-accent">あなたを選んでいます</span>
            )}
            <span className="ml-auto">
              {busy.has(p.id) ? (
                <span className="text-sm text-mute">対戦中</span>
              ) : myChoice === p.id ? (
                <span className="text-sm text-mute">選択中</span>
              ) : (
                <form action={selectOpponent}>
                  <input type="hidden" name="target" value={p.id} />
                  <button className={`btn ${chosenBy.has(p.id) ? "btn-primary" : ""}`}>
                    {chosenBy.has(p.id) ? "対戦する" : "この人を選ぶ"}
                  </button>
                </form>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
