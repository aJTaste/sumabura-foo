import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MatchCard from "@/components/MatchCard";
import { MATCH_SELECT, type MatchRow } from "@/lib/types";

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meId = user!.id;

  const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  if (!p) notFound();

  const { data } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("status", "confirmed")
    .or(`player_a.eq.${p.id},player_b.eq.${p.id}`)
    .order("created_at", { ascending: false })
    .limit(100);
  const matches = (data ?? []) as unknown as MatchRow[];

  // 実際に使ったキャラの集計（ゲーム単位）
  const usage = new Map<string, { games: number; wins: number }>();
  for (const m of matches) {
    for (const g of m.match_games) {
      const ch = m.player_a === p.id ? g.a_character : g.b_character;
      if (!ch) continue;
      const u = usage.get(ch) ?? { games: 0, wins: 0 };
      u.games += 1;
      if (g.winner_id === p.id) u.wins += 1;
      usage.set(ch, u);
    }
  }
  const topChars = [...usage.entries()].sort((a, b) => b[1].games - a[1].games).slice(0, 5);

  const total = p.wins + p.losses;
  const winRate = total ? Math.round((p.wins / total) * 100) : null;
  const isMe = p.id === meId;

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-2xl font-bold">{p.display_name}</h1>
          <span className="text-mute">@{p.username}</span>
          {p.is_admin && <span className="text-xs text-hold">管理者</span>}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-mute">レート</dt>
            <dd className="num text-3xl font-bold">{p.rating}</dd>
          </div>
          <div>
            <dt className="text-sm text-mute">最高レート</dt>
            <dd className="num text-3xl font-bold">{p.max_rating}</dd>
          </div>
          <div>
            <dt className="text-sm text-mute">勝-敗</dt>
            <dd className="num text-3xl font-bold">{p.wins}-{p.losses}</dd>
          </div>
          <div>
            <dt className="text-sm text-mute">勝率</dt>
            <dd className="num text-3xl font-bold">{winRate == null ? "-" : `${winRate}%`}</dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-2">
          {isMe ? (
            <Link href="/settings" className="btn">プロフィールを編集</Link>
          ) : (
            <Link href={`/matches/new?opponent=${p.id}`} className="btn btn-primary">この人との結果を報告</Link>
          )}
        </div>
      </section>

      <section className="panel space-y-3">
        <div>
          <h2 className="text-sm text-mute">自己紹介</h2>
          <p className="mt-1 whitespace-pre-wrap">{p.bio || "まだ書かれていません"}</p>
        </div>
        <div>
          <h2 className="text-sm text-mute">メインキャラ</h2>
          <p className="mt-1">{p.main_characters.join("、") || "未設定"}</p>
        </div>
        <div>
          <h2 className="text-sm text-mute">拒否ステージ</h2>
          <p className="mt-1">{p.banned_stages.join("、") || "なし"}</p>
        </div>
      </section>

      <section className="panel">
        <h2 className="mb-2 font-bold">よく使ったキャラ（確定した試合から集計）</h2>
        {topChars.length === 0 ? (
          <p className="text-sm text-mute">キャラ付きの確定試合がまだありません。</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {topChars.map(([name, u]) => (
              <li key={name} className="flex gap-3">
                <span className="w-40 font-medium">{name}</span>
                <span className="num text-mute">{u.games}戦 {Math.round((u.wins / u.games) * 100)}%勝ち</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">最近の試合</h2>
        {matches.length === 0 && <p className="text-sm text-mute">確定した試合がありません。</p>}
        {matches.slice(0, 10).map((m) => (
          <MatchCard key={m.id} m={m} meId={meId} back={`/users/${p.username}`} />
        ))}
      </section>
    </div>
  );
}
