-- 0002: 「対戦」機能への変更
--  ・使用キャラを「1戦目キャラ(1体)」と「変更キャラ(10体まで)」に分割
--  ・拒否ステージの候補を更新（ポケスタ2 / ホロバスティオン / すま村）
--  ・お互いに選び合うとマッチング成立 → 双方が「勝ち/負け」を入力 → 一致で確定 / 食い違いは保留
--  ・旧「報告 → 承認」の仕組みを廃止
-- 0001 のあとに、SQL Editor に丸ごと貼り付けて実行してください。

-- ============ プロフィール: キャラ列の分割 ============
alter table public.profiles
  add column first_character text check (char_length(first_character) <= 40),
  add column alt_characters text[] not null default '{}' check (cardinality(alt_characters) <= 10);

-- 既存のメインキャラ: 先頭 → 1戦目キャラ、残り → 変更キャラ
update public.profiles set
  first_character = main_characters[1],
  alt_characters = coalesce(main_characters[2:3], '{}');
alter table public.profiles drop column main_characters;

-- 拒否ステージ: 名称変更と、候補から外れたステージの除去
update public.profiles set banned_stages = array_replace(banned_stages, 'ポケモンスタジアム2', 'ポケスタ2');
update public.profiles set banned_stages = coalesce(array(
  select s from unnest(banned_stages) as s
  where s = any (array['戦場','終点','ポケスタ2','小戦場','ホロバスティオン','村と街','すま村'])
), '{}');

-- 自分で書き換えてよい列
revoke update on public.profiles from authenticated;
grant update (display_name, bio, first_character, alt_characters, banned_stages)
  on public.profiles to authenticated;

-- ============ matches の変更 ============
-- status の意味: pending = 対戦中(結果入力待ち) / disputed = 入力の食い違い / confirmed = 確定 / void = 無効
-- 記録するのはマッチ全体の勝敗だけ（各ゲームの結果・スコアは記録しない）
alter table public.matches
  drop column a_wins,
  drop column b_wins,
  alter column winner_id drop not null;

alter table public.matches
  add column a_report text check (a_report in ('win', 'lose')),   -- A本人が入力した結果
  add column b_report text check (b_report in ('win', 'lose')),   -- B本人が入力した結果
  add column a_cancel boolean not null default false,
  add column b_cancel boolean not null default false,
  add column a_setup jsonb,   -- 対戦開始時点のキャラ・拒否ステージ（途中で変更されないよう保存）
  add column b_setup jsonb;

-- 旧フローで途中だった試合は無効にする（テスト中のデータ）
update public.matches set status = 'void', resolved_at = now() where status in ('pending', 'disputed');

-- ============ マッチング（お互いを選んだときだけ成立） ============
create table public.challenges (
  from_user uuid primary key references public.profiles(id) on delete cascade,  -- 1人につき選べる相手は1人
  to_user uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint challenges_differ check (from_user <> to_user)
);
alter table public.challenges enable row level security;
create policy challenges_select on public.challenges for select to authenticated using (true);
revoke all on public.challenges from anon, authenticated;
grant select on public.challenges to authenticated;

