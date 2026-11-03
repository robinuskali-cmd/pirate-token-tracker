-- Pirate Token Tracker • Supabase / PostgreSQL 15+
-- Im SQL Editor als Projektadministrator ausführen. Wiederholbar, keine Datenlöschung.
begin;
create schema if not exists tracker_private;
revoke all on schema tracker_private from public;
grant usage on schema tracker_private to authenticated;

create table if not exists public.tracker_players (
  id text primary key check (id in ('max', 'szymon')),
  name text not null,
  auth_id uuid unique references auth.users(id) on delete restrict,
  initial_chests integer not null check ((id = 'max' and initial_chests = 500) or (id = 'szymon' and initial_chests = 1100))
);
insert into public.tracker_players(id, name, initial_chests) values
  ('max', 'Max', 500), ('szymon', 'Szymon', 1100)
on conflict (id) do nothing;

create table if not exists public.tracker_sessions (
  id uuid primary key,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  route text not null default '' check (char_length(route) <= 160),
  created_by uuid not null references auth.users(id),
  check (ended_at is null or ended_at >= started_at)
);
create unique index if not exists tracker_one_session on public.tracker_sessions ((true)) where ended_at is null;
create table if not exists public.tracker_rounds (
  id uuid primary key,
  session_id uuid not null references public.tracker_sessions(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  manual boolean not null default false,
  check (ended_at is null or ended_at >= started_at)
);
create unique index if not exists tracker_one_round on public.tracker_rounds ((true)) where ended_at is null;
create index if not exists tracker_round_session on public.tracker_rounds(session_id);
create table if not exists public.tracker_round_counts (
  round_id uuid not null references public.tracker_rounds(id),
  player_id text not null references public.tracker_players(id),
  chests integer not null default 0 check (chests between 0 and 1000000),
  revision integer not null default 0 check (revision >= 0),
  duration_seconds integer check (duration_seconds between 1 and 86400),
  primary key (round_id, player_id)
);
create table if not exists tracker_private.requests (
  id uuid primary key,
  actor_id uuid not null references auth.users(id),
  action text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists public.tracker_changes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references tracker_private.requests(id),
  actor_id uuid not null references auth.users(id),
  player_id text not null references public.tracker_players(id),
  round_id uuid references public.tracker_rounds(id),
  round_revision integer,
  delta integer not null check (delta between -1000000 and 1000000),
  reason text not null check (reason in ('live', 'undo', 'manual', 'correction')),
  reversal_of uuid unique references public.tracker_changes(id),
  created_at timestamptz not null default now(),
  check ((reason = 'undo') = (reversal_of is not null))
);
create index if not exists tracker_change_player on public.tracker_changes(player_id);
create index if not exists tracker_change_round on public.tracker_changes(round_id);
create index if not exists tracker_change_time on public.tracker_changes(created_at desc);

create or replace function tracker_private.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.tracker_players where auth_id = (select auth.uid()));
$$;
revoke all on function tracker_private.is_member() from public;
grant execute on function tracker_private.is_member() to authenticated;

-- No browser role may write to a table. All mutations pass through the RPC below.
alter table public.tracker_players enable row level security;
alter table public.tracker_sessions enable row level security;
alter table public.tracker_rounds enable row level security;
alter table public.tracker_round_counts enable row level security;
alter table public.tracker_changes enable row level security;
alter table tracker_private.requests enable row level security;
revoke all on public.tracker_players, public.tracker_sessions, public.tracker_rounds, public.tracker_round_counts, public.tracker_changes from anon, authenticated;
grant select on public.tracker_players, public.tracker_sessions, public.tracker_rounds, public.tracker_round_counts, public.tracker_changes to authenticated;
revoke all on tracker_private.requests from anon, authenticated;
do $$
declare t text;
begin
  foreach t in array array['tracker_players','tracker_sessions','tracker_rounds','tracker_round_counts','tracker_changes'] loop
    execute format('drop policy if exists crew_read on public.%I', t);
    execute format('create policy crew_read on public.%I for select to authenticated using ((select tracker_private.is_member()))', t);
  end loop;
end $$;

create or replace function tracker_private.read_integer(p jsonb, k text, lo integer, hi integer)
returns integer language plpgsql immutable set search_path = '' as $$
declare v text := p ->> k; n numeric;
begin
  if v is null or v !~ '^[0-9]{1,10}$' then raise exception 'Bitte eine gültige ganze Zahl für % eingeben.', k; end if;
  n := v::numeric;
  if n < lo or n > hi then raise exception '% muss zwischen % und % liegen.', k, lo, hi; end if;
  return n::integer;
end $$;
revoke all on function tracker_private.read_integer(jsonb,text,integer,integer) from public;

