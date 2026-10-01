import Link from "next/link";
import { getSupabase, getUserId } from "@/lib/auth";
import { TOURNAMENT_STATUS, fmtDateTime, type Tournament } from "@/lib/types";

const MEDAL: Record<number, string> = {
  1: "bg-amber-300 text-amber-950",
  2: "bg-slate-300 text-slate-900",
  3: "bg-orange-300 text-orange-950",
};

export default async function RankingPage() {
  const supabase = await getSupabase();

  const [userId, { data }, { data: news }, { data: cups }] = await Promise.all([
    getUserId(),
    supabase
      .from("profiles")
      .select("id, username, display_name, rating, max_rating, wins, losses, first_character")
      .order("rating", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("announcements").select("id, title, created_at").order("created_at", { ascending: false }).limit(3),
    supabase
      .from("tournaments")
      .select("id, title, status, starts_at")
      .in("status", ["open", "running"])
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  // 同レートは同順位
  let rank = 0;
  let prev: number | null = null;
  const players = (data ?? []).map((p, i) => {
    if (p.rating !== prev) {
      rank = i + 1;
      prev = p.rating;
    }
    return { ...p, rank };
  });

  return (
    <div className="space-y-6">
      {(cups ?? []).length > 0 && (
        <section className="panel space-y-2">
          <h2 className="font-bold">開催中・募集中の大会</h2>
          <ul className="space-y-1 text-sm">
            {(cups as Pick<Tournament, "id" | "title" | "status" | "starts_at">[]).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/tournaments/${t.id}`} className="font-medium hover:underline">{t.title}</Link>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${TOURNAMENT_STATUS[t.status].cls}`}>
                  {TOURNAMENT_STATUS[t.status].label}
                </span>
                {t.starts_at && <span className="text-mute">{fmtDateTime(t.starts_at)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(news ?? []).length > 0 && (
        <section className="panel space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">お知らせ</h2>
            <Link href="/news" className="text-sm text-accent hover:underline">すべて見る</Link>
          </div>
          <ul className="space-y-1 text-sm">
            {(news ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap gap-x-3">
                <time className="text-mute" dateTime={a.created_at}>{fmtDateTime(a.created_at)}</time>
                <Link href="/news" className="hover:underline">{a.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <h1 className="text-xl font-bold">ランキング</h1>
          <p className="text-xs text-mute">{players.length}人が参加中</p>
        </div>
        {players.length === 0 && <p className="panel text-sm text-mute">まだプレイヤーがいません。</p>}
        <ol className="space-y-2">
          {players.map((p) => {
            const total = p.wins + p.losses;
            const rate = total ? Math.round((p.wins / total) * 100) : null;
            const isMe = p.id === userId;
            return (
              <li key={p.id}>
                <Link
                  href={`/users/${p.username}`}
                  className={`flex items-center gap-3 rounded-xl border bg-panel p-3 shadow-card transition hover:-translate-y-px ${
                    isMe ? "border-accent ring-1 ring-accent/40" : "border-line"
                  }`}
                >
                  <span className={`num grid size-10 shrink-0 place-items-center rounded-full text-base font-bold ${MEDAL[p.rank] ?? "bg-paper text-mute"}`}>
                    {p.rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-bold">{p.display_name}</span>
                      {isMe && <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">あなた</span>}
                    </span>
                    <span className="block truncate text-xs text-mute">
                      {p.first_character ?? "キャラ未設定"} ・ {p.wins}勝{p.losses}敗{rate != null && ` ・ 勝率${rate}%`}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="num block text-xl font-bold leading-none">{p.rating}</span>
                    <span className="num text-[11px] text-mute">最高 {p.max_rating}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-mute">初期レートは1500。双方が結果を入力して一致した対戦のみ、レートに反映されます。</p>
      </div>
    </div>
  );
}
