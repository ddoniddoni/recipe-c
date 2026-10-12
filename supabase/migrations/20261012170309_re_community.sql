-- P3: session RPC writes, private bookmarks and notifications.
create table public.re_cook_reviews (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.re_recipes(id),
  recipe_version_id uuid not null,
  author_id uuid not null references public.re_profiles(id),
  rating integer,
  body text not null,
  status text not null default 'published' check(status in ('published','hidden','deleted')),
  revision integer not null default 1 check(revision > 0),
  last_request_id uuid not null,
  last_request_hash text not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(author_id,recipe_version_id),
  foreign key(recipe_id,recipe_version_id) references public.re_recipe_versions(recipe_id,id),
  check((status = 'deleted' and body = '' and rating is null)
    or (status <> 'deleted' and rating between 1 and 5 and rating is not null and char_length(body) between 20 and 2000))
);
create index re_reviews_recipe_created on public.re_cook_reviews(recipe_id,created_at desc,id);
create index re_reviews_version_status on public.re_cook_reviews(recipe_version_id,status);
create table public.re_review_assets (
  review_id uuid not null references public.re_cook_reviews(id),
  asset_id uuid not null unique references public.re_media_assets(id),
  position integer not null check(position between 1 and 3),
  primary key(review_id,position)
);
create table public.re_recipe_comments (
  id uuid primary key,
  recipe_id uuid not null references public.re_recipes(id),
  author_id uuid not null references public.re_profiles(id),
  parent_id uuid,
  kind text not null check(kind in ('question','substitution','suggestion','general')),
  body text not null,
  status text not null default 'published' check(status in ('published','hidden','deleted')),
  revision integer not null default 1 check(revision > 0),
  last_request_id uuid not null,
  last_request_hash text not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique(recipe_id,id),
  foreign key(recipe_id,parent_id) references public.re_recipe_comments(recipe_id,id),
  check(parent_id is null or parent_id <> id),
  check((status = 'deleted' and body = '') or (status <> 'deleted' and char_length(body) between 1 and 1000))
);
create index re_comments_recipe_parent_created on public.re_recipe_comments(recipe_id,parent_id,created_at,id);
create index re_comments_author on public.re_recipe_comments(author_id);
create index re_comments_parent on public.re_recipe_comments(parent_id);
create table public.re_bookmarks (
  profile_id uuid not null references public.re_profiles(id),
  recipe_id uuid not null references public.re_recipes(id),
  created_at timestamptz not null default clock_timestamp(),
  primary key(profile_id,recipe_id)
);
create index re_bookmarks_recipe on public.re_bookmarks(recipe_id);
create table public.re_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.re_profiles(id),
  actor_id uuid not null references public.re_profiles(id),
  type text not null check(type in ('review','reply')),
  entity_id uuid not null,
  event_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique(recipient_id,event_key),
  check(recipient_id <> actor_id)
);
create index re_notifications_recipient_created on public.re_notifications(recipient_id,created_at desc,id);
create index re_notifications_actor on public.re_notifications(actor_id);
create table public.re_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.re_profiles(id),
  recipe_id uuid references public.re_recipes(id),
  review_id uuid references public.re_cook_reviews(id),
  comment_id uuid references public.re_recipe_comments(id),
  reason_code text not null check(reason_code in ('spam','abuse','rights','unsafe','other')),
  detail text not null check(char_length(detail) between 10 and 1000),
  status text not null default 'pending' check(status in ('pending','reviewing','resolved','dismissed')),
  created_at timestamptz not null default clock_timestamp(),
  check(num_nonnulls(recipe_id,review_id,comment_id) = 1)
);
create unique index re_reports_open_recipe on public.re_reports(reporter_id,recipe_id) where status in ('pending','reviewing');
create unique index re_reports_open_review on public.re_reports(reporter_id,review_id) where status in ('pending','reviewing');
create unique index re_reports_open_comment on public.re_reports(reporter_id,comment_id) where status in ('pending','reviewing');
create index re_reports_recipe on public.re_reports(recipe_id);
create index re_reports_review on public.re_reports(review_id);
create index re_reports_comment on public.re_reports(comment_id);

alter table public.re_cook_reviews enable row level security;
alter table public.re_review_assets enable row level security;
alter table public.re_recipe_comments enable row level security;
alter table public.re_bookmarks enable row level security;
alter table public.re_notifications enable row level security;
alter table public.re_reports enable row level security;
revoke all on public.re_cook_reviews,public.re_review_assets,public.re_recipe_comments,public.re_bookmarks,public.re_notifications,public.re_reports from public,anon,authenticated;
grant select(id,recipe_id,recipe_version_id,author_id,rating,body,status,revision,created_at,updated_at) on public.re_cook_reviews to anon,authenticated;
grant select on public.re_review_assets to anon,authenticated;
grant select(id,recipe_id,author_id,parent_id,kind,body,status,revision,created_at,updated_at) on public.re_recipe_comments to anon,authenticated;
grant select on public.re_bookmarks,public.re_notifications to authenticated;
grant select(id,reporter_id,recipe_id,review_id,comment_id,reason_code,status,created_at) on public.re_reports to authenticated;

create function re_private.re_community_viewer()
returns uuid language sql stable security definer set search_path = '' as $$
  select case when auth.uid() is not null and re_private.re_is_active_member() then re_private.re_current_profile_id() end;
$$;
create function re_private.re_review_is_public(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.re_cook_reviews r where r.id = p_id and r.status = 'published'
    and re_private.re_recipe_is_public(r.recipe_id) and re_private.re_is_public_profile(r.author_id));
