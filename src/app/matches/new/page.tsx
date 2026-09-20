import { createClient } from "@/lib/supabase/server";
import ReportForm from "@/components/ReportForm";

export default async function NewMatchPage({ searchParams }: { searchParams: Promise<{ opponent?: string }> }) {
  const { opponent } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: others } = await supabase
    .from("profiles")
    .select("id, display_name, username, banned_stages")
    .neq("id", user!.id)
    .order("display_name");
  const { data: me } = await supabase.from("profiles").select("banned_stages").eq("id", user!.id).single();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">対戦結果を報告する</h1>
      <p className="text-sm text-mute">3本勝負で2勝したほうがマッチの勝者です。ゲームごとの勝ち負けとステージを入力してください。</p>
      <ReportForm opponents={others ?? []} myBanned={me?.banned_stages ?? []} defaultOpponent={opponent} />
    </div>
  );
}
