-- テスト中のデータを初期化します（本番開始の直前に1回だけ実行）。
-- 残るもの: ユーザーアカウント、プロフィール設定（キャラ・拒否ステージ・自己紹介）、管理者権限
-- 消えるもの: すべての試合履歴、対戦の選択状況。レートは全員 1500、戦績は 0-0 に戻ります。
delete from public.challenges;
delete from public.matches;
update public.profiles set rating = 1500, max_rating = 1500, wins = 0, losses = 0;
