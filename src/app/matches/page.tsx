import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MatchCard from "@/components/MatchCard";
import ErrorNote from "@/components/ErrorNote";
import { MATCH_SELECT, type MatchRow } from "@/lib/types";

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meId = user!.id;

  const { data } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .or(`player_a.eq.${meId},player_b.eq.${meId}`)
    .order("created_at", { ascending: false })
    .limit(50);
  const matches = (data ?? []) as unknown as MatchRow[];

  const toApprove = matches.filter((m) => m.status === "pending" && m.player_b === meId);
  const rest = matches.filter((m) => !toApprove.includes(m));

  return (
    <div className="space-y-6">
      <ErrorNote message={error} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">自分の試合</h1>
        <Link href="/matches/new" className="btn btn-primary">結果を報告する</Link>
      </div>

      {toApprove.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold">あなたの承認を待っています</h2>
          {toApprove.map((m) => (
            <MatchCard key={m.id} m={m} meId={meId} back="/matches" />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-bold">履歴</h2>
        {rest.length === 0 && <p className="text-sm text-mute">まだ試合がありません。対戦したら「結果を報告する」から入力しましょう。</p>}
        {rest.map((m) => (
          <MatchCard key={m.id} m={m} meId={meId} back="/matches" />
        ))}
      </section>
    </div>
  );
}