-- 相手を選ぶ。相手もこちらを選んでいれば対戦を作成して match の id を返す（なければ null）。選択は30分で失効。
create or replace function public.select_opponent(p_target uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  mid uuid;
begin
  if me is null then raise exception 'ログインが必要です'; end if;
  if p_target is null or p_target = me then raise exception '対戦相手が不正です'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then
    raise exception '対戦相手が見つかりません';
  end if;

  perform pg_advisory_xact_lock(hashtext('select_opponent'));  -- 同時に選び合ったときの取りこぼし防止

  if exists (select 1 from public.matches
             where status in ('pending', 'disputed') and me in (player_a, player_b)) then
    raise exception 'あなたは対戦中です。結果を入力するか、対戦を中止してください';
  end if;
  if exists (select 1 from public.matches
             where status in ('pending', 'disputed') and p_target in (player_a, player_b)) then
    raise exception '相手は別の対戦中です';
  end if;

  delete from public.challenges where created_at < now() - interval '30 minutes';
  insert into public.challenges (from_user, to_user) values (me, p_target)
  on conflict (from_user) do update set to_user = excluded.to_user, created_at = now();

  if exists (select 1 from public.challenges where from_user = p_target and to_user = me) then
    insert into public.matches (player_a, player_b, a_setup, b_setup)
    values (
      p_target, me,
      (select jsonb_build_object('banned_stages', banned_stages, 'first_character', first_character,
                                 'alt_characters', alt_characters) from public.profiles where id = p_target),
      (select jsonb_build_object('banned_stages', banned_stages, 'first_character', first_character,
                                 'alt_characters', alt_characters) from public.profiles where id = me)
    )
    returning id into mid;
    delete from public.challenges where from_user in (me, p_target);
    return mid;
  end if;
  return null;
end;
$$;

create or replace function public.clear_opponent()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'ログインが必要です'; end if;
  delete from public.challenges where from_user = auth.uid();
end;
$$;

-- ============ 結果の入力（何度でも入力し直せる） ============
-- p_result は自分の視点の 'win'（勝った） / 'lose'（負けた）。2本先取のマッチ全体の結果。
-- 双方が入力して食い違わない（片方が勝ち・片方が負け） → 確定（レート反映）
-- 食い違う（両方が勝ち、または両方が負け） → disputed（保留）。再入力で一致すれば確定。
create or replace function public.submit_result(p_match uuid, p_result text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  m public.matches%rowtype;
  ra text; rb text;
begin
  if me is null then raise exception 'ログインが必要です'; end if;
  if p_result is null or p_result not in ('win', 'lose') then
    raise exception '結果が不正です';
  end if;

  select * into m from public.matches where id = p_match for update;
  if not found then raise exception '対戦が見つかりません'; end if;
  if m.status not in ('pending', 'disputed') then raise exception 'この対戦はすでに終了しています'; end if;

  if me = m.player_a then
    update public.matches set a_report = p_result where id = p_match;
    ra := p_result; rb := m.b_report;
  elsif me = m.player_b then
    update public.matches set b_report = p_result where id = p_match;
    ra := m.a_report; rb := p_result;
  else
    raise exception 'この対戦の参加者ではありません';
  end if;

  if ra is null or rb is null then return; end if;   -- 相手の入力待ち

  if ra <> rb then
    update public.matches set winner_id = case when ra = 'win' then player_a else player_b end
    where id = p_match;
    perform public.finalize_match(p_match);
  else
    update public.matches set status = 'disputed' where id = p_match;
  end if;
end;
$$;

-- ============ 対戦の中止（双方が押したときだけ中止。レートは動かない） ============
create or replace function public.set_cancel(p_match uuid, p_on boolean)
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
  if not found then raise exception '対戦が見つかりません'; end if;
  if m.status not in ('pending', 'disputed') then raise exception 'この対戦はすでに終了しています'; end if;

  if me = m.player_a then
    update public.matches set a_cancel = p_on where id = p_match;
    m.a_cancel := p_on;
  elsif me = m.player_b then
    update public.matches set b_cancel = p_on where id = p_match;
    m.b_cancel := p_on;
  else
    raise exception 'この対戦の参加者ではありません';
  end if;

  if m.a_cancel and m.b_cancel then
    update public.matches set status = 'void', resolved_at = now() where id = p_match;
  end if;
end;
$$;

-- ============ 管理者の裁定 ============
--  winner_a: Aの勝ちで確定 / winner_b: Bの勝ちで確定（どちらも食い違い中のみ）
--  void: 無効（対戦中・保留どちらでも可。レートは動かない）
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
  if not found then raise exception '対戦が見つかりません'; end if;
  if m.status not in ('pending', 'disputed') then raise exception '進行中の対戦ではありません'; end if;

  if p_action = 'void' then
    update public.matches set status = 'void', resolved_at = now(), resolved_by = me where id = p_match;
    return;
  end if;

  if m.status <> 'disputed' then raise exception '食い違い中の対戦ではありません'; end if;
  if p_action = 'winner_a' then
    update public.matches set winner_id = player_a where id = p_match;
  elsif p_action = 'winner_b' then
    update public.matches set winner_id = player_b where id = p_match;
  else
    raise exception '不明な操作です';
  end if;
  perform public.finalize_match(p_match);
  update public.matches set resolved_by = me where id = p_match;
end;
$$;

-- ============ 旧フローの関数を廃止し、権限を設定 ============
drop function public.report_match(uuid, jsonb);
drop function public.respond_match(uuid, text);

revoke all on function public.select_opponent(uuid) from public, anon;
revoke all on function public.clear_opponent() from public, anon;
revoke all on function public.submit_result(uuid, text) from public, anon;
revoke all on function public.set_cancel(uuid, boolean) from public, anon;
revoke all on function public.resolve_match(uuid, text) from public, anon;
grant execute on function public.select_opponent(uuid) to authenticated;
grant execute on function public.clear_opponent() to authenticated;
grant execute on function public.submit_result(uuid, text) to authenticated;
grant execute on function public.set_cancel(uuid, boolean) to authenticated;
grant execute on function public.resolve_match(uuid, text) to authenticated;
