export type Player = { username: string; display_name: string };

export type MatchGame = {
  game_no: number;
  winner_id: string;
  stage: string;
  a_character: string | null;
  b_character: string | null;
};

export type MatchRow = {
  id: string;
  status: "pending" | "confirmed" | "disputed" | "void";
  winner_id: string;
  a_wins: number;
  b_wins: number;
  a_rating_before: number | null;
  a_rating_after: number | null;
  b_rating_before: number | null;
  b_rating_after: number | null;
  created_at: string;
  player_a: string;
  player_b: string;
  a: Player;
  b: Player;
  match_games: MatchGame[];
};

export const MATCH_SELECT =
  "id, status, winner_id, a_wins, b_wins, a_rating_before, a_rating_after, b_rating_before, b_rating_after, created_at, player_a, player_b, " +
  "a:profiles!matches_player_a_fkey(username, display_name), " +
  "b:profiles!matches_player_b_fkey(username, display_name), " +
  "match_games(game_no, winner_id, stage, a_character, b_character)";
