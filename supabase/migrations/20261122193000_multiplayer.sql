-- Stairway City Explorer: multiplayer tables and Realtime access
-- Run once in Supabase Dashboard > SQL Editor.
-- Players authenticate anonymously; each player can edit only their own island.

create table if not exists public.game_islands (
  player_id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default 'שחקן',
  island jsonb not null check (
    jsonb_typeof(island) = 'object'
    and octet_length(island::text) <= 100000
  ),
  updated_at timestamptz not null default now()
);

alter table public.game_islands enable row level security;

grant select, insert, update, delete on public.game_islands to authenticated;

drop policy if exists "Players can view shared islands" on public.game_islands;
create policy "Players can view shared islands"
  on public.game_islands for select
  to authenticated
  using (true);

drop policy if exists "Players can create their own island" on public.game_islands;
create policy "Players can create their own island"
  on public.game_islands for insert
  to authenticated
  with check (auth.uid() = player_id);

drop policy if exists "Players can update their own island" on public.game_islands;
create policy "Players can update their own island"
  on public.game_islands for update
  to authenticated
  using (auth.uid() = player_id)
  with check (auth.uid() = player_id);

drop policy if exists "Players can delete their own island" on public.game_islands;
create policy "Players can delete their own island"
  on public.game_islands for delete
  to authenticated
  using (auth.uid() = player_id);

-- Presence and Broadcast are restricted to authenticated game participants.
drop policy if exists "Authenticated players can receive game realtime" on realtime.messages;
create policy "Authenticated players can receive game realtime"
  on realtime.messages for select
  to authenticated
  using (true);

drop policy if exists "Authenticated players can send game realtime" on realtime.messages;
create policy "Authenticated players can send game realtime"
  on realtime.messages for insert
  to authenticated
  with check (true);

-- Enable Postgres Changes for shared island updates, without failing on reruns.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_islands'
  ) then
    alter publication supabase_realtime add table public.game_islands;
  end if;
end
$$;
