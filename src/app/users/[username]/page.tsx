import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MatchCard from "@/components/MatchCard";
import ErrorNote from "@/components/ErrorNote";
import CharacterPicker from "@/components/CharacterPicker";
import { MATCH_SELECT, type MatchRow } from "@/lib/types";
import { CHARACTERS } from "@/lib/data/characters";
import { STAGES, MAX_BANNED_STAGES, MAX_ALT_CHARACTERS } from "@/lib/data/stages";
import { saveProfile, chooseFromProfile } from "../actions";

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { username } = await params;
  const { error, saved } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  if (!p) notFound();
  const isMe = p.id === user!.id;

  const { data } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("status", "confirmed")
    .or(`player_a.eq.${p.id},player_b.eq.${p.id}`)
    .order("created_at", { ascending: false })
    .limit(10);
  const matches = (data ?? []) as unknown as MatchRow[];

  const total = p.wins + p.losses;
  const winRate = total ? Math.round((p.wins / total) * 100) : null;

  return (
    <div className="space-y-6">
      <ErrorNote message={error} />
      {saved && (
        <p role="status" className="rounded-md border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
          保存しました
        </p>
      )}

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
        <div className="mt-4 flex flex-wrap gap-2">
          {isMe ? (
            <Link href="/rules" className="btn">ルールを見る</Link>
          ) : (
            <form action={chooseFromProfile}>
              <input type="hidden" name="target" value={p.id} />
              <button className="btn btn-primary">この人と対戦する</button>
            </form>
          )}
        </div>
      </section>

      {isMe ? (
        <form action={saveProfile} className="panel space-y-5">
          <h2 className="text-lg font-bold">プロフィールを編集</h2>

          <div>
            <label className="label" htmlFor="displayName">表示名</label>
            <input id="displayName" name="displayName" className="input" maxLength={20} defaultValue={p.display_name} required />
          </div>

          <div>
            <label className="label" htmlFor="bio">自己紹介（500文字まで）</label>
            <textarea id="bio" name="bio" className="input" rows={4} maxLength={500} defaultValue={p.bio} />
          </div>

          <div>
            <label className="label" htmlFor="first">1戦目に使用するキャラ（1体）</label>
            <select id="first" name="first" className="input" defaultValue={p.first_character ?? ""}>
              <option value="">未選択</option>
              {CHARACTERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <span className="label">変更する場合のキャラ（{MAX_ALT_CHARACTERS}体まで）</span>
            <CharacterPicker name="alt" options={CHARACTERS} initial={p.alt_characters} max={MAX_ALT_CHARACTERS} />
          </div>

          <fieldset>
            <legend className="label">拒否ステージ（{MAX_BANNED_STAGES}つまで。相手はこのステージを選べません）</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {STAGES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="banned" value={s} defaultChecked={p.banned_stages.includes(s)} />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center gap-3">
            <button className="btn btn-primary">保存する</button>
            <span className="text-sm text-mute">変更は次の対戦から反映されます。</span>
          </div>
        </form>
      ) : (
        <section className="panel space-y-3">
          <div>
            <h2 className="text-sm text-mute">自己紹介</h2>
            <p className="mt-1 whitespace-pre-wrap">{p.bio || "まだ書かれていません"}</p>
          </div>
          <div>
            <h2 className="text-sm text-mute">1戦目に使用するキャラ</h2>
            <p className="mt-1">{p.first_character ?? "未設定"}</p>
          </div>
          <div>
            <h2 className="text-sm text-mute">変更する場合のキャラ</h2>
            <p className="mt-1">{p.alt_characters.join("、") || "未設定"}</p>
          </div>
          <div>
            <h2 className="text-sm text-mute">拒否ステージ</h2>
            <p className="mt-1">{p.banned_stages.join("、") || "なし"}</p>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-bold">最近の試合</h2>
        {matches.length === 0 && <p className="text-sm text-mute">確定した試合がありません。</p>}
        {matches.map((m) => <MatchCard key={m.id} m={m} />)}
      </section>
    </div>
  );
}
