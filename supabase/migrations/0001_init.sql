-- スマブラ レーティングサイト 初期スキーマ
-- Supabase の SQL Editor に丸ごと貼り付けて実行してください。

-- ============ テーブル ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 20),
  rating integer not null default 1500,
  max_rating integer not null default 1500,
  wins integer not null default 0,
  losses integer not null default 0,
  main_characters text[] not null default '{}' check (cardinality(main_characters) <= 3),
  banned_stages text[] not null default '{}' check (cardinality(banned_stages) <= 2),
  bio text not null default '' check (char_length(bio) <= 500),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create type public.match_status as enum ('pending', 'confirmed', 'disputed', 'void');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  player_a uuid not null,              -- 報告した人
  player_b uuid not null,              -- 承認する人
  winner_id uuid not null,
  a_wins smallint not null,
  b_wins smallint not null,
  status public.match_status not null default 'pending',
  a_rating_before integer,
  a_rating_after integer,
  b_rating_before integer,
  b_rating_after integer,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  constraint matches_player_a_fkey foreign key (player_a) references public.profiles(id),
  constraint matches_player_b_fkey foreign key (player_b) references public.profiles(id),
  constraint matches_players_differ check (player_a <> player_b),
  constraint matches_winner_valid check (winner_id in (player_a, player_b)),
  constraint matches_score_valid check (greatest(a_wins, b_wins) = 2 and least(a_wins, b_wins) in (0, 1))
);
create index matches_player_a_idx on public.matches(player_a);
create index matches_player_b_idx on public.matches(player_b);
create index matches_status_idx on public.matches(status);

create table public.match_games (
  match_id uuid not null references public.matches(id) on delete cascade,
  game_no smallint not null check (game_no between 1 and 3),
  winner_id uuid not null references public.profiles(id),
  stage text not null check (char_length(stage) <= 30),
  a_character text check (char_length(a_character) <= 40),
  b_character text check (char_length(b_character) <= 40),
  primary key (match_id, game_no)
);

-- ============ 新規ユーザー → profiles 自動作成 ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), new.raw_user_meta_data->>'username')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ RLS: 読むのは全員(ログイン済み)、書き込みは関数経由のみ ============
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_games enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (true);
create policy matches_select on public.matches for select to authenticated using (true);
create policy match_games_select on public.match_games for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- 自分で書き換えてよい列だけ許可（rating や is_admin は触れない）
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, bio, main_characters, banned_stages) on public.profiles to authenticated;
revoke insert, update, delete on public.matches from anon, authenticated;
revoke insert, update, delete on public.match_games from anon, authenticated;