$$;
create function re_private.re_comment_is_readable(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.re_recipe_comments c where c.id = p_id and re_private.re_recipe_is_public(c.recipe_id)
    and (c.status = 'deleted' or (c.status = 'published' and re_private.re_is_public_profile(c.author_id)))
    and (c.parent_id is null or exists(select 1 from public.re_recipe_comments p where p.id = c.parent_id
      and (p.status = 'deleted' or (p.status = 'published' and re_private.re_is_public_profile(p.author_id))))));
$$;
revoke all on function re_private.re_community_viewer(),re_private.re_review_is_public(uuid),re_private.re_comment_is_readable(uuid) from public,anon,authenticated;
grant execute on function re_private.re_community_viewer(),re_private.re_review_is_public(uuid),re_private.re_comment_is_readable(uuid) to anon,authenticated;
create policy re_reviews_public_read on public.re_cook_reviews for select to anon,authenticated using(re_private.re_review_is_public(id));
create policy re_reviews_own_read on public.re_cook_reviews for select to authenticated
  using(author_id = (select re_private.re_community_viewer()) and re_private.re_recipe_is_public(recipe_id));
create policy re_review_assets_read on public.re_review_assets for select to anon,authenticated
  using(re_private.re_review_is_public(review_id));
create policy re_review_assets_own_read on public.re_review_assets for select to authenticated
  using(exists(select 1 from public.re_cook_reviews r where r.id = review_id and r.author_id = (select re_private.re_community_viewer())));
create policy re_comments_read on public.re_recipe_comments for select to anon,authenticated using(re_private.re_comment_is_readable(id));
create policy re_bookmarks_own_read on public.re_bookmarks for select to authenticated using(profile_id = (select re_private.re_community_viewer()));
create policy re_notifications_own_read on public.re_notifications for select to authenticated using(recipient_id = (select re_private.re_community_viewer()));
create policy re_reports_own_read on public.re_reports for select to authenticated using(reporter_id = (select re_private.re_community_viewer()));

-- Review photos are pinned to their recipe version; recipe photos cannot be reused.
alter table public.re_media_assets drop constraint re_media_assets_purpose_check;
alter table public.re_media_assets add constraint re_media_assets_purpose_check check(purpose in ('recipe','review'));
alter table public.re_media_assets add column recipe_version_id uuid;
alter table public.re_media_assets add constraint re_media_assets_version_fk foreign key(recipe_id,recipe_version_id) references public.re_recipe_versions(recipe_id,id);
alter table public.re_media_assets add constraint re_media_assets_purpose_version_check check((purpose = 'recipe' and recipe_version_id is null) or (purpose = 'review' and recipe_version_id is not null));
create index re_media_review_owner_version on public.re_media_assets(owner_id,recipe_version_id) where purpose = 'review';
-- recipe_version_id is safe metadata; storage paths and processing tokens stay private.
grant select(recipe_version_id) on public.re_media_assets to anon,authenticated;


