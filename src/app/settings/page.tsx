import { createClient } from "@/lib/supabase/server";
import ErrorNote from "@/components/ErrorNote";
import { STAGES, MAX_BANNED_STAGES } from "@/lib/data/stages";
import { CHARACTERS } from "@/lib/data/characters";
import { saveSettings } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: p } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">プロフィール設定</h1>
      <ErrorNote message={error} />
      {saved && (
        <p role="status" className="rounded-md border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
          保存しました
        </p>
      )}

      <form action={saveSettings} className="panel space-y-5">
        <div>
          <label className="label" htmlFor="displayName">表示名</label>
          <input id="displayName" name="displayName" className="input" maxLength={20} defaultValue={p.display_name} required />
        </div>

        <div>
          <label className="label" htmlFor="bio">自己紹介（500文字まで）</label>
          <textarea id="bio" name="bio" className="input" rows={4} maxLength={500} defaultValue={p.bio} />
        </div>

        <fieldset>
          <legend className="label">メインキャラ（3人まで）</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <select key={i} name="main" className="input" defaultValue={p.main_characters[i] ?? ""} aria-label={`メインキャラ${i + 1}`}>
                <option value="">未選択</option>
                {CHARACTERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            ))}
          </div>
        </fieldset>

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

        <button className="btn btn-primary">保存する</button>
      </form>
    </div>
  );
}
