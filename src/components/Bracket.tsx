import Link from "next/link";
import type { TMatch } from "@/lib/types";
import { reportText, roundLabel } from "@/lib/types";
import { resolveTournamentMatch } from "@/app/tournaments/actions";

function PlayerRow({
  player,
  id,
  winnerId,
  empty,
}: {
  player: { username: string; display_name: string } | null;
  id: string | null;
  winnerId: string | null;
  empty: string;
}) {
  const won = !!id && winnerId === id;
  const lost = !!winnerId && !!id && winnerId !== id;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 text-sm ${won ? "bg-win/10 font-bold" : ""} ${lost ? "text-mute" : ""}`}>
      {player ? (
        <Link href={`/users/${player.username}`} className="truncate hover:underline">{player.display_name}</Link>
      ) : (
        <span className="text-mute">{empty}</span>
      )}
      {won && <span className="ml-auto shrink-0 text-xs text-win">勝ち</span>}
    </div>
  );
}

function BracketMatch({ m, tid, isAdmin }: { m: TMatch; tid: string; isAdmin: boolean }) {
  // 1回戦で相手がいない = 不戦勝。2回戦以降は前の試合の決着待ち。
  const empty = m.round === 1 ? "不戦" : "未定";
  const canResolve = isAdmin && (m.status === "ready" || m.status === "disputed");
  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel">
      <PlayerRow player={m.a} id={m.player_a} winnerId={m.winner_id} empty={empty} />
      <div className="border-t border-line" />
      <PlayerRow player={m.b} id={m.player_b} winnerId={m.winner_id} empty={empty} />
      {m.status === "disputed" && (
        <p className="border-t border-line bg-lose/10 px-3 py-1.5 text-xs text-lose">
          保留（入力の食い違い）{isAdmin && `: ${m.a?.display_name}「${reportText(m.a_report)}」/ ${m.b?.display_name}「${reportText(m.b_report)}」`}
        </p>
      )}
      {m.status === "ready" && <p className="border-t border-line px-3 py-1.5 text-xs text-mute">結果待ち</p>}
      {canResolve && m.player_a && m.player_b && (
        <div className="flex flex-col gap-1.5 border-t border-line p-2">
          {[
            [m.player_a, m.a?.display_name],
            [m.player_b, m.b?.display_name],
          ].map(([pid, name]) => (
            <form key={pid} action={resolveTournamentMatch}>
              <input type="hidden" name="tid" value={tid} />
              <input type="hidden" name="matchId" value={m.id} />
              <input type="hidden" name="winner" value={pid ?? ""} />
              <button className="btn w-full text-xs">{name}の勝ちにする</button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Bracket({
  matches,
  totalRounds,
  tid,
  isAdmin,
}: {
  matches: TMatch[];
  totalRounds: number;
  tid: string;
  isAdmin: boolean;
}) {
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-4">
        {rounds.map((r) => (
          <section key={r} className="flex min-w-[210px] flex-1 flex-col">
            <h3 className="mb-2 text-sm font-bold">{roundLabel(r, totalRounds)}</h3>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {matches
                .filter((m) => m.round === r)
                .map((m) => (
                  <BracketMatch key={m.id} m={m} tid={tid} isAdmin={isAdmin} />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
