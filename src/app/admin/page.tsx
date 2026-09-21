import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MatchCard from "@/components/MatchCard";
import ErrorNote from "@/components/ErrorNote";
import { MATCH_SELECT, reportText, type MatchRow } from "@/lib/types";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user!.id).single();
  if (!me?.is_admin) redirect("/");

  const { data } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .in("status", ["pending", "disputed"])
    .order("created_at", { ascending: true });
  const matches = (data ?? []) as unknown as MatchRow[];
  const disputed = matches.filter((m) => m.status === "disputed");

  // 大会の保留（勝者の指定は各大会のページで行う）
  const { data: tRows } = await supabase
    .from("tournament_matches")
    .select(
      "id, tournament_id, round, a_report, b_report, a:profiles!tournament_matches_player_a_fkey(display_name), b:profiles!tournament_matches_player_b_fkey(display_name), t:tournaments(title)"
    )
    .eq("status", "disputed");
  const tDisputed = (tRows ?? []) as unknown as {
    id: string;
    tournament_id: string;
    round: number;
    a_report: string | null;
    b_report: string | null;
    a: { display_name: string } | null;
    b: { display_name: string } | null;
    t: { title: string } | null;
  }[];
  const playing = matches.filter((m) => m.status === "pending");

  return (
    <div className="space-y-6">
      <ErrorNote message={error} />
      <section className="space-y-3">
        <h1 className="text-xl font-bold">保留中の対戦（入力の食い違い）</h1>
        <p className="text-sm text-mute">
          双方の入力が一致しなかった対戦です。当事者は入力し直すこともできます。話し合っても合わないときは、確認したうえで、どちらかの入力を採用して確定するか、無効にしてください。
        </p>
        {disputed.length === 0 && <p className="panel text-sm text-mute">保留中の対戦はありません。</p>}
        {disputed.map((m) => <MatchCard key={m.id} m={m} admin />)}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">大会の保留</h2>
        {tDisputed.length === 0 && <p className="panel text-sm text-mute">保留中の大会の試合はありません。</p>}
        {tDisputed.map((m) => (
          <article key={m.id} className="panel text-sm">
            <p>
              <Link href={`/tournaments/${m.tournament_id}`} className="font-bold hover:underline">{m.t?.title}</Link>
              <span className="ml-2 text-mute">{m.a?.display_name} vs {m.b?.display_name}</span>
            </p>
            <p className="mt-1 text-mute">
              {m.a?.display_name}「{reportText(m.a_report)}」/ {m.b?.display_name}「{reportText(m.b_report)}」
            </p>
            <Link href={`/tournaments/${m.tournament_id}`} className="btn mt-2">大会のページで勝者を決める</Link>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">対戦中</h2>
        <p className="text-sm text-mute">放置されている対戦は、ここから無効にできます（レートは動きません）。</p>
        {playing.length === 0 && <p className="panel text-sm text-mute">対戦中の試合はありません。</p>}
        {playing.map((m) => <MatchCard key={m.id} m={m} admin />)}
      </section>
    </div>
  );
}