-- Single mutation path: P4 must add period locks/snapshot updates inside this
-- transaction BEFORE changing the review. No direct client table mutations.
create function re_private.re_mutate_cook_review(p_version_id uuid,p_expected_revision integer,p_rating integer,p_body text,
  p_asset_ids uuid[],p_request_id uuid,p_delete boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := re_private.re_require_recipe_author(); recipe public.re_recipes%rowtype;
  review public.re_cook_reviews%rowtype; digest text; asset_count integer;
begin
  if p_request_id is null or p_expected_revision is null or p_expected_revision < 0 or p_delete is null then
    raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  select r.* into recipe from public.re_recipes r join public.re_recipe_versions v on v.recipe_id = r.id
    where v.id = p_version_id for update of r;
  if not found or not re_private.re_recipe_is_public(recipe.id) then raise exception 'NOT_FOUND'; end if;
  if recipe.author_id = actor then raise exception 'SELF_REVIEW' using errcode = '42501'; end if;
  digest := encode(sha256(convert_to(jsonb_build_array(p_version_id,p_expected_revision,p_rating,btrim(p_body),p_asset_ids,p_delete)::text,'UTF8')),'hex');
  select * into review from public.re_cook_reviews where author_id = actor and recipe_version_id = p_version_id for update;
  if found and review.last_request_id = p_request_id then
    if review.last_request_hash <> digest then raise exception 'CONFLICT'; end if;
    return jsonb_build_object('id',review.id,'revision',review.revision);
  end if;
  if review.status = 'hidden' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if coalesce(review.revision,0) <> p_expected_revision then raise exception 'CONFLICT'; end if;
  if p_delete then
    if review.id is null then raise exception 'NOT_FOUND'; end if;
    perform re_private.re_consume_recipe_limit(actor::text,'review.edit','minute',30);
    update public.re_cook_reviews set status = 'deleted',body = '',rating = null,revision = revision + 1,
      last_request_id = p_request_id,last_request_hash = digest,updated_at = clock_timestamp() where id = review.id returning * into review;
    delete from public.re_review_assets where review_id = review.id;
  else
    if p_rating is null or p_rating not between 1 and 5 or p_body is null or char_length(btrim(p_body)) not between 20 and 2000
      or coalesce(cardinality(p_asset_ids),0) not between 1 and 3
      or (select count(distinct x) from unnest(p_asset_ids) x) <> cardinality(p_asset_ids) then
      raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
    perform 1 from public.re_media_assets where id = any(p_asset_ids) order by id for update;
    select count(*) into asset_count from public.re_media_assets a where a.id = any(p_asset_ids) and a.owner_id = actor
      and a.recipe_id = recipe.id and a.recipe_version_id = p_version_id and a.purpose = 'review' and a.status = 'ready'
      and not exists(select 1 from public.re_review_assets ra where ra.asset_id = a.id and ra.review_id <> coalesce(review.id,'00000000-0000-0000-0000-000000000000'::uuid));
    if asset_count <> cardinality(p_asset_ids) then raise exception 'ASSET_NOT_READY'; end if;
    if review.id is null then
      perform re_private.re_consume_recipe_limit(actor::text,'review.create','day',10);
      insert into public.re_cook_reviews(recipe_id,recipe_version_id,author_id,rating,body,last_request_id,last_request_hash)
        values(recipe.id,p_version_id,actor,p_rating,btrim(p_body),p_request_id,digest) returning * into review;
      insert into public.re_notifications(recipient_id,actor_id,type,entity_id,event_key)
        values(recipe.author_id,actor,'review',review.id,'review:'||review.id::text||':created') on conflict(recipient_id,event_key) do nothing;
    else
      perform re_private.re_consume_recipe_limit(actor::text,'review.edit','minute',30);
      update public.re_cook_reviews set rating = p_rating,body = btrim(p_body),status = 'published',revision = revision + 1,
        last_request_id = p_request_id,last_request_hash = digest,updated_at = clock_timestamp() where id = review.id returning * into review;
    end if;
    delete from public.re_review_assets where review_id = review.id;
    insert into public.re_review_assets(review_id,asset_id,position) select review.id,x.id,x.pos::integer from unnest(p_asset_ids) with ordinality x(id,pos);
  end if;
  return jsonb_build_object('id',review.id,'revision',review.revision);
end;
$$;
create function public.re_upsert_cook_review(p_version_id uuid,p_expected_revision integer,p_rating integer,p_body text,p_asset_ids uuid[],p_request_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select re_private.re_mutate_cook_review(p_version_id,p_expected_revision,p_rating,p_body,p_asset_ids,p_request_id,false); $$;
create function public.re_delete_cook_review(p_version_id uuid,p_expected_revision integer,p_request_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select re_private.re_mutate_cook_review(p_version_id,p_expected_revision,null,null,null,p_request_id,true); $$;

create function re_private.re_write_recipe_comment(p_id uuid,p_recipe_id uuid,p_parent_id uuid,p_kind text,p_body text,p_expected_revision integer,p_request_id uuid,p_delete boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := re_private.re_require_recipe_author(); c public.re_recipe_comments%rowtype; parent public.re_recipe_comments%rowtype; digest text;
begin
  if p_id is null or p_request_id is null or p_expected_revision is null or p_expected_revision < 0 or p_delete is null
    or p_kind is null or p_kind not in ('question','substitution','suggestion','general') then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  perform 1 from public.re_recipes where id = p_recipe_id for update;
  if not found or not re_private.re_recipe_is_public(p_recipe_id) then raise exception 'NOT_FOUND'; end if;
  digest := encode(sha256(convert_to(jsonb_build_array(p_recipe_id,p_parent_id,p_kind,btrim(p_body),p_expected_revision,p_delete)::text,'UTF8')),'hex');
  select * into c from public.re_recipe_comments where id = p_id for update;
  if found then
    if c.author_id <> actor or c.recipe_id <> p_recipe_id or c.parent_id is distinct from p_parent_id then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
    if c.last_request_id = p_request_id then
      if c.last_request_hash <> digest then raise exception 'CONFLICT'; end if;
      return jsonb_build_object('id',c.id,'revision',c.revision);
    end if;
    if c.status <> 'published' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  end if;
  if coalesce(c.revision,0) <> p_expected_revision then raise exception 'CONFLICT'; end if;
  if p_parent_id is not null then
    select * into parent from public.re_recipe_comments where id = p_parent_id and recipe_id = p_recipe_id and parent_id is null;
    if not found or not re_private.re_comment_is_readable(parent.id) then raise exception 'NOT_FOUND'; end if;
  end if;
  if p_delete then
    if c.id is null then raise exception 'NOT_FOUND'; end if;
    perform re_private.re_consume_recipe_limit(actor::text,'comment.edit','minute',30);
    update public.re_recipe_comments set status = 'deleted',body = '',revision = revision + 1,updated_at = clock_timestamp(),
      last_request_id = p_request_id,last_request_hash = digest where id = p_id returning * into c;
  else
    if p_body is null or char_length(btrim(p_body)) not between 1 and 1000 then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
    if c.id is null then
      perform re_private.re_consume_recipe_limit(actor::text,'comment.create','minute',5);
      perform re_private.re_consume_recipe_limit(actor::text,'comment.create.day','day',100);
      insert into public.re_recipe_comments(id,recipe_id,author_id,parent_id,kind,body,last_request_id,last_request_hash)
        values(p_id,p_recipe_id,actor,p_parent_id,p_kind,btrim(p_body),p_request_id,digest) returning * into c;
      if parent.status = 'published' and parent.author_id <> actor then
        insert into public.re_notifications(recipient_id,actor_id,type,entity_id,event_key)
          values(parent.author_id,actor,'reply',c.id,'comment:'||c.id::text||':reply') on conflict(recipient_id,event_key) do nothing;
      end if;
    else
      perform re_private.re_consume_recipe_limit(actor::text,'comment.edit','minute',30);
      update public.re_recipe_comments set kind = p_kind,body = btrim(p_body),revision = revision + 1,updated_at = clock_timestamp(),
        last_request_id = p_request_id,last_request_hash = digest where id = p_id returning * into c;
    end if;
  end if;
  return jsonb_build_object('id',c.id,'revision',c.revision);
end;
$$;
create function public.re_write_recipe_comment(p_id uuid,p_recipe_id uuid,p_parent_id uuid,p_kind text,p_body text,p_expected_revision integer,p_request_id uuid,p_delete boolean default false)
returns jsonb language sql security invoker set search_path = '' as $$ select re_private.re_write_recipe_comment(p_id,p_recipe_id,p_parent_id,p_kind,p_body,p_expected_revision,p_request_id,p_delete); $$;

create function re_private.re_set_bookmark(p_recipe_id uuid,p_saved boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare actor uuid := re_private.re_require_recipe_author();
begin
  if p_saved is null then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  perform re_private.re_consume_recipe_limit(actor::text,'bookmark.set','minute',60);
  if p_saved then
    perform 1 from public.re_recipes where id = p_recipe_id for update;
    if not found or not re_private.re_recipe_is_public(p_recipe_id) then raise exception 'NOT_FOUND'; end if;
    insert into public.re_bookmarks(profile_id,recipe_id) values(actor,p_recipe_id) on conflict do nothing;
  else delete from public.re_bookmarks where profile_id = actor and recipe_id = p_recipe_id;
  end if;
  return p_saved;
end;
$$;
create function public.re_set_bookmark(p_recipe_id uuid,p_saved boolean) returns boolean language sql security invoker set search_path = '' as $$ select re_private.re_set_bookmark(p_recipe_id,p_saved); $$;

create function re_private.re_submit_report(p_target_type text,p_target_id uuid,p_reason text,p_detail text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := re_private.re_require_recipe_author(); existing uuid;
begin
  if p_target_type is null or p_target_type not in ('recipe','review','comment') or p_target_id is null
    or p_reason is null or p_reason not in ('spam','abuse','rights','unsafe','other')
    or p_detail is null or char_length(btrim(p_detail)) not between 10 and 1000 then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  if not (case p_target_type when 'recipe' then re_private.re_recipe_is_public(p_target_id)
    when 'review' then re_private.re_review_is_public(p_target_id)
    else re_private.re_comment_is_readable(p_target_id) and exists(select 1 from public.re_recipe_comments where id = p_target_id and status = 'published') end) then raise exception 'NOT_FOUND'; end if;
  select id into existing from public.re_reports where reporter_id = actor and status in ('pending','reviewing') and
    (case p_target_type when 'recipe' then recipe_id when 'review' then review_id else comment_id end) = p_target_id;
  if found then return existing; end if;
  perform re_private.re_consume_recipe_limit(actor::text,'report.create','day',20);
  insert into public.re_reports(reporter_id,recipe_id,review_id,comment_id,reason_code,detail)
    values(actor,case when p_target_type = 'recipe' then p_target_id end,case when p_target_type = 'review' then p_target_id end,
      case when p_target_type = 'comment' then p_target_id end,p_reason,btrim(p_detail)) returning id into existing;
  return existing;
end;
$$;
create function public.re_submit_report(p_target_type text,p_target_id uuid,p_reason text,p_detail text) returns uuid language sql security invoker set search_path = '' as $$ select re_private.re_submit_report(p_target_type,p_target_id,p_reason,p_detail); $$;
create function re_private.re_mark_notifications_read(p_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare actor uuid := re_private.re_require_recipe_author(); changed integer;
begin
  if coalesce(cardinality(p_ids),0) not between 1 and 100 or array_position(p_ids,null) is not null then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  perform re_private.re_consume_recipe_limit(actor::text,'notification.read','minute',60);
  update public.re_notifications set read_at = clock_timestamp() where id = any(p_ids) and recipient_id = actor and read_at is null;
  get diagnostics changed = row_count;
  return changed;
end;
$$;
create function public.re_mark_notifications_read(p_ids uuid[]) returns integer language sql security invoker set search_path = '' as $$ select re_private.re_mark_notifications_read(p_ids); $$;

revoke all on function re_private.re_mutate_cook_review(uuid,integer,integer,text,uuid[],uuid,boolean),public.re_upsert_cook_review(uuid,integer,integer,text,uuid[],uuid),public.re_delete_cook_review(uuid,integer,uuid),
  re_private.re_write_recipe_comment(uuid,uuid,uuid,text,text,integer,uuid,boolean),public.re_write_recipe_comment(uuid,uuid,uuid,text,text,integer,uuid,boolean),
  re_private.re_set_bookmark(uuid,boolean),public.re_set_bookmark(uuid,boolean),re_private.re_submit_report(text,uuid,text,text),public.re_submit_report(text,uuid,text,text),
  re_private.re_mark_notifications_read(uuid[]),public.re_mark_notifications_read(uuid[]) from public,anon,authenticated;
grant execute on function re_private.re_mutate_cook_review(uuid,integer,integer,text,uuid[],uuid,boolean),public.re_upsert_cook_review(uuid,integer,integer,text,uuid[],uuid),public.re_delete_cook_review(uuid,integer,uuid),
  re_private.re_write_recipe_comment(uuid,uuid,uuid,text,text,integer,uuid,boolean),public.re_write_recipe_comment(uuid,uuid,uuid,text,text,integer,uuid,boolean),
  re_private.re_set_bookmark(uuid,boolean),public.re_set_bookmark(uuid,boolean),re_private.re_submit_report(text,uuid,text,text),public.re_submit_report(text,uuid,text,text),
  re_private.re_mark_notifications_read(uuid[]),public.re_mark_notifications_read(uuid[]) to authenticated;

create or replace function re_private.re_media_is_readable(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.re_media_assets a where a.id = p_id and a.status = 'ready' and (
    (auth.uid() is not null and a.owner_id = re_private.re_current_profile_id() and re_private.re_is_active_member())
    or exists(select 1 from public.re_recipe_version_assets va join public.re_recipe_versions v on v.id = va.version_id
      where va.asset_id = a.id and re_private.re_recipe_is_public(v.recipe_id))
    or exists(select 1 from public.re_review_assets ra where ra.asset_id = a.id and re_private.re_review_is_public(ra.review_id))));
$$;
create function re_private.re_reserve_review_upload(p_version_id uuid,p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := re_private.re_require_recipe_author(); recipe public.re_recipes%rowtype; a public.re_media_assets%rowtype; asset_id uuid := gen_random_uuid();
begin
  if p_request_id is null then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  select r.* into recipe from public.re_recipes r join public.re_recipe_versions v on v.recipe_id = r.id where v.id = p_version_id for update of r;
  if not found or not re_private.re_recipe_is_public(recipe.id) then raise exception 'NOT_FOUND'; end if;
  if recipe.author_id = actor then raise exception 'SELF_REVIEW' using errcode = '42501'; end if;
  if exists(select 1 from public.re_cook_reviews where recipe_version_id = p_version_id and author_id = actor and status = 'hidden') then raise exception 'FORBIDDEN'; end if;
  perform re_private.re_consume_recipe_limit(actor::text,'media.sign','hour',60);
  select * into a from public.re_media_assets where owner_id = actor and upload_request_id = p_request_id;
  if found then
    if a.purpose <> 'review' or a.recipe_version_id is distinct from p_version_id then raise exception 'CONFLICT'; end if;
    return a.id;
  end if;
  if (select count(*) from public.re_media_assets where owner_id = actor and recipe_version_id = p_version_id and purpose = 'review') >= 30 then raise exception 'ASSET_LIMIT'; end if;
  insert into public.re_media_assets(id,owner_id,recipe_id,recipe_version_id,purpose,original_path,upload_request_id)
    values(asset_id,actor,recipe.id,p_version_id,'review','originals/'||actor::text||'/'||asset_id::text,p_request_id);
  return asset_id;
end;
$$;
create function public.re_reserve_review_upload(p_version_id uuid,p_request_id uuid) returns uuid language sql security invoker set search_path = '' as $$ select re_private.re_reserve_review_upload(p_version_id,p_request_id); $$;
revoke all on function re_private.re_reserve_review_upload(uuid,uuid),public.re_reserve_review_upload(uuid,uuid) from public,anon,authenticated;
grant execute on function re_private.re_reserve_review_upload(uuid,uuid),public.re_reserve_review_upload(uuid,uuid) to authenticated;

create or replace function re_private.re_reserve_recipe_upload(p_recipe_id uuid,p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := re_private.re_require_recipe_author(); v_id uuid; v_recipe uuid;
begin
  if p_request_id is null then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  perform 1 from public.re_recipes where id = p_recipe_id and author_id = v_owner and status in ('draft','published') for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  perform re_private.re_consume_recipe_limit(v_owner::text,'media.sign','hour',60);
  select id,recipe_id into v_id,v_recipe from public.re_media_assets where owner_id = v_owner and upload_request_id = p_request_id;
  if found then
    if v_recipe <> p_recipe_id or exists(select 1 from public.re_media_assets where id = v_id and purpose <> 'recipe') then raise exception 'CONFLICT' using errcode = 'P0001'; end if;
    return v_id;
  end if;
  if (select count(*) from public.re_media_assets where recipe_id = p_recipe_id and purpose = 'recipe') >= 100 then
    raise exception 'ASSET_LIMIT' using errcode = 'P0001'; end if;
  v_id := gen_random_uuid();
  insert into public.re_media_assets(id,owner_id,recipe_id,original_path,upload_request_id)
    values(v_id,v_owner,p_recipe_id,'originals/'||v_owner::text||'/'||v_id::text,p_request_id);
  return v_id;
end;
$$;
create or replace function re_private.re_claim_recipe_upload(p_asset_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := re_private.re_require_recipe_author(); a public.re_media_assets%rowtype; v_token uuid := gen_random_uuid();
begin
  perform re_private.re_consume_recipe_limit(v_owner::text,'media.complete','minute',30);
  select * into a from public.re_media_assets where id = p_asset_id and owner_id = v_owner for update;
  if not found or not exists(select 1 from public.re_recipes where id = a.recipe_id and ((a.purpose = 'recipe' and author_id = v_owner and status in ('draft','published'))
      or (a.purpose = 'review' and author_id <> v_owner and re_private.re_recipe_is_public(id)
        and not exists(select 1 from public.re_cook_reviews cr where cr.recipe_version_id = a.recipe_version_id and cr.author_id = v_owner and cr.status = 'hidden')))) then
    raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if a.status = 'ready' then return jsonb_build_object('id',a.id,'status','ready','token',null); end if;
  if a.status = 'processing' and a.processing_started_at > clock_timestamp() - interval '2 minutes' then
    raise exception 'IN_PROGRESS' using errcode = 'P0001'; end if;
  if a.status not in ('pending','processing') or a.attempts >= 5 then raise exception 'UPLOAD_REJECTED' using errcode = 'P0001'; end if;
  update public.re_media_assets set status = 'processing',processing_token = v_token,processing_started_at = clock_timestamp(),
    attempts = attempts + 1,error_code = null where id = a.id;
  return jsonb_build_object('id',a.id,'status','processing','token',v_token);
end;
$$;
create or replace function re_private.re_finish_recipe_upload(p_asset_id uuid,p_owner_id uuid,p_token uuid,p_result jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare a public.re_media_assets%rowtype;
begin
  select * into a from public.re_media_assets where id = p_asset_id and owner_id = p_owner_id
    and status = 'processing' and processing_token = p_token for update;
  if not found then return false; end if;
  if p_result->>'status' = 'ready' then
    if not exists (select 1 from re_private.re_accounts ac join auth.users u on u.id = ac.auth_user_id
      join public.re_profiles p on p.id = ac.profile_id join public.re_recipes r on r.id = a.recipe_id
      where ac.profile_id = p_owner_id and ac.status = 'active' and ac.profile_completed_at is not null
        and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
        and (u.banned_until is null or u.banned_until <= clock_timestamp()) and p.visibility_status = 'active'
        and ((a.purpose = 'recipe' and r.author_id = p_owner_id and r.status in ('draft','published'))
          or (a.purpose = 'review' and r.author_id <> p_owner_id and re_private.re_recipe_is_public(r.id)
            and not exists(select 1 from public.re_cook_reviews cr where cr.recipe_version_id = a.recipe_version_id and cr.author_id = p_owner_id and cr.status = 'hidden')))) then return false; end if;
    if (p_result->>'bytes')::integer not between 1 and 1048576
      or (p_result->>'width')::integer not between 1 and 1600 or (p_result->>'height')::integer not between 1 and 1600
      or coalesce(p_result->>'sha256','') !~ '^[a-f0-9]{64}$' then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
    update public.re_media_assets set status = 'ready',mime_type = 'image/webp',bytes = (p_result->>'bytes')::integer,
      width = (p_result->>'width')::integer,height = (p_result->>'height')::integer,sha256 = p_result->>'sha256',
      processed_path = 'processed/'||p_owner_id::text||'/'||p_asset_id::text||'/'||p_token::text||'.webp',error_code = null where id = p_asset_id;
  elsif p_result->>'status' in ('pending','rejected') and p_result->>'errorCode' in ('UPLOAD_MISSING','PROCESSING_FAILED','INVALID_IMAGE') then
    update public.re_media_assets set status = p_result->>'status',error_code = p_result->>'errorCode' where id = p_asset_id;
  else raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  return true;
end;
$$;

-- Only aggregate bookmark counts are public; saver identities remain private.
create function re_private.re_bookmark_summary(p_recipe_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when re_private.re_recipe_is_public(p_recipe_id) then jsonb_build_object(
    'bookmarkCount',(select count(*) from public.re_bookmarks b where b.recipe_id = p_recipe_id and re_private.re_is_public_profile(b.profile_id)),
    'saved',exists(select 1 from public.re_bookmarks b where b.recipe_id = p_recipe_id and b.profile_id = re_private.re_community_viewer()))
    else jsonb_build_object('bookmarkCount',0,'saved',false) end;
$$;
revoke all on function re_private.re_bookmark_summary(uuid) from public,anon,authenticated;
grant execute on function re_private.re_bookmark_summary(uuid) to anon,authenticated;
create view public.re_recipe_version_stats with(security_invoker = true) as
  select v.id as version_id,v.recipe_id,count(r.id) as review_count,avg(r.rating) as average_rating,
    case when count(r.id) > 0 then (sum(r.rating)::numeric+17.5)/(count(r.id)+5) end as adjusted_rating,
    max(r.created_at) as last_review_at
  from public.re_recipe_versions v left join public.re_cook_reviews r on r.recipe_version_id = v.id and re_private.re_review_is_public(r.id)
  where re_private.re_recipe_is_public(v.recipe_id) group by v.id,v.recipe_id;
revoke all on public.re_recipe_version_stats from public,anon,authenticated;
grant select on public.re_recipe_version_stats to anon,authenticated;

create or replace view public.re_recipe_cards with(security_invoker = true) as
select r.id as recipe_id,r.author_id,v.search_text,c.slug as category_slug,
  v.difficulty,v.prep_minutes+v.cook_minutes as total_minutes,v.published_at,
  jsonb_build_object('id',r.id,'versionId',v.id,'versionNo',v.version_no,'title',v.title,'summary',v.summary,
    'servings',v.servings,'minutes',v.prep_minutes+v.cook_minutes,'difficulty',v.difficulty,'category',c.name,
    'coverAssetId',v.cover_asset_id,'authorId',r.author_id,'author',p.display_name,'handle',p.handle,'publishedAt',v.published_at,
    'reviewCount',s.review_count,'averageRating',s.average_rating) || re_private.re_bookmark_summary(r.id) as card,
  s.review_count,s.adjusted_rating,s.last_review_at
from public.re_recipes r join public.re_recipe_versions v on v.id = r.current_version_id
join public.re_profiles p on p.id = r.author_id join public.re_categories c on c.id = v.category_id
join public.re_recipe_version_stats s on s.version_id = v.id
where re_private.re_recipe_is_public(r.id);
-- Replace, rather than overload, the defaulted signature for PostgREST resolution.
drop function public.re_search_recipes(text,text,integer,text,integer,uuid);
create function public.re_search_recipes(p_query text default '',p_category text default '',p_max_minutes integer default 1440,
  p_difficulty text default '',p_page integer default 1,p_author uuid default null,p_sort text default 'newest')
returns jsonb language sql stable security invoker set search_path = '' as $$
  with filtered as materialized (
    select * from public.re_recipe_cards c where
      strpos(c.search_text,lower(regexp_replace(normalize(left(coalesce(p_query,''),80),NFKC),'[[:space:]]+','','g'))) > 0
      and (coalesce(p_category,'') = '' or c.category_slug = p_category)
      and c.total_minutes <= least(greatest(coalesce(p_max_minutes,1440),1),1440)
      and (coalesce(p_difficulty,'') = '' or c.difficulty = p_difficulty)
      and (p_author is null or c.author_id = p_author)
  ), ranked as (
    select card,row_number() over(order by
      case when p_sort = 'rating' then adjusted_rating end desc nulls last,
      case when p_sort = 'reviews' then review_count end desc,
      case when p_sort = 'saved' then (card->>'bookmarkCount')::bigint end desc,
      published_at desc,recipe_id) as pos from filtered
  ), page_rows as (select * from ranked order by pos limit 12 offset ((least(greatest(coalesce(p_page,1),1),100)-1)*12))
  select jsonb_build_object('items',coalesce((select jsonb_agg(card order by pos) from page_rows),'[]'::jsonb),'total',(select count(*) from filtered));
$$;
create or replace function public.re_get_recipe_detail(p_recipe_id uuid, p_version_id uuid default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('card',jsonb_build_object('id',r.id,'versionId',v.id,'versionNo',v.version_no,
    'title',v.title,'summary',v.summary,'servings',v.servings,'minutes',v.prep_minutes+v.cook_minutes,
    'difficulty',v.difficulty,'category',c.name,'coverAssetId',v.cover_asset_id,
    'authorId',r.author_id,'author',p.display_name,'handle',p.handle,'publishedAt',v.published_at,'reviewCount',s.review_count,'averageRating',s.average_rating) || re_private.re_bookmark_summary(r.id),
    'body',v.body,'currentVersionId',r.current_version_id,
    'versions',(select jsonb_agg(jsonb_build_object('id',h.id,'versionNo',h.version_no,'publishedAt',h.published_at) order by h.version_no desc)
      from public.re_recipe_versions h where h.recipe_id = r.id))
  from public.re_recipes r join public.re_recipe_versions v on v.recipe_id = r.id and v.id = coalesce(p_version_id,r.current_version_id)
  join public.re_profiles p on p.id = r.author_id join public.re_categories c on c.id = v.category_id
  join public.re_recipe_version_stats s on s.version_id = v.id
  where r.id = p_recipe_id and re_private.re_recipe_is_public(r.id);
$$;

create view public.re_review_cards with(security_invoker = true) as
select r.id,r.recipe_id,r.recipe_version_id,r.author_id,r.created_at,
  jsonb_build_object('id',r.id,'recipeId',r.recipe_id,'versionId',r.recipe_version_id,'versionNo',v.version_no,
    'title',v.title,'authorId',r.author_id,'author',p.display_name,'handle',p.handle,'rating',r.rating,'body',r.body,
    'revision',r.revision,'status',r.status,'createdAt',r.created_at,'updatedAt',r.updated_at,
    'assetIds',coalesce((select jsonb_agg(a.asset_id order by a.position) from public.re_review_assets a where a.review_id = r.id),'[]'::jsonb)) as card
from public.re_cook_reviews r join public.re_recipe_versions v on v.id = r.recipe_version_id join public.re_profiles p on p.id = r.author_id
where re_private.re_review_is_public(r.id);
create view public.re_comment_cards with(security_invoker = true) as
select c.id,c.recipe_id,c.parent_id,c.created_at,
  jsonb_build_object('id',c.id,'recipeId',c.recipe_id,'parentId',c.parent_id,'kind',c.kind,'body',c.body,
    'authorId',case when c.status = 'published' then c.author_id end,
    'author',case when c.status = 'published' then p.display_name else '삭제된 댓글' end,
    'handle',case when c.status = 'published' then p.handle end,'status',c.status,'revision',c.revision,'createdAt',c.created_at) as card
from public.re_recipe_comments c left join public.re_profiles p on p.id = c.author_id where re_private.re_comment_is_readable(c.id);
revoke all on public.re_review_cards,public.re_comment_cards from public,anon,authenticated;
grant select on public.re_review_cards,public.re_comment_cards to anon,authenticated;

create function public.re_get_recipe_community(p_recipe_id uuid,p_version_id uuid,p_reviews_page integer default 1,
  p_comments_page integer default 1,p_thread_id uuid default null,p_replies_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with reviews as materialized(select * from public.re_review_cards where recipe_id = p_recipe_id),
  review_page as(select * from reviews order by created_at desc,id limit 12 offset ((least(greatest(coalesce(p_reviews_page,1),1),100)-1)*12)),
  roots as materialized(select * from public.re_comment_cards where recipe_id = p_recipe_id and parent_id is null),
  root_page as(select * from roots where p_thread_id is null or id = p_thread_id order by created_at desc,id
    limit 12 offset (case when p_thread_id is null then (least(greatest(coalesce(p_comments_page,1),1),100)-1)*12 else 0 end)),
  threads as(select c.card || jsonb_build_object('replies',coalesce((select jsonb_agg(reply.card order by reply.created_at,reply.id) from
    (select * from public.re_comment_cards where parent_id = c.id order by created_at,id
      limit case when p_thread_id is null then 3 else 12 end
      offset case when p_thread_id is null then 0 else (least(greatest(coalesce(p_replies_page,1),1),100)-1)*12 end) reply),'[]'::jsonb),
    'replyCount',(select count(*) from public.re_comment_cards where parent_id = c.id)) as card,c.created_at,c.id from root_page c)
  select jsonb_build_object('reviews',coalesce((select jsonb_agg(card order by created_at desc,id) from review_page),'[]'::jsonb),
    'reviewTotal',(select count(*) from reviews),'comments',coalesce((select jsonb_agg(card order by created_at desc,id) from threads),'[]'::jsonb),
    'commentTotal',(select count(*) from roots),'ownReview',
    (select jsonb_build_object('id',r.id,'recipeId',r.recipe_id,'versionId',r.recipe_version_id,'versionNo',v.version_no,'title',v.title,
      'authorId',r.author_id,'author',p.display_name,'handle',p.handle,'rating',r.rating,'body',r.body,'status',r.status,
      'revision',r.revision,'createdAt',r.created_at,'updatedAt',r.updated_at,
      'assetIds',coalesce((select jsonb_agg(a.asset_id order by position) from public.re_review_assets a where a.review_id = r.id),'[]'::jsonb))
      from public.re_cook_reviews r join public.re_recipe_versions v on v.id = r.recipe_version_id join public.re_profiles p on p.id = r.author_id
      where r.recipe_id = p_recipe_id and r.recipe_version_id = p_version_id and r.author_id = re_private.re_community_viewer()))
  where re_private.re_recipe_is_public(p_recipe_id) and exists(select 1 from public.re_recipe_versions where id = p_version_id and recipe_id = p_recipe_id);
$$;
create function public.re_get_profile_reviews(p_author_id uuid,p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with rows as materialized(select * from public.re_review_cards where author_id = p_author_id),
  page_rows as(select * from rows order by created_at desc,id limit 12 offset ((least(greatest(coalesce(p_page,1),1),100)-1)*12))
  select jsonb_build_object('items',coalesce((select jsonb_agg(card order by created_at desc,id) from page_rows),'[]'::jsonb),'total',(select count(*) from rows));
$$;
create function public.re_get_my_bookmarks(p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with rows as materialized(select b.recipe_id,b.created_at,c.card from public.re_bookmarks b left join public.re_recipe_cards c on c.recipe_id = b.recipe_id
    where b.profile_id = re_private.re_community_viewer()),
  page_rows as(select * from rows order by created_at desc,recipe_id limit 12 offset ((least(greatest(coalesce(p_page,1),1),100)-1)*12))
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('recipeId',recipe_id,'card',card) order by created_at desc,recipe_id) from page_rows),'[]'::jsonb),'total',(select count(*) from rows));
$$;
create function public.re_get_my_notifications(p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with rows as materialized(select * from public.re_notifications where recipient_id = re_private.re_community_viewer()),
  page_rows as(select * from rows order by created_at desc,id limit 12 offset ((least(greatest(coalesce(p_page,1),1),100)-1)*12)),
  visible as(select n.id,n.created_at,jsonb_build_object('id',n.id,'type',n.type,'readAt',n.read_at,'createdAt',n.created_at,
    'recipeId',coalesce(r.recipe_id,c.recipe_id),'versionId',r.recipe_version_id,'entityId',coalesce(r.id,c.id),
    'threadId',c.parent_id) as card from page_rows n
    left join public.re_review_cards r on n.type = 'review' and r.id = n.entity_id
    left join public.re_comment_cards c on n.type = 'reply' and c.id = n.entity_id and c.card->>'status' = 'published')
  select jsonb_build_object('items',coalesce((select jsonb_agg(card order by created_at desc,id) from visible),'[]'::jsonb),
    'total',(select count(*) from rows),'unread',(select count(*) from rows where read_at is null));
$$;
create function public.re_get_my_reports(p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with rows as materialized(select id,reason_code,status,created_at from public.re_reports where reporter_id = re_private.re_community_viewer()),
  page_rows as(select * from rows order by created_at desc,id limit 12 offset ((least(greatest(coalesce(p_page,1),1),100)-1)*12))
  select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc,id) from page_rows p),'[]'::jsonb),'total',(select count(*) from rows));
$$;
create function public.re_get_recently_reviewed_recipes()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(card order by last_review_at desc,recipe_id),'[]'::jsonb) from
    (select card,last_review_at,recipe_id from public.re_recipe_cards where review_count > 0 order by last_review_at desc,recipe_id limit 3) r;
$$;
revoke all on function public.re_search_recipes(text,text,integer,text,integer,uuid,text),public.re_get_recipe_community(uuid,uuid,integer,integer,uuid,integer),
  public.re_get_profile_reviews(uuid,integer),public.re_get_my_bookmarks(integer),public.re_get_my_notifications(integer),public.re_get_my_reports(integer),public.re_get_recently_reviewed_recipes() from public,anon,authenticated;
grant execute on function public.re_search_recipes(text,text,integer,text,integer,uuid,text),public.re_get_recipe_community(uuid,uuid,integer,integer,uuid,integer),
  public.re_get_profile_reviews(uuid,integer),public.re_get_recently_reviewed_recipes() to anon,authenticated;
grant execute on function public.re_get_my_bookmarks(integer),public.re_get_my_notifications(integer),public.re_get_my_reports(integer) to authenticated;

create function public.re_get_my_reviews(p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with rows as materialized(select r.id,r.recipe_id,r.recipe_version_id,r.rating,r.body,r.status,r.revision,r.created_at,r.updated_at,r.author_id,
      v.version_no,v.title,p.display_name,p.handle
    from public.re_cook_reviews r join public.re_recipe_versions v on v.id = r.recipe_version_id join public.re_profiles p on p.id = r.author_id
    where r.author_id = re_private.re_community_viewer() and re_private.re_recipe_is_public(r.recipe_id)),
  page_rows as(select * from rows order by created_at desc,id limit 12 offset ((least(greatest(coalesce(p_page,1),1),100)-1)*12))
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'recipeId',r.recipe_id,'versionId',r.recipe_version_id,
    'versionNo',r.version_no,'title',r.title,'authorId',r.author_id,'author',r.display_name,'handle',r.handle,'rating',r.rating,'body',r.body,
    'revision',r.revision,'status',r.status,'createdAt',r.created_at,'updatedAt',r.updated_at,
    'assetIds',coalesce((select jsonb_agg(a.asset_id order by a.position) from public.re_review_assets a where a.review_id = r.id),'[]'::jsonb)) order by r.created_at desc,r.id)
    from page_rows r),'[]'::jsonb),'total',(select count(*) from rows));
$$;
revoke all on function public.re_get_my_reviews(integer) from public,anon,authenticated;
grant execute on function public.re_get_my_reviews(integer) to authenticated;
