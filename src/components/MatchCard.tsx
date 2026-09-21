import Link from "next/link";
import type { MatchRow } from "@/lib/types";
import { reportText } from "@/lib/types";
import { resolveMatch } from "@/app/admin/actions";

const STATUS: Record<MatchRow["status"], { label: string; cls: string }> = {
  pending: { label: "対戦中", cls: "text-hold border-hold/40 bg-hold/10" },
  confirmed: { label: "確定", cls: "text-win border-win/40 bg-win/10" },
  disputed: { label: "保留（入力の食い違い）", cls: "text-lose border-lose/40 bg-lose/10" },
  void: { label: "無効", cls: "text-mute border-line bg-paper" },
};

function ResolveButton({ id, action, label, className }: { id: string; action: string; label: string; className?: string }) {
  return (
    <form action={resolveMatch}>
      <input type="hidden" name="matchId" value={id} />
      <input type="hidden" name="action" value={action} />
      <button className={`btn ${className ?? ""}`}>{label}</button>
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

export default function MatchCard({ m, admin = false }: { m: MatchRow; admin?: boolean }) {
  const st = STATUS[m.status];
  const confirmed = m.status === "confirmed";
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
          <Link href={`/users/${m.a.username}`} className={confirmed && m.winner_id !== m.player_a ? "font-normal text-mute" : ""}>
            {m.a.display_name}
          </Link>
          <span className="mx-2">vs</span>
          <Link href={`/users/${m.b.username}`} className={confirmed && m.winner_id !== m.player_b ? "font-normal text-mute" : ""}>
            {m.b.display_name}
          </Link>
        </h3>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
        <span className="ml-auto text-xs text-mute">{when}</span>
      </div>

      {confirmed && (
        <div className="mt-3 space-y-0.5 text-sm text-mute">
          <div className="text-ink">{m.winner_id === m.player_a ? m.a.display_name : m.b.display_name} の勝ち</div>
          <div>{m.a.display_name}: <Delta before={m.a_rating_before} after={m.a_rating_after} /></div>
          <div>{m.b.display_name}: <Delta before={m.b_rating_before} after={m.b_rating_after} /></div>
        </div>
      )}

      {admin && (
        <>
          <div className="mt-3 space-y-0.5 text-sm">
            <div>{m.a.display_name}の入力: 「{reportText(m.a_report)}」{m.a_cancel && "　[中止を申請中]"}</div>
            <div>{m.b.display_name}の入力: 「{reportText(m.b_report)}」{m.b_cancel && "　[中止を申請中]"}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {m.status === "disputed" && (
              <>
                <ResolveButton id={m.id} action="winner_a" label={`${m.a.display_name}の勝ちで確定`} className="btn-primary" />
                <ResolveButton id={m.id} action="winner_b" label={`${m.b.display_name}の勝ちで確定`} className="btn-primary" />
              </>
            )}
            <ResolveButton id={m.id} action="void" label="無効にする" className="btn-danger" />
          </div>
        </>
      )}
    </article>
  );
}
