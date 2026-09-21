import Link from "next/link";
import type { MatchRow, Setup } from "@/lib/types";
import { reportText } from "@/lib/types";
import { GAME1_STAGES, LATER_STAGES } from "@/lib/data/stages";
import { submitResult, setCancel } from "@/app/battle/actions";
import StageList from "@/components/StageList";
import ResultButtons from "@/components/ResultButtons";

export const EMPTY_SETUP: Setup = { banned_stages: [], first_character: null, alt_characters: [] };

export function CharacterBox({ title, setup }: { title: string; setup: Setup }) {
  return (
    <div className="panel space-y-1.5 text-sm">
      <h4 className="font-bold">{title}</h4>
      <p>
        <span className="text-mute">1戦目: </span>
        {setup.first_character ?? "未設定"}
      </p>
      <p>
        <span className="text-mute">変更する場合: </span>
        {setup.alt_characters.length ? setup.alt_characters.join("、") : "未設定"}
      </p>
    </div>
  );
}

export default function BattleMatch({ m, meId }: { m: MatchRow; meId: string }) {
  const iAmA = m.player_a === meId;
  const me = iAmA ? m.a : m.b;
  const opp = iAmA ? m.b : m.a;
  const mySetup = (iAmA ? m.a_setup : m.b_setup) ?? EMPTY_SETUP;
  const oppSetup = (iAmA ? m.b_setup : m.a_setup) ?? EMPTY_SETUP;
  const myReport = iAmA ? m.a_report : m.b_report;
  const oppReport = iAmA ? m.b_report : m.a_report;
  const myCancel = iAmA ? m.a_cancel : m.b_cancel;
  const oppCancel = iAmA ? m.b_cancel : m.a_cancel;
  const disputed = m.status === "disputed";

  let status: string;
  if (disputed) {
    status = `入力が食い違っています。あなたは「${reportText(myReport)}」、相手は「${reportText(oppReport)}」と入力しています。間違いに気づいたら、下のボタンで入力し直してください。一致すると確定します。話し合っても合わない場合は管理者が判断します。`;
  } else if (myReport && !oppReport) {
    status = `あなたの入力: 「${reportText(myReport)}」。相手の入力を待っています。`;
  } else if (!myReport && oppReport) {
    status = "相手が結果を入力しました。あなたも結果を入力してください。";
  } else {
    status = "対戦が始まりました。対戦が終わったら結果を入力してください。";
  }

  return (
    <div className="space-y-4">
      <section className="panel">
        <h1 className="text-xl font-bold">
          {me.display_name}
          <span className="num mx-2 font-normal text-mute">{me.rating}</span>
          vs
          <Link href={`/users/${opp.username}`} className="ml-2 hover:underline">{opp.display_name}</Link>
          <span className="num ml-2 font-normal text-mute">{opp.rating}</span>
        </h1>
        <p role="status" className={`mt-2 text-sm ${disputed ? "text-lose" : "text-mute"}`}>{status}</p>
      </section>

      <StageList
        title="1戦目のステージ"
        stages={GAME1_STAGES}
        mine={mySetup.banned_stages}
        theirs={oppSetup.banned_stages}
      />
      <StageList
        title="2戦目・3戦目のステージ"
        note="2戦目は1戦目に使ったステージを除いて敗者が選びます。3戦目は1戦目のステージも選べます。"
        stages={LATER_STAGES}
        mine={mySetup.banned_stages}
        theirs={oppSetup.banned_stages}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <CharacterBox title="あなたのキャラ" setup={mySetup} />
        <CharacterBox title={`${opp.display_name}のキャラ`} setup={oppSetup} />
      </div>

      <section className="panel">
        <h2 className="font-bold">結果を入力</h2>
        <p className="mb-3 mt-1 text-sm text-mute">
          2本先取のマッチ全体で、あなたが勝ったか負けたかを選んでください。各ゲームの結果は入力不要です。間違えたときは、押し直せば入力し直せます。
        </p>
        <ResultButtons action={submitResult} matchId={m.id} myReport={myReport} />
      </section>

      <section className="panel text-sm">
        {!myCancel && !oppCancel && (
          <p className="mb-2 text-mute">相手が来ない、回線が切れたなど、対戦できないとき。相手も押すと中止になり、レートは動きません。</p>
        )}
        {!myCancel && oppCancel && <p className="mb-2 text-hold">相手が対戦の中止を申請しています。</p>}
        {myCancel && <p className="mb-2 text-hold">中止を申請中です。相手も押すと中止になります。</p>}
        <form action={setCancel}>
          <input type="hidden" name="matchId" value={m.id} />
          <input type="hidden" name="on" value={myCancel ? "0" : "1"} />
          <button className="btn btn-danger">
            {myCancel ? "中止の申請を取り下げる" : oppCancel ? "中止に同意する" : "対戦を中止する"}
          </button>
        </form>
      </section>
    </div>
  );
}