-- ============ レート確定（Elo） ============
-- 初期レート 1500 / K=32 / 勝者の獲得は最低 +1。敗者は同じ分だけ減る（ゼロサム）。
create or replace function public.finalize_match(p_match uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches%rowtype;
  ra integer; rb integer; na integer; nb integer;
  ea numeric; gain integer; a_won boolean;
  k constant integer := 32;
begin
  select * into m from public.matches where id = p_match for update;
  perform 1 from public.profiles where id in (m.player_a, m.player_b) order by id for update;

  select rating into ra from public.profiles where id = m.player_a;
  select rating into rb from public.profiles where id = m.player_b;

  a_won := (m.winner_id = m.player_a);
  ea := 1.0 / (1.0 + power(10.0, (rb - ra) / 400.0));   -- A の期待勝率
  if a_won then
    gain := greatest(1, round(k * (1 - ea))::integer);
    na := ra + gain; nb := rb - gain;
  else
    gain := greatest(1, round(k * ea)::integer);
    na := ra - gain; nb := rb + gain;
  end if;

  update public.profiles set
    rating = na, max_rating = greatest(max_rating, na),
    wins = wins + case when a_won then 1 else 0 end,
    losses = losses + case when a_won then 0 else 1 end
  where id = m.player_a;

  update public.profiles set
    rating = nb, max_rating = greatest(max_rating, nb),
    wins = wins + case when a_won then 0 else 1 end,
    losses = losses + case when a_won then 1 else 0 end
  where id = m.player_b;

  update public.matches set
    status = 'confirmed',
    a_rating_before = ra, a_rating_after = na,
    b_rating_before = rb, b_rating_after = nb,
    resolved_at = now()
  where id = m.id;
end;
$$;

-- ============ 試合を報告 ============
-- p_games 例: [{"winner":"me","stage":"戦場","my_character":"マリオ","opponent_character":"リンク"}, ...]
create or replace function public.report_match(p_opponent uuid, p_games jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  n integer; i integer; g jsonb; stg text;
  wa integer := 0; wb integer := 0;
  banned text[]; mid uuid;
begin
  if me is null then raise exception 'ログインが必要です'; end if;
  if p_opponent is null or p_opponent = me then raise exception '対戦相手が不正です'; end if;
  if not exists (select 1 from public.profiles where id = p_opponent) then
    raise exception '対戦相手が見つかりません';
  end if;

  n := jsonb_array_length(p_games);
  if n < 2 or n > 3 then raise exception 'ゲーム数は2〜3です'; end if;

  select coalesce(array_agg(s), '{}'::text[]) into banned
  from (select unnest(banned_stages) as s from public.profiles where id in (me, p_opponent)) t;

  for i in 0 .. n - 1 loop
    g := p_games -> i;
    if wa = 2 or wb = 2 then raise exception '勝敗が決まった後のゲームが含まれています'; end if;
    stg := g ->> 'stage';
    if stg is null or char_length(stg) > 30 then raise exception 'ステージが不正です'; end if;
    if stg = any(banned) then raise exception '拒否ステージは選べません: %', stg; end if;
    if (g ->> 'winner') = 'me' then wa := wa + 1;
    elsif (g ->> 'winner') = 'opponent' then wb := wb + 1;
    else raise exception '勝者が不正です';
    end if;
  end loop;
  if wa <> 2 and wb <> 2 then raise exception '2勝したプレイヤーがいません'; end if;

  insert into public.matches (player_a, player_b, winner_id, a_wins, b_wins)
  values (me, p_opponent, case when wa = 2 then me else p_opponent end, wa, wb)
  returning id into mid;

  for i in 0 .. n - 1 loop
    g := p_games -> i;
    insert into public.match_games (match_id, game_no, winner_id, stage, a_character, b_character)
    values (
      mid, i + 1,
      case when (g ->> 'winner') = 'me' then me else p_opponent end,
      g ->> 'stage',
      nullif(g ->> 'my_character', ''),
      nullif(g ->> 'opponent_character', '')
    );
  end loop;
  return mid;
end;
$$;

-- ============ 相手の応答（承認 / 保留）と報告者の取り消し ============
create or replace function public.respond_match(p_match uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  m public.matches%rowtype;
begin
  if me is null then raise exception 'ログインが必要です'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception '試合が見つかりません'; end if;
  if m.status <> 'pending' then raise exception 'この試合はすでに処理されています'; end if;

  if p_action = 'approve' and me = m.player_b then
    perform public.finalize_match(p_match);
  elsif p_action = 'hold' and me = m.player_b then
    update public.matches set status = 'disputed' where id = p_match;
  elsif p_action = 'cancel' and me = m.player_a then
    update public.matches set status = 'void', resolved_at = now(), resolved_by = me where id = p_match;
  else
    raise exception 'この操作はできません';
  end if;
end;
$$;

-- ============ 管理者の裁定（保留中の試合） ============
--  as_reported: 報告どおりに確定 / flip: 勝敗を逆にして確定 / void: 無効
create or replace function public.resolve_match(p_match uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  m public.matches%rowtype;
begin
  if me is null or not exists (select 1 from public.profiles where id = me and is_admin) then
    raise exception '管理者のみ実行できます';
  end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception '試合が見つかりません'; end if;
  if m.status <> 'disputed' then raise exception '保留中の試合ではありません'; end if;

  if p_action = 'as_reported' then
    perform public.finalize_match(p_match);
  elsif p_action = 'flip' then
    update public.matches set
      winner_id = case when winner_id = player_a then player_b else player_a end,
      a_wins = b_wins, b_wins = a_wins
    where id = p_match;
    delete from public.match_games where match_id = p_match;  -- 報告内容が正しくないので詳細は破棄
    perform public.finalize_match(p_match);
  elsif p_action = 'void' then
    update public.matches set status = 'void', resolved_at = now() where id = p_match;
  else
    raise exception '不明な操作です';
  end if;
  update public.matches set resolved_by = me where id = p_match;
end;
$$;

-- 関数の実行権限（finalize_match は内部専用）
revoke all on function public.finalize_match(uuid) from public, anon, authenticated;
revoke all on function public.report_match(uuid, jsonb) from public, anon;
revoke all on function public.respond_match(uuid, text) from public, anon;
revoke all on function public.resolve_match(uuid, text) from public, anon;
grant execute on function public.report_match(uuid, jsonb) to authenticated;
grant execute on function public.respond_match(uuid, text) to authenticated;
grant execute on function public.resolve_match(uuid, text) to authenticated;
