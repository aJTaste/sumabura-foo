import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ErrorNote from "@/components/ErrorNote";
import { TOURNAMENT_STATUS, fmtDateTime, type Tournament } from "@/lib/types";
import { createTournament } from "./actions";

export default async function TournamentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user!.id).single();
  const isAdmin = !!me?.is_admin;

  const [{ data }, { data: entryRows }] = await Promise.all([
    supabase.from("tournaments").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("tournament_entries").select("tournament_id, user_id"),
  ]);
  const tournaments = (data ?? []) as Tournament[];
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const e of entryRows ?? []) {
    counts.set(e.tournament_id, (counts.get(e.tournament_id) ?? 0) + 1);
    if (e.user_id === user!.id) mine.add(e.tournament_id);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">大会</h1>
      <ErrorNote message={error} />

      {isAdmin && (
        <form action={createTournament} className="panel space-y-3">
          <h2 className="font-bold">大会を作る（管理者）</h2>
          <p className="text-sm text-mute">
            作成するとエントリーの受付が始まります。人数が集まったら大会のページから、トーナメント表を作成してください。
          </p>
          <div>
            <label className="label" htmlFor="title">大会名</label>
            <input id="title" name="title" className="input" maxLength={60} required />
          </div>
          <div>
            <label className="label" htmlFor="startsAt">開催日時（日本時間・任意）</label>
            <input id="startsAt" name="startsAt" type="datetime-local" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="description">説明・ルール（任意）</label>
            <textarea id="description" name="description" className="input" rows={3} maxLength={1000} />
          </div>
          <button className="btn btn-primary">大会を作る</button>
        </form>
      )}

      {tournaments.length === 0 && <p className="panel text-sm text-mute">大会はまだありません。</p>}
      <ul className="space-y-3">
        {tournaments.map((t) => {
          const st = TOURNAMENT_STATUS[t.status];
          return (
            <li key={t.id} className="panel">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/tournaments/${t.id}`} className="text-base font-bold hover:underline">{t.title}</Link>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                {mine.has(t.id) && <span className="text-xs text-win">エントリー済み</span>}
              </div>
              <p className="mt-1 text-sm text-mute">
                {t.starts_at ? `開催: ${fmtDateTime(t.starts_at)}` : "開催日時: 未定"}
                <span className="num ml-3">エントリー {counts.get(t.id) ?? 0}人</span>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
