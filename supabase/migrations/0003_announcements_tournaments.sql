-- 0003: 管理者向け機能 — お知らせ / 大会（エントリー・トーナメント作成・結果入力）
-- 0002 のあとに、SQL Editor に丸ごと貼り付けて実行してください。

-- 管理者かどうか（RLS のポリシーから使う）
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ============ お知らせ ============
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  body text not null default '' check (char_length(body) <= 2000),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy announcements_select on public.announcements for select to authenticated using (true);
create policy announcements_insert on public.announcements for insert to authenticated with check (public.is_admin());
create policy announcements_delete on public.announcements for delete to authenticated using (public.is_admin());
revoke all on public.announcements from anon, authenticated;
grant select, delete on public.announcements to authenticated;
grant insert (title, body) on public.announcements to authenticated;

-- ============ 大会 ============
-- status: open = エントリー受付中 / running = 進行中 / finished = 終了 / cancelled = 中止
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 60),
  description text not null default '' check (char_length(description) <= 1000),
  starts_at timestamptz,
  status text not null default 'open' check (status in ('open', 'running', 'finished', 'cancelled')),
  champion_id uuid references public.profiles(id),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.tournament_entries (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (tournament_id, user_id),
  constraint tournament_entries_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);

-- status: waiting = 対戦相手が未定 / ready = 対戦できる / disputed = 入力の食い違い / done = 決着
create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round smallint not null,
  slot smallint not null,
  player_a uuid,
  player_b uuid,
  a_report text check (a_report in ('win', 'lose')),
  b_report text check (b_report in ('win', 'lose')),
  winner_id uuid,
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'disputed', 'done')),
  unique (tournament_id, round, slot),
  constraint tournament_matches_player_a_fkey foreign key (player_a) references public.profiles(id),
  constraint tournament_matches_player_b_fkey foreign key (player_b) references public.profiles(id),
  constraint tournament_matches_winner_fkey foreign key (winner_id) references public.profiles(id)
);

alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_matches enable row level security;
create policy tournaments_select on public.tournaments for select to authenticated using (true);
create policy tournaments_insert on public.tournaments for insert to authenticated with check (public.is_admin());
create policy tournaments_update on public.tournaments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tournament_entries_select on public.tournament_entries for select to authenticated using (true);
create policy tournament_matches_select on public.tournament_matches for select to authenticated using (true);

revoke all on public.tournaments, public.tournament_entries, public.tournament_matches from anon, authenticated;
grant select on public.tournaments, public.tournament_entries, public.tournament_matches to authenticated;
grant insert (title, description, starts_at) on public.tournaments to authenticated;
grant update (title, description, starts_at, status) on public.tournaments to authenticated;

