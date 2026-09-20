import Link from "next/link";
import type { MatchRow } from "@/lib/types";
import { respondMatch, resolveMatch } from "@/app/matches/actions";

const STATUS: Record<MatchRow["status"], { label: string; cls: string }> = {
  pending: { label: "相手の承認待ち", cls: "text-hold border-hold/40 bg-hold/10" },
  confirmed: { label: "確定", cls: "text-win border-win/40 bg-win/10" },
  disputed: { label: "保留（管理者が判断）", cls: "text-lose border-lose/40 bg-lose/10" },
  void: { label: "無効", cls: "text-mute border-line bg-paper" },
};

function ActionButton(props: {
  fn: (formData: FormData) => void | Promise<void>;
  matchId: string;
  action: string;
  back: string;
  label: string;
  className?: string;
}) {
  return (
    <form action={props.fn}>
      <input type="hidden" name="matchId" value={props.matchId} />
      <input type="hidden" name="action" value={props.action} />
      <input type="hidden" name="back" value={props.back} />
      <button className={`btn ${props.className ?? ""}`}>{props.label}</button>
    </form>
  );
}

function Delta({ before, after }: { before: number | null; after: number | null }) {
  if (before == null || after == null) return null;
  const d = after - before;
  return (
    <span className="num">
      {before} → {after}{" "}
      <span className={d >= 0 ? "text-win" : "text-lose"}>({d >= 0 ? "+" : ""}{d})</span>
    </span>
  );
}

export default function MatchCard({
  m,
  meId,
  back,
  admin = false,
}: {
  m: MatchRow;
  meId: string;
  back: string;
  admin?: boolean;
}) {
  const games = [...m.match_games].sort((x, y) => x.game_no - y.game_no);
  const st = STATUS[m.status];
  const nameOf = (id: string) => (id === m.player_a ? m.a.display_name : m.b.display_name);
  const when = new Date(m.created_at).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="panel">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold">
          <Link href={`/users/${m.a.username}`} className={m.winner_id === m.player_a ? "" : "font-normal text-mute"}>
            {m.a.display_name}
          </Link>
          <span className="num mx-2">{m.a_wins} - {m.b_wins}</span>
          <Link href={`/users/${m.b.username}`} className={m.winner_id === m.player_b ? "" : "font-normal text-mute"}>
            {m.b.display_name}
          </Link>
        </h3>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
        <span className="ml-auto text-xs text-mute">{when}</span>
      </div>

      {games.length > 0 && (
        <ol className="mt-3 space-y-1 text-sm">
          {games.map((g) => (
            <li key={g.game_no} className="flex flex-wrap gap-x-3 text-mute">
              <span className="num">{g.game_no}戦目</span>
              <span>{g.stage}</span>
              <span>
                {g.a_character ?? "?"} vs {g.b_character ?? "?"}
              </span>
              <span className="text-ink">勝ち: {nameOf(g.winner_id)}</span>
            </li>
          ))}
        </ol>
      )}

      {m.status === "confirmed" && (
        <div className="mt-3 space-y-0.5 text-sm text-mute">
          <div>{m.a.display_name}: <Delta before={m.a_rating_before} after={m.a_rating_after} /></div>
          <div>{m.b.display_name}: <Delta before={m.b_rating_before} after={m.b_rating_after} /></div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {!admin && m.status === "pending" && meId === m.player_b && (
          <>
            <ActionButton fn={respondMatch} matchId={m.id} action="approve" back={back} label="この結果で合っている" className="btn-primary" />
            <ActionButton fn={respondMatch} matchId={m.id} action="hold" back={back} label="違う（保留にする）" />
          </>
        )}
        {!admin && m.status === "pending" && meId === m.player_a && (
          <ActionButton fn={respondMatch} matchId={m.id} action="cancel" back={back} label="報告を取り消す" className="btn-danger" />
        )}
        {admin && m.status === "disputed" && (
          <>
            <ActionButton fn={resolveMatch} matchId={m.id} action="as_reported" back={back} label={`報告どおり確定（${nameOf(m.winner_id)}の勝ち）`} className="btn-primary" />
            <ActionButton fn={resolveMatch} matchId={m.id} action="flip" back={back} label="勝敗を逆にして確定" />
            <ActionButton fn={resolveMatch} matchId={m.id} action="void" back={back} label="無効にする" className="btn-danger" />
          </>
        )}
      </div>
    </article>
  );
}
