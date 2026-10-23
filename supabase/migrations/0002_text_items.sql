-- 이미지 없는 항목 (음식·아이돌·생활 주제 등): 이모지나 이름 글자로 보여준다.

alter table public.characters drop constraint if exists characters_source_check;
alter table public.characters add constraint characters_source_check check (source in ('anilist', 'upload', 'text'));
alter table public.characters add column if not exists emoji text;
alter table public.characters alter column image_url set default '';

-- 미리보기를 이미지 주소 배열에서 {name, image_url, emoji} 배열로 바꾼다 (열 타입이 바뀌어 다시 만든다)
drop view if exists public.topic_summaries;
create view public.topic_summaries with (security_invoker = true) as
select
  t.*,
  (select count(distinct v.user_id) from public.votes v where v.topic_id = t.id)::int as participants,
  (select count(*) from public.topic_items i where i.topic_id = t.id)::int as item_count,
  coalesce((
    select jsonb_agg(jsonb_build_object('name', p.name, 'image_url', p.image_url, 'emoji', p.emoji) order by p.added_at)
    from (
      select c.name, c.image_url, c.emoji, i.added_at
      from public.topic_items i join public.characters c on c.id = i.character_id
      where i.topic_id = t.id
      order by i.added_at
      limit 4
    ) p
  ), '[]'::jsonb) as preview
from public.topics t;
revoke all on public.topic_summaries from anon, authenticated;

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
      insert into public.characters (name, series, image_url, source, anilist_id, source_url, emoji)
      values (e->>'name', coalesce(e->>'series', ''), coalesce(e->>'image_url', ''), e->>'source',
              (e->>'anilist_id')::int, e->>'source_url', e->>'emoji')
      returning id into v_id;
    end if;
    insert into public.topic_items (topic_id, character_id) values (p_topic_id, v_id) on conflict do nothing;
    get diagnostics n = row_count;
    added := added + n;
  end loop;
  return added;
end;
$$;
