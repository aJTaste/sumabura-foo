import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, rating, max_rating, wins, losses, main_characters")
    .order("rating", { ascending: false })
    .order("created_at", { ascending: true });

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
              <th className="hidden px-3 py-2 font-normal md:table-cell">使用キャラ</th>
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
                <td className="hidden px-3 py-2.5 text-mute md:table-cell">{p.main_characters.join("、") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-mute">初期レートは1500。承認された試合のみレートに反映されます。</p>
    </div>
  );
}