create or replace function public.tracker_snapshot()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not tracker_private.is_member() then raise exception 'Kein freigeschalteter Spielerzugang.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'players', (select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'auth_id', p.auth_id, 'initial_chests', p.initial_chests, 'total', p.initial_chests + coalesce((select sum(delta) from public.tracker_changes c where c.player_id = p.id),0)) order by p.id) from public.tracker_players p),
    'sessions', coalesce((select jsonb_agg(to_jsonb(s) order by started_at desc) from public.tracker_sessions s), '[]'::jsonb),
    'rounds', coalesce((select jsonb_agg(to_jsonb(r) order by started_at desc) from public.tracker_rounds r), '[]'::jsonb),
    'counts', coalesce((select jsonb_agg(to_jsonb(c)) from public.tracker_round_counts c), '[]'::jsonb),
    'changes', coalesce((select jsonb_agg(to_jsonb(c) order by created_at desc) from (select * from public.tracker_changes order by created_at desc, id limit 200) c), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(to_jsonb(d) order by day) from (select (created_at at time zone 'UTC')::date as day, player_id, sum(delta) as chests from public.tracker_changes group by 1,2) d), '[]'::jsonb)
  );
end $$;
revoke all on function public.tracker_snapshot() from public, anon;
grant execute on function public.tracker_snapshot() to authenticated;

