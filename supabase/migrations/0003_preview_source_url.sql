-- 노래 주제(유튜브 링크)를 알아볼 수 있게 미리보기에 source_url을 더한다

create or replace view public.topic_summaries with (security_invoker = true) as
select
  t.*,
  (select count(distinct v.user_id) from public.votes v where v.topic_id = t.id)::int as participants,
  (select count(*) from public.topic_items i where i.topic_id = t.id)::int as item_count,
  coalesce((
    select jsonb_agg(jsonb_build_object('name', p.name, 'image_url', p.image_url, 'emoji', p.emoji, 'source_url', p.source_url) order by p.added_at)
    from (
      select c.name, c.image_url, c.emoji, c.source_url, i.added_at
      from public.topic_items i join public.characters c on c.id = i.character_id
      where i.topic_id = t.id
      order by i.added_at
      limit 4
    ) p
  ), '[]'::jsonb) as preview
from public.topics t;
revoke all on public.topic_summaries from anon, authenticated;
