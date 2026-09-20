import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MatchCard from "@/components/MatchCard";
import ErrorNote from "@/components/ErrorNote";
import { MATCH_SELECT, type MatchRow } from "@/lib/types";

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
    .eq("status", "disputed")
    .order("created_at", { ascending: true });
  const matches = (data ?? []) as unknown as MatchRow[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">保留中の試合</h1>
      <ErrorNote message={error} />
      <p className="text-sm text-mute">
        報告者の結果に相手が異議を出した試合です。当事者に確認してから裁定してください。「勝敗を逆にして確定」を選ぶと、ゲームごとの詳細は破棄されます。
      </p>
      {matches.length === 0 && <p className="panel text-sm text-mute">保留中の試合はありません。</p>}
      {matches.map((m) => (
        <MatchCard key={m.id} m={m} meId={user!.id} back="/admin" admin />
      ))}
    </div>
  );
}