-- A transaction-wide lock serializes the two-person team's writes. Both devices
-- add ledger deltas; neither overwrites a cached total. All failures roll back.
create or replace function public.tracker_mutate(p_request_id uuid, p_action text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  who text; uid uuid := auth.uid();
  previous tracker_private.requests%rowtype;
  r public.tracker_rounds%rowtype;
  c public.tracker_round_counts%rowtype;
  change public.tracker_changes%rowtype;
  sid uuid; rid uuid; d integer; target integer; dur integer; rev integer;
  stamp timestamptz := clock_timestamp();
begin
  select id into who from public.tracker_players where auth_id = uid;
  if who is null then raise exception 'Kein freigeschalteter Spielerzugang.' using errcode = '42501'; end if;
  if p_request_id is null or p_action is null or p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'Ungültige Anfrage.'; end if;
  perform pg_advisory_xact_lock(7149202601::bigint);
  stamp := clock_timestamp();
  select * into previous from tracker_private.requests where id = p_request_id;
  if found then
    if previous.actor_id <> uid or previous.action <> p_action or previous.payload <> p_payload then raise exception 'Kennung bereits für eine andere Änderung verwendet.'; end if;
    return jsonb_build_object('ok',true,'duplicate',true);
  end if;
  if p_action in ('increment','undo','manual_round','set_round_total') and (p_payload->>'player_id') is distinct from who then
    raise exception 'Du kannst nur deinen eigenen Counter ändern.' using errcode = '42501';
  end if;
  -- Reserved here so every ledger row references its durable idempotency key.
  insert into tracker_private.requests(id, actor_id, action, payload) values (p_request_id, uid, p_action, p_payload);

  if p_action = 'increment' then
    d := tracker_private.read_integer(p_payload,'delta',1,10);
    if d not in (1,5,10) then raise exception 'Nur +1, +5 oder +10 erlaubt.'; end if;
    rid := (p_payload->>'round_id')::uuid;
    if rid is null and exists(select 1 from public.tracker_sessions where ended_at is null) then raise exception 'Bitte zuerst eine Runde in der laufenden Session starten.'; end if;
    if rid is not null then
      select * into r from public.tracker_rounds where id = rid;
      if not found then raise exception 'Runde nicht gefunden.'; end if;
      select * into c from public.tracker_round_counts where round_id = rid and player_id = who;
      if r.ended_at is not null or c.revision is distinct from tracker_private.read_integer(p_payload,'expected_revision',0,2147483647) then raise exception 'Runde bereits abgeschlossen oder korrigiert. Bitte den Eintrag prüfen.'; end if;
      rev := c.revision;
      update public.tracker_round_counts set chests = chests + d where round_id = rid and player_id = who;
    end if;
    insert into public.tracker_changes(request_id,actor_id,player_id,round_id,round_revision,delta,reason) values(p_request_id,uid,who,rid,rev,d,'live');

  elsif p_action = 'undo' then
    select * into change from public.tracker_changes where id = (p_payload->>'change_id')::uuid and player_id = who and reason = 'live' and delta > 0;
    if not found then raise exception 'Klick nicht gefunden.'; end if;
    if exists(select 1 from public.tracker_changes where reversal_of = change.id) then raise exception 'Dieser Klick wurde bereits zurückgenommen.'; end if;
    rid := change.round_id;
    if rid is not null then
      select * into r from public.tracker_rounds where id = rid;
      select * into c from public.tracker_round_counts where round_id = rid and player_id = who;
      if r.ended_at is not null or c.revision is distinct from change.round_revision or c.revision is distinct from tracker_private.read_integer(p_payload,'expected_revision',0,2147483647) or c.chests < change.delta then
        raise exception 'Bitte diese abgeschlossene oder korrigierte Runde über das Rundenbuch bearbeiten.';
      end if;
      update public.tracker_round_counts set chests = chests - change.delta where round_id = rid and player_id = who;
    end if;
    insert into public.tracker_changes(request_id,actor_id,player_id,round_id,round_revision,delta,reason,reversal_of) values(p_request_id,uid,who,rid,c.revision,-change.delta,'undo',change.id);

  elsif p_action = 'start_session' then
    if exists(select 1 from public.tracker_sessions where ended_at is null) then raise exception 'Es läuft bereits eine Session.'; end if;
    insert into public.tracker_sessions(id, route, created_by) values ((p_payload->>'session_id')::uuid, coalesce(p_payload->>'route',''), uid);

  elsif p_action = 'end_session' then
    sid := (p_payload->>'session_id')::uuid;
    if not exists(select 1 from public.tracker_sessions where id = sid and ended_at is null) then raise exception 'Session bereits beendet.'; end if;
    if exists(select 1 from public.tracker_rounds where session_id = sid and ended_at is null) then raise exception 'Bitte zuerst die laufende Runde abschließen.'; end if;
    update public.tracker_sessions set ended_at = stamp where id = sid;

  elsif p_action in ('start_round','manual_round') then
    sid := (p_payload->>'session_id')::uuid; rid := (p_payload->>'round_id')::uuid;
    if not exists(select 1 from public.tracker_sessions where id = sid and ended_at is null) then raise exception 'Bitte zuerst eine Session starten.'; end if;
    if exists(select 1 from public.tracker_rounds where ended_at is null) then raise exception 'Es läuft bereits eine Runde. Nutze dort den endgültigen Gesamtwert.'; end if;
    dur := case when p_action = 'manual_round' and p_payload->>'duration_seconds' is not null then tracker_private.read_integer(p_payload,'duration_seconds',1,86400) end;
    insert into public.tracker_rounds(id,session_id,started_at,ended_at,manual)
      values(rid,sid,stamp - coalesce(dur,0)*interval '1 second',case when p_action = 'manual_round' then stamp end,p_action = 'manual_round');
    insert into public.tracker_round_counts(round_id,player_id) select rid, id from public.tracker_players;
    if p_action = 'manual_round' then
      target := tracker_private.read_integer(p_payload,'total',0,1000000);
      update public.tracker_round_counts set chests = target, duration_seconds = dur where round_id = rid and player_id = who;
      insert into public.tracker_changes(request_id,actor_id,player_id,round_id,round_revision,delta,reason) values(p_request_id,uid,who,rid,0,target,'manual');
    end if;

  elsif p_action = 'set_round_total' then
    rid := (p_payload->>'round_id')::uuid;
    select * into c from public.tracker_round_counts where round_id = rid and player_id = who;
    if not found then raise exception 'Runde nicht gefunden.'; end if;
    if c.revision is distinct from tracker_private.read_integer(p_payload,'expected_revision',0,2147483647) or c.chests is distinct from tracker_private.read_integer(p_payload,'expected_chests',0,1000000) then raise exception 'Die Runde wurde inzwischen geändert. Bitte neu laden und den Eintrag prüfen.'; end if;
    target := tracker_private.read_integer(p_payload,'total',0,1000000); d := target - c.chests;
    dur := case when p_payload->>'duration_seconds' is not null then tracker_private.read_integer(p_payload,'duration_seconds',1,86400) end;
    update public.tracker_round_counts set chests = target, revision = revision + 1, duration_seconds = dur where round_id = rid and player_id = who;
    insert into public.tracker_changes(request_id,actor_id,player_id,round_id,round_revision,delta,reason) values(p_request_id,uid,who,rid,c.revision+1,d,'correction');

  elsif p_action = 'end_round' then
    rid := (p_payload->>'round_id')::uuid;
    select * into r from public.tracker_rounds where id = rid;
    if not found or r.ended_at is not null then raise exception 'Runde bereits abgeschlossen.'; end if;
    select * into c from public.tracker_round_counts where round_id = rid and player_id = 'max';
    if c.chests is distinct from tracker_private.read_integer(p_payload,'expected_max',0,1000000) or c.revision is distinct from tracker_private.read_integer(p_payload,'revision_max',0,2147483647) then raise exception 'Neue Truhen eingegangen. Bitte die Runde erneut prüfen.'; end if;
    select * into c from public.tracker_round_counts where round_id = rid and player_id = 'szymon';
    if c.chests is distinct from tracker_private.read_integer(p_payload,'expected_szymon',0,1000000) or c.revision is distinct from tracker_private.read_integer(p_payload,'revision_szymon',0,2147483647) then raise exception 'Neue Truhen eingegangen. Bitte die Runde erneut prüfen.'; end if;
    update public.tracker_rounds set ended_at = stamp where id = rid;
  else raise exception 'Unbekannte Aktion.';
  end if;
  return jsonb_build_object('ok',true,'duplicate',false);
end $$;
revoke all on function public.tracker_mutate(uuid,text,jsonb) from public, anon;
grant execute on function public.tracker_mutate(uuid,text,jsonb) to authenticated;

-- Supabase creates this publication. Local test databases may omit it.
do $$
declare t text;
begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['tracker_players','tracker_sessions','tracker_rounds','tracker_round_counts','tracker_changes'] loop
      if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I',t);
      end if;
    end loop;
  end if;
end $$;
commit;
