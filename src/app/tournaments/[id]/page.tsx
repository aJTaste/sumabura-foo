import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ErrorNote from "@/components/ErrorNote";
import Bracket from "@/components/Bracket";
import ResultButtons from "@/components/ResultButtons";
import StageList from "@/components/StageList";
import { CharacterBox, EMPTY_SETUP } from "@/components/BattleMatch";
import { GAME1_STAGES, LATER_STAGES } from "@/lib/data/stages";
import {
  TMATCH_SELECT,
  TOURNAMENT_STATUS,
  fmtDateTime,
  reportText,
  roundLabel,
  type TMatch,
  type Tournament,
} from "@/lib/types";
import {
  enterTournament,
  leaveTournament,
  removeEntry,
  createBracket,
  cancelTournament,
  submitTournamentResult,
} from "../actions";

type EntryRow = { user_id: string; p: { username: string; display_name: string; rating: number } };

export default async function TournamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meId = user!.id;

  const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
  if (!t) notFound();
  const tournament = t as Tournament;

  const [{ data: me }, { data: entryRows }, { data: matchRows }] = await Promise.all([
    supabase.from("profiles").select("is_admin").eq("id", meId).single(),
    supabase
      .from("tournament_entries")
      .select("user_id, p:profiles!tournament_entries_user_id_fkey(username, display_name, rating)")
      .eq("tournament_id", id)
      .order("created_at"),
    supabase.from("tournament_matches").select(TMATCH_SELECT).eq("tournament_id", id).order("round").order("slot"),
  ]);
  const isAdmin = !!me?.is_admin;
  const entries = (entryRows ?? []) as unknown as EntryRow[];
  const matches = (matchRows ?? []) as unknown as TMatch[];
  const totalRounds = matches.reduce((max, m) => Math.max(max, m.round), 0);
  const entered = entries.some((e) => e.user_id === meId);
  const st = TOURNAMENT_STATUS[tournament.status];

  const finalMatch = matches.find((m) => m.round === totalRounds);
  const champion =
    tournament.status === "finished" && finalMatch
      ? finalMatch.winner_id === finalMatch.player_a
        ? finalMatch.a
        : finalMatch.b
      : null;

  // 自分の、いま対戦できる試合
  const myMatch =
    tournament.status === "running"
      ? matches.find((m) => (m.status === "ready" || m.status === "disputed") && (m.player_a === meId || m.player_b === meId))
      : undefined;
  let myPanel: React.ReactNode = null;
  if (myMatch) {
    const iAmA = myMatch.player_a === meId;
    const opp = iAmA ? myMatch.b : myMatch.a;
    const oppId = (iAmA ? myMatch.player_b : myMatch.player_a)!;
    const myReport = iAmA ? myMatch.a_report : myMatch.b_report;
    const oppReport = iAmA ? myMatch.b_report : myMatch.a_report;
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, banned_stages, first_character, alt_characters")
      .in("id", [meId, oppId]);
    const setupOf = (pid: string) => {
      const p = (profs ?? []).find((x) => x.id === pid);
      return p ? { banned_stages: p.banned_stages, first_character: p.first_character, alt_characters: p.alt_characters } : EMPTY_SETUP;
    };
    const mine = setupOf(meId);
    const theirs = setupOf(oppId);

    const disputed = myMatch.status === "disputed";
    let status: string;
    if (disputed) {
      status = `入力が食い違っています。あなたは「${reportText(myReport)}」、相手は「${reportText(oppReport)}」と入力しています。間違いに気づいたら入力し直してください。一致すると決着します。合わない場合は管理者が判断します。`;
    } else if (myReport && !oppReport) {
      status = `あなたの入力: 「${reportText(myReport)}」。相手の入力を待っています。`;
    } else if (!myReport && oppReport) {
      status = "相手が結果を入力しました。あなたも結果を入力してください。";
    } else {
      status = "対戦が終わったら、結果を入力してください。";
    }

    myPanel = (
      <section className="space-y-3">
        <div className="panel">
          <h2 className="text-lg font-bold">
            あなたの試合（{roundLabel(myMatch.round, totalRounds)}）
            <span className="mx-2 font-normal">vs</span>
            {opp && <Link href={`/users/${opp.username}`} className="hover:underline">{opp.display_name}</Link>}
          </h2>
          <p role="status" className={`mt-2 text-sm ${disputed ? "text-lose" : "text-mute"}`}>{status}</p>
        </div>
        <StageList title="1戦目のステージ" stages={GAME1_STAGES} mine={mine.banned_stages} theirs={theirs.banned_stages} />
        <StageList
          title="2戦目・3戦目のステージ"
          note="2戦目は1戦目に使ったステージを除いて敗者が選びます。3戦目は1戦目のステージも選べます。"
          stages={LATER_STAGES}
          mine={mine.banned_stages}
          theirs={theirs.banned_stages}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <CharacterBox title="あなたのキャラ" setup={mine} />
          <CharacterBox title={`${opp?.display_name ?? "相手"}のキャラ`} setup={theirs} />
        </div>
        <div className="panel">
          <h3 className="font-bold">結果を入力</h3>
          <p className="mb-3 mt-1 text-sm text-mute">2本先取のマッチ全体で、あなたが勝ったか負けたかを選んでください。押し直せば入力し直せます。</p>
          <ResultButtons action={submitTournamentResult} matchId={myMatch.id} extra={{ tid: id }} myReport={myReport} />
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <ErrorNote message={error} />

      <section className="panel">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{tournament.title}</h1>
          <span className={`rounded-full border px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
        </div>
        <p className="mt-1 text-sm text-mute">
          {tournament.starts_at ? `開催: ${fmtDateTime(tournament.starts_at)}` : "開催日時: 未定"}
        </p>
        {tournament.description && <p className="mt-3 whitespace-pre-wrap leading-relaxed">{tournament.description}</p>}
        <p className="mt-3 text-xs text-mute">大会の試合はレートには反映されません。</p>
      </section>

      {champion && (
        <p className="rounded-md border border-win/40 bg-win/10 px-4 py-3 text-lg font-bold text-win">
          優勝: {champion.display_name}
        </p>
      )}
      {tournament.status === "cancelled" && <p className="panel text-sm text-mute">この大会は中止になりました。</p>}

      {myPanel}

      {(tournament.status === "running" || tournament.status === "finished") && (
        <section className="space-y-2">
          <h2 className="font-bold">トーナメント表</h2>
          <Bracket matches={matches} totalRounds={totalRounds} tid={id} isAdmin={isAdmin} />
        </section>
      )}

      <section className="panel space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-bold">エントリー<span className="num ml-2 font-normal text-mute">{entries.length}人</span></h2>
          {tournament.status === "open" && (
            <form action={entered ? leaveTournament : enterTournament} className="ml-auto">
              <input type="hidden" name="tid" value={id} />
              <button className={`btn ${entered ? "" : "btn-primary"}`}>
                {entered ? "エントリーを取り消す" : "エントリーする"}
              </button>
            </form>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-mute">まだエントリーがありません。</p>
        ) : (
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {entries.map((e) => (
              <li key={e.user_id} className="flex items-center gap-2 border-b border-line py-1.5 text-sm">
                <Link href={`/users/${e.p.username}`} className="hover:underline">{e.p.display_name}</Link>
                <span className="num text-mute">{e.p.rating}</span>
                {isAdmin && tournament.status === "open" && (
                  <form action={removeEntry} className="ml-auto">
                    <input type="hidden" name="tid" value={id} />
                    <input type="hidden" name="userId" value={e.user_id} />
                    <button className="btn btn-danger px-2 py-0.5 text-xs">削除</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (tournament.status === "open" || tournament.status === "running") && (
        <section className="panel space-y-4">
          <h2 className="font-bold">管理者メニュー</h2>
          {tournament.status === "open" && (
            <form action={createBracket} className="space-y-2">
              <input type="hidden" name="tid" value={id} />
              <label className="label" htmlFor="seeding">トーナメント表の作り方</label>
              <select id="seeding" name="seeding" className="input sm:max-w-xs" defaultValue="rating">
                <option value="rating">レートの高い順にシード（標準）</option>
                <option value="random">ランダム</option>
              </select>
              <p className="text-sm text-mute">
                エントリーを締め切って、トーナメント表を作成します。作成後はエントリーの変更ができません。人数が2のべき乗でないときは、上位シードから順に不戦勝になります。
              </p>
              <button className="btn btn-primary">エントリーを締め切ってトーナメント表を作る</button>
            </form>
          )}
          <form action={cancelTournament}>
            <input type="hidden" name="tid" value={id} />
            <button className="btn btn-danger">この大会を中止する</button>
          </form>
        </section>
      )}
    </div>
  );
}
