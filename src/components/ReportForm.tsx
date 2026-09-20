"use client";

import { useState, useTransition } from "react";
import { reportMatch } from "@/app/matches/actions";
import { STAGES } from "@/lib/data/stages";
import { CHARACTERS } from "@/lib/data/characters";

type Opponent = { id: string; display_name: string; username: string; banned_stages: string[] };
type Game = { winner: "" | "me" | "opponent"; stage: string; myCharacter: string; opponentCharacter: string };

const emptyGame = (): Game => ({ winner: "", stage: "", myCharacter: "", opponentCharacter: "" });

export default function ReportForm({
  opponents,
  myBanned,
  defaultOpponent,
}: {
  opponents: Opponent[];
  myBanned: string[];
  defaultOpponent?: string;
}) {
  const [opponentId, setOpponentId] = useState(defaultOpponent ?? "");
  const [games, setGames] = useState<Game[]>([emptyGame(), emptyGame(), emptyGame()]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const opponent = opponents.find((o) => o.id === opponentId);
  const banned = new Set([...myBanned, ...(opponent?.banned_stages ?? [])]);
  const stageOptions = STAGES.filter((s) => !banned.has(s));

  // 2ゲーム目までで 1-1 のときだけ 3ゲーム目を出す
  const first2 = games.slice(0, 2);
  const count = (who: "me" | "opponent", list: Game[]) => list.filter((g) => g.winner === who).length;
  const showThird = first2.every((g) => g.winner) && count("me", first2) === 1 && count("opponent", first2) === 1;
  const shown = showThird ? games : first2;
  const meWins = count("me", shown);
  const oppWins = count("opponent", shown);

  function update(i: number, patch: Partial<Game>) {
    setGames((gs) => gs.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  }

  function submit() {
    setError("");
    if (!opponentId) return setError("対戦相手を選んでください");
    if (shown.some((g) => !g.winner || !g.stage)) return setError("各ゲームの勝ち負けとステージを入力してください");
    if (shown.some((g) => banned.has(g.stage))) return setError("拒否されているステージが選ばれています。選び直してください");
    if (meWins !== 2 && oppWins !== 2) return setError("2勝したプレイヤーがいるように入力してください");
    startTransition(async () => {
      const res = await reportMatch({ opponentId, games: shown });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-md border border-lose/40 bg-lose/10 px-3 py-2 text-sm text-lose">
          {error}
        </p>
      )}

      <div className="panel">
        <label className="label" htmlFor="opponent">対戦相手</label>
        <select id="opponent" className="input" value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
          <option value="">選んでください</option>
          {opponents.map((o) => (
            <option key={o.id} value={o.id}>{o.display_name}（@{o.username}）</option>
          ))}
        </select>
        {banned.size > 0 && (
          <p className="mt-2 text-sm text-mute">拒否ステージ（選べません）: {[...banned].join("、")}</p>
        )}
      </div>

      {shown.map((g, i) => (
        <fieldset key={i} className="panel space-y-3">
          <legend className="px-1 font-bold">{i + 1}戦目</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`${i + 1}戦目の勝者`}>
            <button
              type="button"
              className={`btn ${g.winner === "me" ? "btn-primary" : ""}`}
              aria-pressed={g.winner === "me"}
              onClick={() => update(i, { winner: "me" })}
            >
              自分が勝った
            </button>
            <button
              type="button"
              className={`btn ${g.winner === "opponent" ? "btn-primary" : ""}`}
              aria-pressed={g.winner === "opponent"}
              onClick={() => update(i, { winner: "opponent" })}
            >
              相手が勝った
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">ステージ</label>
              <select className="input" value={banned.has(g.stage) ? "" : g.stage} onChange={(e) => update(i, { stage: e.target.value })}>
                <option value="">選んでください</option>
                {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">自分のキャラ（任意）</label>
              <select className="input" value={g.myCharacter} onChange={(e) => update(i, { myCharacter: e.target.value })}>
                <option value="">未選択</option>
                {CHARACTERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">相手のキャラ（任意）</label>
              <select className="input" value={g.opponentCharacter} onChange={(e) => update(i, { opponentCharacter: e.target.value })}>
                <option value="">未選択</option>
                {CHARACTERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={pending} onClick={submit}>
          {pending ? "送信中…" : "この結果を報告する"}
        </button>
        <span className="num text-sm text-mute">現在 自分 {meWins} - {oppWins} 相手</span>
      </div>
      <p className="text-sm text-mute">報告すると相手に承認依頼が届きます。相手が承認するとレートが動きます。</p>
    </div>
  );
}
