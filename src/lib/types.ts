export type Player = { username: string; display_name: string; rating: number };

export type Setup = {
  banned_stages: string[];
  first_character: string | null;
  alt_characters: string[];
};

export type MatchRow = {
  id: string;
  // pending = 対戦中（結果入力待ち） / disputed = 入力の食い違い（保留）
  status: "pending" | "confirmed" | "disputed" | "void";
  winner_id: string | null;
  a_report: "win" | "lose" | null; // A本人が入力した、マッチ全体の結果
  b_report: "win" | "lose" | null;
  a_cancel: boolean;
  b_cancel: boolean;
  a_setup: Setup | null;
  b_setup: Setup | null;
  a_rating_before: number | null;
  a_rating_after: number | null;
  b_rating_before: number | null;
  b_rating_after: number | null;
  created_at: string;
  player_a: string;
  player_b: string;
  a: Player;
  b: Player;
};

export const MATCH_SELECT =
  "id, status, winner_id, a_report, b_report, a_cancel, b_cancel, a_setup, b_setup, " +
  "a_rating_before, a_rating_after, b_rating_before, b_rating_after, created_at, player_a, player_b, " +
  "a:profiles!matches_player_a_fkey(username, display_name, rating), " +
  "b:profiles!matches_player_b_fkey(username, display_name, rating)";

export function reportText(report: string | null): string {
  if (report === "win") return "勝った";
  if (report === "lose") return "負けた";
  return "未入力";
}

// 30分たった対戦相手の選択は無効
export const CHALLENGE_TTL_MS = 30 * 60 * 1000;
export const challengeCutoff = () => new Date(Date.now() - CHALLENGE_TTL_MS).toISOString();

// ---------- 大会 ----------
export type Tournament = {
  id: string;
  title: string;
  description: string;
  starts_at: string | null;
  status: "open" | "running" | "finished" | "cancelled";
  champion_id: string | null;
  created_at: string;
};

export type TMatch = {
  id: string;
  round: number;
  slot: number;
  status: "waiting" | "ready" | "disputed" | "done";
  winner_id: string | null;
  a_report: "win" | "lose" | null;
  b_report: "win" | "lose" | null;
  player_a: string | null;
  player_b: string | null;
  a: { username: string; display_name: string } | null;
  b: { username: string; display_name: string } | null;
};

export const TMATCH_SELECT =
  "id, round, slot, status, winner_id, a_report, b_report, player_a, player_b, " +
  "a:profiles!tournament_matches_player_a_fkey(username, display_name), " +
  "b:profiles!tournament_matches_player_b_fkey(username, display_name)";

export const TOURNAMENT_STATUS: Record<Tournament["status"], { label: string; cls: string }> = {
  open: { label: "エントリー受付中", cls: "text-accent border-accent/40 bg-accent/10" },
  running: { label: "進行中", cls: "text-hold border-hold/40 bg-hold/10" },
  finished: { label: "終了", cls: "text-win border-win/40 bg-win/10" },
  cancelled: { label: "中止", cls: "text-mute border-line bg-paper" },
};

export function roundLabel(round: number, total: number): string {
  const rest = total - round;
  if (rest === 0) return "決勝";
  if (rest === 1) return "準決勝";
  if (rest === 2) return "準々決勝";
  return `${round}回戦`;
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