-- ============ エントリー ============
create or replace function public.enter_tournament(p_tournament uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;
  if not exists (select 1 from public.tournaments where id = p_tournament and status = 'open') then
    raise exception 'この大会はエントリーを受け付けていません';
  end if;
  insert into public.tournament_entries (tournament_id, user_id) values (p_tournament, auth.uid())
  on conflict do nothing;
end;
$$;

create or replace function public.leave_tournament(p_tournament uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;
  if not exists (select 1 from public.tournaments where id = p_tournament and status = 'open') then
    raise exception 'エントリーの受付は終了しています';
  end if;
  delete from public.tournament_entries where tournament_id = p_tournament and user_id = auth.uid();
end;
$$;

-- 管理者がエントリーを削除する
create or replace function public.remove_entry(p_tournament uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception '管理者のみ実行できます'; end if;
  if not exists (select 1 from public.tournaments where id = p_tournament and status = 'open') then
    raise exception 'エントリーの受付は終了しています';
  end if;
  delete from public.tournament_entries where tournament_id = p_tournament and user_id = p_user;
end;
$$;

-- ============ 勝者を次の試合へ進める（内部専用） ============
create or replace function public.tournament_advance(p_match uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.tournament_matches%rowtype;
  last_round smallint;
begin
  select * into m from public.tournament_matches where id = p_match;
  select max(round) into last_round from public.tournament_matches where tournament_id = m.tournament_id;

  if m.round = last_round then
    update public.tournaments set status = 'finished', champion_id = m.winner_id where id = m.tournament_id;
    return;
  end if;

  if m.slot % 2 = 0 then
    update public.tournament_matches set player_a = m.winner_id
    where tournament_id = m.tournament_id and round = m.round + 1 and slot = m.slot / 2;
  else
    update public.tournament_matches set player_b = m.winner_id
    where tournament_id = m.tournament_id and round = m.round + 1 and slot = m.slot / 2;
  end if;
  update public.tournament_matches set status = 'ready'
  where tournament_id = m.tournament_id and round = m.round + 1 and slot = m.slot / 2
    and player_a is not null and player_b is not null and status = 'waiting';
end;
$$;

-- ============ トーナメント表の作成（管理者） ============
-- p_seeding: 'rating' = レートの高い順にシード（強い人同士が序盤で当たらない標準の配置） / 'random' = ランダム
-- 人数が2のべき乗でないときは、上位シードから順に不戦勝（1回戦をスキップ）になる。
create or replace function public.create_bracket(p_tournament uuid, p_seeding text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tournaments%rowtype;
  players uuid[];
  n integer; size integer := 1; rounds integer := 0;
  ord integer[] := array[1]; nord integer[]; k integer := 1; s integer;
  r integer; i integer; pa uuid; pb uuid; bye_id uuid;
begin
  if not public.is_admin() then raise exception '管理者のみ実行できます'; end if;
  select * into t from public.tournaments where id = p_tournament for update;
  if not found then raise exception '大会が見つかりません'; end if;
  if t.status <> 'open' then raise exception 'トーナメント表はすでに作成されています'; end if;

  if p_seeding = 'random' then
    select array_agg(e.user_id order by random()) into players
    from public.tournament_entries e where e.tournament_id = p_tournament;
  else
    select array_agg(e.user_id order by p.rating desc, e.created_at) into players
    from public.tournament_entries e join public.profiles p on p.id = e.user_id
    where e.tournament_id = p_tournament;
  end if;

  n := coalesce(cardinality(players), 0);
  if n < 2 then raise exception 'トーナメントを作るには2人以上のエントリーが必要です'; end if;

  while size < n loop size := size * 2; rounds := rounds + 1; end loop;

  -- シード配置（1-2 → 1-4-2-3 → 1-8-4-5-2-7-3-6 ...）
  while k < size loop
    nord := '{}';
    foreach s in array ord loop
      nord := nord || s || (2 * k + 1 - s);
    end loop;
    ord := nord;
    k := k * 2;
  end loop;

  for r in 1 .. rounds loop
    for i in 0 .. (size >> r) - 1 loop
      if r = 1 then
        pa := players[ord[2 * i + 1]];   -- 人数を超えるシードは null（不戦）
        pb := players[ord[2 * i + 2]];
      else
        pa := null; pb := null;
      end if;
      insert into public.tournament_matches (tournament_id, round, slot, player_a, player_b, status)
      values (p_tournament, r, i, pa, pb, case when pa is not null and pb is not null then 'ready' else 'waiting' end);
    end loop;
  end loop;

  -- 不戦勝を先に進める
  for bye_id in
    select id from public.tournament_matches
    where tournament_id = p_tournament and round = 1 and (player_a is null) <> (player_b is null)
    order by slot
  loop
    update public.tournament_matches set winner_id = coalesce(player_a, player_b), status = 'done' where id = bye_id;
    perform public.tournament_advance(bye_id);
  end loop;

  update public.tournaments set status = 'running' where id = p_tournament and status = 'open';
end;
$$;

-- ============ 大会の試合結果（双方が勝ち/負けを入力。一致で決着、食い違いは保留） ============
create or replace function public.submit_tournament_result(p_match uuid, p_result text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  m public.tournament_matches%rowtype;
  ra text; rb text;
begin
  if me is null then raise exception 'ログインが必要です'; end if;
  if p_result is null or p_result not in ('win', 'lose') then raise exception '結果が不正です'; end if;

  select * into m from public.tournament_matches where id = p_match for update;
  if not found then raise exception '試合が見つかりません'; end if;
  if m.status not in ('ready', 'disputed') then raise exception 'この試合は結果を入力できません'; end if;
  if not exists (select 1 from public.tournaments where id = m.tournament_id and status = 'running') then
    raise exception 'この大会は進行中ではありません';
  end if;

  if me = m.player_a then
    update public.tournament_matches set a_report = p_result where id = p_match;
    ra := p_result; rb := m.b_report;
  elsif me = m.player_b then
    update public.tournament_matches set b_report = p_result where id = p_match;
    ra := m.a_report; rb := p_result;
  else
    raise exception 'この試合の参加者ではありません';
  end if;

  if ra is null or rb is null then return; end if;

  if ra <> rb then
    update public.tournament_matches set
      winner_id = case when ra = 'win' then player_a else player_b end,
      status = 'done'
    where id = p_match;
    perform public.tournament_advance(p_match);
  else
    update public.tournament_matches set status = 'disputed' where id = p_match;
  end if;
end;
$$;

-- 管理者が勝者を指定して決着させる（保留の裁定、不戦勝など。入力の有無にかかわらず可）
create or replace function public.resolve_tournament_match(p_match uuid, p_winner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.tournament_matches%rowtype;
begin
  if not public.is_admin() then raise exception '管理者のみ実行できます'; end if;
  select * into m from public.tournament_matches where id = p_match for update;
  if not found then raise exception '試合が見つかりません'; end if;
  if m.status not in ('ready', 'disputed') then raise exception 'この試合は決着できる状態ではありません'; end if;
  if p_winner is null or p_winner not in (m.player_a, m.player_b) then raise exception '勝者が不正です'; end if;
  if not exists (select 1 from public.tournaments where id = m.tournament_id and status = 'running') then
    raise exception 'この大会は進行中ではありません';
  end if;

  update public.tournament_matches set winner_id = p_winner, status = 'done' where id = p_match;
  perform public.tournament_advance(p_match);
end;
$$;

-- ============ 権限 ============
revoke all on function public.enter_tournament(uuid) from public, anon;
revoke all on function public.leave_tournament(uuid) from public, anon;
revoke all on function public.remove_entry(uuid, uuid) from public, anon;
revoke all on function public.create_bracket(uuid, text) from public, anon;
revoke all on function public.submit_tournament_result(uuid, text) from public, anon;
revoke all on function public.resolve_tournament_match(uuid, uuid) from public, anon;
revoke all on function public.tournament_advance(uuid) from public, anon, authenticated;
grant execute on function public.enter_tournament(uuid) to authenticated;
grant execute on function public.leave_tournament(uuid) to authenticated;
grant execute on function public.remove_entry(uuid, uuid) to authenticated;
grant execute on function public.create_bracket(uuid, text) to authenticated;
grant execute on function public.submit_tournament_result(uuid, text) to authenticated;
grant execute on function public.resolve_tournament_match(uuid, uuid) to authenticated;
