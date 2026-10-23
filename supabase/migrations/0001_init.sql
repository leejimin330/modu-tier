-- 티어잇 스키마
-- 모든 읽기/쓰기는 서버(secret key)에서만 한다. 클라이언트 직접 접근은 RLS로 막는다.

create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  provider    text not null,
  label       text not null default '',
  created_at  timestamptz not null default now()
);

create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  title       text not null,
  description text not null default '',
  category    text not null default '',
  status      text not null default 'active' check (status in ('active', 'hidden')),
  created_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.characters (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  series      text not null default '',
  image_url   text not null,
  source      text not null check (source in ('anilist', 'upload')),
  anilist_id  integer unique,
  source_url  text
);

create table public.topic_items (
  topic_id     uuid not null references public.topics (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  added_at     timestamptz not null default clock_timestamp(),
  primary key (topic_id, character_id)
);

create table public.votes (
  topic_id     uuid not null,
  user_id      uuid not null references public.users (id) on delete cascade,
  character_id uuid not null,
  tier         text not null check (tier in ('S', 'A', 'B', 'C', 'D')),
  updated_at   timestamptz not null default now(),
  primary key (topic_id, user_id, character_id),
  -- 주제에서 캐릭터가 빠지면 그 표도 사라진다
  foreign key (topic_id, character_id) references public.topic_items (topic_id, character_id) on delete cascade
);
create index votes_topic_idx on public.votes (topic_id, character_id);

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  target_type  text not null check (target_type in ('topic', 'item')),
  topic_id     uuid not null references public.topics (id) on delete cascade,
  character_id uuid references public.characters (id) on delete set null,
  reason       text not null,
  user_id      uuid references public.users (id) on delete set null,
  status       text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at   timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);

alter table public.users       enable row level security;
alter table public.topics      enable row level security;
alter table public.characters  enable row level security;
alter table public.topic_items enable row level security;
alter table public.votes       enable row level security;
alter table public.reports     enable row level security;

-- 주제 목록용 요약 (참여자 수, 항목 수, 미리보기 이미지 4개)
create or replace view public.topic_summaries with (security_invoker = true) as
select
  t.*,
  (select count(distinct v.user_id) from public.votes v where v.topic_id = t.id)::int as participants,
  (select count(*) from public.topic_items i where i.topic_id = t.id)::int as item_count,
  coalesce((
    select array_agg(p.image_url order by p.added_at)
    from (
      select c.image_url, i.added_at
      from public.topic_items i join public.characters c on c.id = i.character_id
      where i.topic_id = t.id
      order by i.added_at
      limit 4
    ) p
  ), '{}') as preview
from public.topics t;

-- 캐릭터·티어별 표 수
create or replace function public.topic_vote_counts(p_topic_id uuid)
returns table (character_id uuid, tier text, count int)
language sql stable
set search_path = public
as $$
  select v.character_id, v.tier, count(*)::int from public.votes v where v.topic_id = p_topic_id group by 1, 2;
$$;

-- 한 사용자의 한 주제 표를 통째로 교체한다 (p_votes: [{character_id, tier}])
create or replace function public.replace_votes(p_topic_id uuid, p_user_id uuid, p_votes jsonb)
returns void
language plpgsql
set search_path = public
as $$
begin
  delete from public.votes where topic_id = p_topic_id and user_id = p_user_id;
  insert into public.votes (topic_id, user_id, character_id, tier)
  select p_topic_id, p_user_id, (e->>'character_id')::uuid, e->>'tier'
  from jsonb_array_elements(p_votes) e;
end;
$$;

-- AniList id가 같은 캐릭터는 재사용하고, 주제에 추가한다. 새로 추가된 항목 수를 돌려준다.
create or replace function public.add_topic_items(p_topic_id uuid, p_chars jsonb)
returns int
language plpgsql
set search_path = public
as $$
declare
  e     jsonb;
  v_id  uuid;
  added int := 0;
  n     int;
begin
  for e in select * from jsonb_array_elements(p_chars) loop
    v_id := null;
    if e->>'anilist_id' is not null then
      select id into v_id from public.characters where anilist_id = (e->>'anilist_id')::int;
    end if;
    if v_id is null then
      insert into public.characters (name, series, image_url, source, anilist_id, source_url)
      values (e->>'name', coalesce(e->>'series', ''), e->>'image_url', e->>'source',
              (e->>'anilist_id')::int, e->>'source_url')
      returning id into v_id;
    end if;
    insert into public.topic_items (topic_id, character_id) values (p_topic_id, v_id) on conflict do nothing;
    get diagnostics n = row_count;
    added := added + n;
  end loop;
  return added;
end;
$$;

revoke all on function public.topic_vote_counts from public, anon, authenticated;
revoke all on function public.replace_votes     from public, anon, authenticated;
revoke all on function public.add_topic_items   from public, anon, authenticated;
grant execute on function public.topic_vote_counts to service_role;
grant execute on function public.replace_votes     to service_role;
grant execute on function public.add_topic_items   to service_role;
revoke all on public.topic_summaries from anon, authenticated;

-- 업로드 이미지용 공개 버킷 (쓰기는 서버에서만)
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true) on conflict (id) do nothing;
