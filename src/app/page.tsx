import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TOURNAMENT_STATUS, fmtDateTime, type Tournament } from "@/lib/types";

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { data: news }, { data: cups }] = await Promise.all([
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

      <div className="space-y-4">
        <h1 className="text-xl font-bold">ランキング</h1>
        <div className="panel overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-mute">
              <tr>
                <th className="px-3 py-2 font-normal">順位</th>
                <th className="px-3 py-2 font-normal">プレイヤー</th>
                <th className="px-3 py-2 text-right font-normal">レート</th>
                <th className="hidden px-3 py-2 text-right font-normal sm:table-cell">最高</th>
                <th className="px-3 py-2 text-right font-normal">勝-敗</th>
                <th className="hidden px-3 py-2 font-normal md:table-cell">1戦目キャラ</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className={`border-b border-line last:border-0 ${p.id === user?.id ? "bg-accent/5" : ""}`}>
                  <td className="num px-3 py-2.5 text-lg font-bold">{p.rank}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/users/${p.username}`} className="font-medium hover:underline">
                      {p.display_name}
                    </Link>
                  </td>
                  <td className="num px-3 py-2.5 text-right text-lg font-bold">{p.rating}</td>
                  <td className="num hidden px-3 py-2.5 text-right text-mute sm:table-cell">{p.max_rating}</td>
                  <td className="num px-3 py-2.5 text-right">{p.wins}-{p.losses}</td>
                  <td className="hidden px-3 py-2.5 text-mute md:table-cell">{p.first_character ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-mute">初期レートは1500。双方が結果を入力して一致した対戦のみ、レートに反映されます。</p>
      </div>
    </div>
  );
}
