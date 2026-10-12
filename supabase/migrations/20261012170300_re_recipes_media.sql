-- P2: writes through narrow RPCs, immutable publication snapshots, private media.
create table public.re_recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.re_profiles(id),
  creation_request_id uuid not null,
  current_version_id uuid,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden', 'deleted')),
  first_published_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (author_id, creation_request_id),
  check (status <> 'published' or (current_version_id is not null and first_published_at is not null))
);
create index re_recipes_author_updated on public.re_recipes(author_id, updated_at desc, id);
create index re_recipes_published on public.re_recipes(status, first_published_at desc, id);

create table public.re_recipe_drafts (
  recipe_id uuid primary key references public.re_recipes(id),
  body jsonb not null check (jsonb_typeof(body) = 'object' and octet_length(body::text) <= 262144),
  draft_version integer not null default 1 check (draft_version > 0),
  last_save_request_id uuid,
  updated_at timestamptz not null default clock_timestamp()
);

create table public.re_media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.re_profiles(id),
  recipe_id uuid not null references public.re_recipes(id),
  purpose text not null default 'recipe' check (purpose = 'recipe'),
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'rejected', 'deleted')),
  bucket text not null default 're_recipe_media' check (bucket = 're_recipe_media'),
  original_path text not null unique,
  processed_path text unique,
  upload_request_id uuid not null,
  processing_token uuid,
  processing_started_at timestamptz,
  attempts integer not null default 0 check (attempts between 0 and 5),
  error_code text,
  mime_type text,
  bytes integer,
  width integer,
  height integer,
  sha256 text,
  original_removed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique(owner_id, upload_request_id),
  check (status <> 'ready' or coalesce((processed_path is not null and mime_type = 'image/webp'
    and bytes between 1 and 1048576 and width between 1 and 1600 and height between 1 and 1600 and sha256 ~ '^[a-f0-9]{64}$'),false))
);
create index re_media_owner_created on public.re_media_assets(owner_id, created_at desc);
create index re_media_recipe_status on public.re_media_assets(recipe_id, status);
-- Keep P1's null-only avatar constraint until the avatar upload flow exists.
alter table public.re_profiles add constraint re_profiles_avatar_asset_fk
  foreign key(avatar_asset_id) references public.re_media_assets(id);

-- Body is the canonical, validated snapshot. Generated columns support search
-- and future review/award queries without two independently mutable copies.
create table public.re_recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.re_recipes(id),
  version_no integer not null check (version_no > 0),
  body jsonb not null check (jsonb_typeof(body) = 'object' and octet_length(body::text) <= 262144),
  title text generated always as (body->>'title') stored,
  summary text generated always as (body->>'summary') stored,
  servings integer generated always as ((body->>'servings')::integer) stored,
  prep_minutes integer generated always as ((body->>'prepMinutes')::integer) stored,
  cook_minutes integer generated always as ((body->>'cookMinutes')::integer) stored,
  difficulty text generated always as (body->>'difficulty') stored,
  category_id uuid not null references public.re_categories(id),
  cover_asset_id uuid not null references public.re_media_assets(id),
  content_hash text not null,
  search_text text not null,
  source_draft_version integer not null,
  publish_request_id uuid not null,
  published_at timestamptz not null default clock_timestamp(),
  unique(recipe_id, id), unique(recipe_id, version_no), unique(recipe_id, publish_request_id)
);
create index re_versions_category on public.re_recipe_versions(category_id);
create index re_versions_cover on public.re_recipe_versions(cover_asset_id);
alter table public.re_recipes add constraint re_recipes_current_version_fk
  foreign key(id, current_version_id) references public.re_recipe_versions(recipe_id, id);
create table public.re_recipe_version_assets (
  version_id uuid not null references public.re_recipe_versions(id),
  asset_id uuid not null references public.re_media_assets(id),
  slot text not null check (slot in ('cover', 'step')),
  position integer not null,
  primary key(version_id, slot, position),
  check ((slot = 'cover' and position = 0) or (slot = 'step' and position between 1 and 20))
);
create index re_version_assets_asset on public.re_recipe_version_assets(asset_id);

alter table public.re_recipes enable row level security;
alter table public.re_recipe_drafts enable row level security;
alter table public.re_recipe_versions enable row level security;
alter table public.re_recipe_version_assets enable row level security;
alter table public.re_media_assets enable row level security;
revoke all on public.re_recipes, public.re_recipe_drafts, public.re_recipe_versions,
  public.re_recipe_version_assets, public.re_media_assets from public, anon, authenticated;
grant select(id, author_id, current_version_id, status, first_published_at, created_at, updated_at)
  on public.re_recipes to anon, authenticated;
grant select(recipe_id, body, draft_version, updated_at) on public.re_recipe_drafts to authenticated;
grant select(id, recipe_id, version_no, body, title, summary, servings, prep_minutes, cook_minutes,
  difficulty, category_id, cover_asset_id, search_text, published_at) on public.re_recipe_versions to anon, authenticated;
grant select on public.re_recipe_version_assets to anon, authenticated;
-- Never grant paths, digests, processing tokens or operational metadata.
grant select(id, owner_id, recipe_id, purpose, status, width, height) on public.re_media_assets to anon, authenticated;

create function re_private.re_recipe_is_public(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.re_recipes r join public.re_profiles p on p.id = r.author_id
    where r.id = p_id and r.status = 'published' and p.visibility_status = 'active'
      and re_private.re_is_public_profile(p.id));
$$;
create function re_private.re_owns_recipe(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and re_private.re_is_active_member() and exists (
    select 1 from public.re_recipes r where r.id = p_id and r.author_id = re_private.re_current_profile_id());
$$;
create function re_private.re_media_is_readable(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.re_media_assets a where a.id = p_id and a.status = 'ready' and (
    (auth.uid() is not null and a.owner_id = re_private.re_current_profile_id() and re_private.re_is_active_member())
    or exists (select 1 from public.re_recipe_version_assets va join public.re_recipe_versions v on v.id = va.version_id
      where va.asset_id = a.id and re_private.re_recipe_is_public(v.recipe_id))));
$$;
revoke all on function re_private.re_recipe_is_public(uuid), re_private.re_owns_recipe(uuid), re_private.re_media_is_readable(uuid) from public, anon, authenticated;
grant execute on function re_private.re_recipe_is_public(uuid), re_private.re_media_is_readable(uuid) to anon, authenticated;
grant execute on function re_private.re_owns_recipe(uuid) to authenticated;
create policy re_recipes_public_read on public.re_recipes for select to anon, authenticated using (re_private.re_recipe_is_public(id));
create policy re_recipes_owner_read on public.re_recipes for select to authenticated using (re_private.re_owns_recipe(id));
create policy re_drafts_owner_read on public.re_recipe_drafts for select to authenticated using (re_private.re_owns_recipe(recipe_id));
create policy re_versions_public_read on public.re_recipe_versions for select to anon, authenticated using (re_private.re_recipe_is_public(recipe_id));
create policy re_versions_owner_read on public.re_recipe_versions for select to authenticated using (re_private.re_owns_recipe(recipe_id));
create policy re_version_assets_read on public.re_recipe_version_assets for select to anon, authenticated
  using (exists (select 1 from public.re_recipe_versions v where v.id = version_id));
create policy re_media_public_read on public.re_media_assets for select to anon, authenticated using (re_private.re_media_is_readable(id));
create policy re_media_owner_read on public.re_media_assets for select to authenticated
  using (owner_id = (select re_private.re_current_profile_id()) and (select re_private.re_is_active_member()));

create function re_private.re_require_recipe_author()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  select a.profile_id into v_id from re_private.re_accounts a join public.re_profiles p on p.id = a.profile_id
    where a.auth_user_id = auth.uid() and a.profile_completed_at is not null and p.visibility_status = 'active'
    for update of a;
  if not re_private.re_is_active_member() then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if v_id is null then raise exception 'PROFILE_REQUIRED' using errcode = '42501'; end if;
  return v_id;
end;
$$;
create function re_private.re_consume_recipe_limit(p_scope text, p_operation text, p_window text, p_max integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_now timestamptz := clock_timestamp();
begin
  delete from re_private.re_rate_limit_buckets where scope_key = p_scope and operation = p_operation
    and bucket_start < v_now - interval '2 days';
  insert into re_private.re_rate_limit_buckets as b(scope_key, operation, bucket_start, count)
    values(p_scope, p_operation, date_trunc(p_window, v_now, 'UTC'), 1)
    on conflict(scope_key, operation, bucket_start) do update set count = b.count + 1 returning count into v_count;
  if v_count > p_max then raise exception 'RATE_LIMITED' using errcode = 'P0001'; end if;
end;
$$;
create function re_private.re_recipe_text(p_value jsonb, p_max integer)
returns text language plpgsql immutable set search_path = '' as $$
declare v_text text;
begin
  if jsonb_typeof(p_value) is distinct from 'string' then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  v_text := btrim(regexp_replace(p_value #>> '{}', '[[:space:]]+', ' ', 'g'));
  if char_length(v_text) > p_max then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  return v_text;
end;
$$;
create function re_private.re_validate_recipe_body(p_body jsonb, p_publish boolean)
returns jsonb language plpgsql set search_path = '' as $$
declare
  b jsonb := p_body; x jsonb; v_key text; v_value text; v_num numeric;
  v_items jsonb := '[]'; v_steps jsonb := '[]'; v_tags jsonb := '[]';
  v_ids text[] := '{}'; v_position integer := 0;
begin
  if b is null or jsonb_typeof(b) <> 'object' or octet_length(b::text) > 262144
    or not (b ?& array['title','summary','servings','prepMinutes','cookMinutes','difficulty','categoryId',
      'ingredients','steps','coverAssetId','tips','tags','disclosureText','rightsConfirmed'])
    or (b - array['title','summary','servings','prepMinutes','cookMinutes','difficulty','categoryId',
      'ingredients','steps','coverAssetId','tips','tags','disclosureText','rightsConfirmed']) <> '{}'::jsonb then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;
  foreach v_key in array array['title','summary','tips','disclosureText'] loop
    b := jsonb_set(b, array[v_key], to_jsonb(re_private.re_recipe_text(b->v_key,
      case v_key when 'title' then 80 when 'summary' then 500 when 'tips' then 2000 else 500 end)));
  end loop;
  foreach v_key in array array['servings','prepMinutes','cookMinutes'] loop
    if jsonb_typeof(b->v_key) <> 'number' then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
    v_num := (b->>v_key)::numeric;
    if v_num <> trunc(v_num) or v_num < (case when v_key = 'servings' then 1 else 0 end)
      or v_num > (case when v_key = 'servings' then 20 else 720 end) then
      raise exception 'VALIDATION_ERROR' using errcode = '22023';
    end if;
    b := jsonb_set(b,array[v_key],to_jsonb(v_num::integer));
  end loop;
  if coalesce(b->>'difficulty','') not in ('easy','medium','hard') or jsonb_typeof(b->'rightsConfirmed') <> 'boolean' then
    raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  foreach v_key in array array['categoryId','coverAssetId'] loop
    if b->v_key <> 'null'::jsonb then
      if jsonb_typeof(b->v_key) <> 'string' or (b->>v_key) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
      b := jsonb_set(b,array[v_key],to_jsonb((b->>v_key)::uuid));
    end if;
  end loop;
  if jsonb_typeof(b->'ingredients') <> 'array' or jsonb_typeof(b->'steps') <> 'array' or jsonb_typeof(b->'tags') <> 'array' then
    raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  if jsonb_array_length(b->'ingredients') > 40 or jsonb_array_length(b->'steps') > 20 or jsonb_array_length(b->'tags') > 5 then
    raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  for x in select value from jsonb_array_elements(b->'ingredients') loop
    if jsonb_typeof(x) <> 'object' or not (x ?& array['id','name','quantity','unit','quantityText','optional'])
      or (x - array['id','name','quantity','unit','quantityText','optional']) <> '{}'::jsonb
      or coalesce(x->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or lower(x->>'id') = any(v_ids) or jsonb_typeof(x->'optional') <> 'boolean' then
      raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
    v_ids := array_append(v_ids, lower(x->>'id'));
    x := jsonb_set(x, '{name}', to_jsonb(re_private.re_recipe_text(x->'name', 50)));
    foreach v_key in array array['unit','quantityText'] loop
      if x->v_key <> 'null'::jsonb then x := jsonb_set(x, array[v_key],
        coalesce(to_jsonb(nullif(re_private.re_recipe_text(x->v_key, case v_key when 'unit' then 20 else 50 end),'')),'null'::jsonb)); end if;
    end loop;
    if x->'quantity' <> 'null'::jsonb then
      if jsonb_typeof(x->'quantity') <> 'number' then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
      v_num := (x->>'quantity')::numeric;
      if v_num <= 0 or v_num > 1000000 or v_num <> round(v_num, 3) then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
      x := jsonb_set(x,'{quantity}',to_jsonb(trim_scale(v_num)));
    end if;
    if p_publish and (x->>'name' = '' or (x->'quantity' = 'null'::jsonb and coalesce(x->>'quantityText','') = '')
      or (x->'quantity' <> 'null'::jsonb and coalesce(x->>'quantityText','') <> '')) then
      raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
    v_items := v_items || jsonb_build_array(x);
  end loop;
  v_ids := '{}';
  for x in select value from jsonb_array_elements(b->'steps') loop
    v_position := v_position + 1;
    if jsonb_typeof(x) <> 'object' or not (x ?& array['id','position','instruction','imageAssetId'])
      or (x - array['id','position','instruction','imageAssetId']) <> '{}'::jsonb
      or coalesce(x->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or lower(x->>'id') = any(v_ids) or x->'position' is distinct from to_jsonb(v_position) then
      raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
    v_ids := array_append(v_ids, lower(x->>'id'));
    if x->'imageAssetId' <> 'null'::jsonb and (jsonb_typeof(x->'imageAssetId') <> 'string'
      or (x->>'imageAssetId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
      raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
    if x->>'imageAssetId' is not null then x := jsonb_set(x,'{imageAssetId}',to_jsonb((x->>'imageAssetId')::uuid)); end if;
    x := jsonb_set(x, '{instruction}', to_jsonb(re_private.re_recipe_text(x->'instruction', 1500)));
    if p_publish and char_length(x->>'instruction') < 10 then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
    v_steps := v_steps || jsonb_build_array(x);
  end loop;
  for x in select value from jsonb_array_elements(b->'tags') loop
    v_value := re_private.re_recipe_text(x, 20);
    if char_length(v_value) < 2 then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
    if not v_tags @> jsonb_build_array(v_value) then v_tags := v_tags || jsonb_build_array(v_value); end if;
  end loop;
  b := b || jsonb_build_object('ingredients',v_items,'steps',v_steps,'tags',v_tags);
  if p_publish and (char_length(b->>'title') < 5 or char_length(b->>'summary') < 20
    or (b->>'prepMinutes')::integer + (b->>'cookMinutes')::integer < 1
    or jsonb_array_length(v_items) = 0 or jsonb_array_length(v_steps) = 0
    or b->'coverAssetId' = 'null'::jsonb or b->'categoryId' = 'null'::jsonb or b->'rightsConfirmed' <> 'true'::jsonb) then
    raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  if b->'categoryId' <> 'null'::jsonb and not exists (select 1 from public.re_categories where id = (b->>'categoryId')::uuid and is_active) then
    raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  return b;
end;
$$;

create function re_private.re_check_recipe_assets(p_recipe_id uuid, p_owner uuid, p_body jsonb)
returns void language plpgsql set search_path = '' as $$
declare v_id uuid;
begin
  for v_id in select (p_body->>'coverAssetId')::uuid where p_body->>'coverAssetId' is not null
    union select (x->>'imageAssetId')::uuid from jsonb_array_elements(p_body->'steps') x where x->>'imageAssetId' is not null
  loop
    perform 1 from public.re_media_assets where id = v_id and owner_id = p_owner and recipe_id = p_recipe_id
      and purpose = 'recipe' and status = 'ready' for share;
    if not found then raise exception 'ASSET_NOT_READY' using errcode = '22023'; end if;
  end loop;
end;
$$;
revoke all on function re_private.re_require_recipe_author(), re_private.re_consume_recipe_limit(text,text,text,integer),
  re_private.re_recipe_text(jsonb,integer), re_private.re_validate_recipe_body(jsonb,boolean),
  re_private.re_check_recipe_assets(uuid,uuid,jsonb) from public, anon, authenticated;

create function re_private.re_create_recipe_draft(p_body jsonb, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := re_private.re_require_recipe_author(); v_id uuid; v_body jsonb;
begin
  if p_request_id is null then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  perform 1 from re_private.re_accounts where profile_id = v_owner for update;
  select id into v_id from public.re_recipes where author_id = v_owner and creation_request_id = p_request_id;
  if found then return v_id; end if;
  v_body := re_private.re_validate_recipe_body(p_body, false);
  if v_body->>'coverAssetId' is not null or exists (select 1 from jsonb_array_elements(v_body->'steps') x where x->>'imageAssetId' is not null) then
    raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  perform re_private.re_consume_recipe_limit(v_owner::text, 'recipe.create', 'day', 10);
  insert into public.re_recipes(author_id, creation_request_id) values(v_owner,p_request_id) returning id into v_id;
  insert into public.re_recipe_drafts(recipe_id,body) values(v_id,v_body);
  return v_id;
end;
$$;
create function re_private.re_save_recipe_draft(p_recipe_id uuid, p_expected_version integer, p_body jsonb, p_request_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := re_private.re_require_recipe_author(); v_body jsonb; d public.re_recipe_drafts%rowtype;
begin
  if p_request_id is null or p_expected_version is null then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  perform 1 from public.re_recipes where id = p_recipe_id and author_id = v_owner and status in ('draft','published') for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  v_body := re_private.re_validate_recipe_body(p_body, false);
  select * into d from public.re_recipe_drafts where recipe_id = p_recipe_id for update;
  if d.last_save_request_id = p_request_id then
    if d.body <> v_body or d.draft_version <> p_expected_version + 1 then raise exception 'CONFLICT' using errcode = 'P0001'; end if;
    return d.draft_version;
  end if;
  if d.draft_version <> p_expected_version then raise exception 'CONFLICT' using errcode = 'P0001'; end if;
  perform re_private.re_check_recipe_assets(p_recipe_id,v_owner,v_body);
  perform re_private.re_consume_recipe_limit(v_owner::text,'recipe.save','minute',60);
  update public.re_recipe_drafts set body = v_body, draft_version = draft_version + 1,
    last_save_request_id = p_request_id, updated_at = clock_timestamp() where recipe_id = p_recipe_id returning draft_version into d.draft_version;
  update public.re_recipes set updated_at = clock_timestamp() where id = p_recipe_id;
  return d.draft_version;
end;
$$;
create function re_private.re_publish_recipe(p_recipe_id uuid, p_expected_version integer, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := re_private.re_require_recipe_author(); r public.re_recipes%rowtype; d public.re_recipe_drafts%rowtype;
  existing public.re_recipe_versions%rowtype; b jsonb; h jsonb; v_hash text; v_id uuid; v_no integer;
begin
  if p_request_id is null or p_expected_version is null then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  select * into r from public.re_recipes where id = p_recipe_id and author_id = v_owner and status in ('draft','published') for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  select * into existing from public.re_recipe_versions where recipe_id = p_recipe_id and publish_request_id = p_request_id;
  if found then
    if existing.source_draft_version <> p_expected_version then raise exception 'CONFLICT' using errcode = 'P0001'; end if;
    return existing.id;
  end if;
  select * into d from public.re_recipe_drafts where recipe_id = p_recipe_id for update;
  if d.draft_version <> p_expected_version then raise exception 'CONFLICT' using errcode = 'P0001'; end if;
  b := re_private.re_validate_recipe_body(d.body,true);
  perform re_private.re_check_recipe_assets(p_recipe_id,v_owner,b);
  h := (b - 'rightsConfirmed') || jsonb_build_object(
    'ingredients',(select jsonb_agg(x - 'id' order by n) from jsonb_array_elements(b->'ingredients') with ordinality a(x,n)),
    'steps',(select jsonb_agg((x - 'id') || jsonb_build_object('imageAssetId',
      (select ma.sha256 from public.re_media_assets ma where ma.id = (x->>'imageAssetId')::uuid)) order by n)
      from jsonb_array_elements(b->'steps') with ordinality a(x,n)),
    'coverAssetId',(select ma.sha256 from public.re_media_assets ma where ma.id = (b->>'coverAssetId')::uuid),
    'tags',(select coalesce(jsonb_agg(x order by x),'[]'::jsonb) from jsonb_array_elements(b->'tags') x));
  v_hash := encode(sha256(convert_to(h::text,'UTF8')),'hex');
  if exists(select 1 from public.re_recipe_versions where id = r.current_version_id and content_hash = v_hash) then
    raise exception 'NO_CHANGES' using errcode = '22023'; end if;
  perform re_private.re_consume_recipe_limit(v_owner::text,'recipe.publish','day',5);
  select coalesce(max(version_no),0) + 1 into v_no from public.re_recipe_versions where recipe_id = p_recipe_id;
  insert into public.re_recipe_versions(recipe_id,version_no,body,category_id,cover_asset_id,content_hash,source_draft_version,publish_request_id,search_text)
    values(p_recipe_id,v_no,b,(b->>'categoryId')::uuid,(b->>'coverAssetId')::uuid,v_hash,d.draft_version,p_request_id,
      lower(regexp_replace(normalize((b->>'title') || ' ' ||
        (select string_agg(x->>'name',' ') from jsonb_array_elements(b->'ingredients') x),NFKC),'[[:space:]]+','','g')))
    returning id into v_id;
  insert into public.re_recipe_version_assets(version_id,asset_id,slot,position) values(v_id,(b->>'coverAssetId')::uuid,'cover',0);
  insert into public.re_recipe_version_assets(version_id,asset_id,slot,position)
    select v_id,(x->>'imageAssetId')::uuid,'step',(x->>'position')::integer from jsonb_array_elements(b->'steps') x where x->>'imageAssetId' is not null;
  update public.re_recipes set current_version_id = v_id,status = 'published',
    first_published_at = coalesce(first_published_at,clock_timestamp()),updated_at = clock_timestamp() where id = p_recipe_id;
  insert into re_private.re_audit_log(actor_id,action,entity_type,entity_id,safe_metadata)
    values(v_owner,'recipe.published','recipe',p_recipe_id,jsonb_build_object('versionId',v_id,'versionNo',v_no));
  return v_id;
end;
$$;

create function public.re_create_recipe_draft(p_body jsonb,p_request_id uuid) returns uuid language sql security invoker set search_path = '' as $$ select re_private.re_create_recipe_draft(p_body,p_request_id); $$;
create function public.re_save_recipe_draft(p_recipe_id uuid,p_expected_version integer,p_body jsonb,p_request_id uuid) returns integer language sql security invoker set search_path = '' as $$ select re_private.re_save_recipe_draft(p_recipe_id,p_expected_version,p_body,p_request_id); $$;
create function public.re_publish_recipe(p_recipe_id uuid,p_expected_version integer,p_request_id uuid) returns uuid language sql security invoker set search_path = '' as $$ select re_private.re_publish_recipe(p_recipe_id,p_expected_version,p_request_id); $$;
revoke all on function re_private.re_create_recipe_draft(jsonb,uuid), public.re_create_recipe_draft(jsonb,uuid),
  re_private.re_save_recipe_draft(uuid,integer,jsonb,uuid), public.re_save_recipe_draft(uuid,integer,jsonb,uuid),
  re_private.re_publish_recipe(uuid,integer,uuid), public.re_publish_recipe(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function re_private.re_create_recipe_draft(jsonb,uuid), public.re_create_recipe_draft(jsonb,uuid),
  re_private.re_save_recipe_draft(uuid,integer,jsonb,uuid), public.re_save_recipe_draft(uuid,integer,jsonb,uuid),
  re_private.re_publish_recipe(uuid,integer,uuid), public.re_publish_recipe(uuid,integer,uuid) to authenticated;

create view public.re_recipe_cards with (security_invoker = true) as
select r.id as recipe_id, r.author_id, v.search_text, c.slug as category_slug,
  v.difficulty, v.prep_minutes + v.cook_minutes as total_minutes, v.published_at,
  jsonb_build_object('id',r.id,'versionId',v.id,'versionNo',v.version_no,'title',v.title,'summary',v.summary,
    'servings',v.servings,'minutes',v.prep_minutes+v.cook_minutes,'difficulty',v.difficulty,'category',c.name,
    'coverAssetId',v.cover_asset_id,'authorId',r.author_id,'author',p.display_name,'handle',p.handle,'publishedAt',v.published_at) as card
from public.re_recipes r join public.re_recipe_versions v on v.id = r.current_version_id
join public.re_profiles p on p.id = r.author_id join public.re_categories c on c.id = v.category_id
where r.status = 'published' and re_private.re_recipe_is_public(r.id);
revoke all on public.re_recipe_cards from public,anon,authenticated;
grant select on public.re_recipe_cards to anon,authenticated;

create function public.re_search_recipes(p_query text default '', p_category text default '', p_max_minutes integer default 1440,
  p_difficulty text default '', p_page integer default 1, p_author uuid default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with filtered as materialized (
    select * from public.re_recipe_cards c where
      -- strpos treats %, _ and backslash literally; no SQL/ILIKE interpolation.
      strpos(c.search_text,lower(regexp_replace(normalize(left(coalesce(p_query,''),80),NFKC),'[[:space:]]+','','g'))) > 0
      and (coalesce(p_category,'') = '' or c.category_slug = p_category)
      and c.total_minutes <= least(greatest(coalesce(p_max_minutes,1440),1),1440)
      and (coalesce(p_difficulty,'') = '' or c.difficulty = p_difficulty)
      and (p_author is null or c.author_id = p_author)
  ), page_rows as (
    select card,published_at,recipe_id from filtered order by published_at desc,recipe_id
      limit 12 offset ((least(greatest(coalesce(p_page,1),1),100)-1)*12)
  ) select jsonb_build_object('items',coalesce((select jsonb_agg(card order by published_at desc,recipe_id) from page_rows),'[]'::jsonb),
    'total',(select count(*) from filtered));
$$;
create function public.re_get_recipe_detail(p_recipe_id uuid, p_version_id uuid default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('card',jsonb_build_object('id',r.id,'versionId',v.id,'versionNo',v.version_no,
    'title',v.title,'summary',v.summary,'servings',v.servings,'minutes',v.prep_minutes+v.cook_minutes,
    'difficulty',v.difficulty,'category',c.name,'coverAssetId',v.cover_asset_id,
    'authorId',r.author_id,'author',p.display_name,'handle',p.handle,'publishedAt',v.published_at),
    'body',v.body,'currentVersionId',r.current_version_id,
    'versions',(select jsonb_agg(jsonb_build_object('id',h.id,'versionNo',h.version_no,'publishedAt',h.published_at) order by h.version_no desc)
      from public.re_recipe_versions h where h.recipe_id = r.id))
  from public.re_recipes r join public.re_recipe_versions v on v.recipe_id = r.id and v.id = coalesce(p_version_id,r.current_version_id)
  join public.re_profiles p on p.id = r.author_id join public.re_categories c on c.id = v.category_id
  where r.id = p_recipe_id and re_private.re_recipe_is_public(r.id);
$$;
create function public.re_get_recipe_draft(p_recipe_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('recipeId',r.id,'body',d.body,'draftVersion',d.draft_version,
    'updatedAt',d.updated_at,'currentVersionId',r.current_version_id,'status',r.status)
  from public.re_recipes r join public.re_recipe_drafts d on d.recipe_id = r.id
  where r.id = p_recipe_id and r.author_id = (select re_private.re_current_profile_id()) and r.status in ('draft','published');
$$;
create function public.re_get_my_recipes(p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with owned as materialized (
    select r.id,r.status,r.current_version_id,r.updated_at,d.body->>'title' as title,d.draft_version
    from public.re_recipes r join public.re_recipe_drafts d on d.recipe_id = r.id
    where r.author_id = (select re_private.re_current_profile_id()) and r.status in ('draft','published')
  ), page_rows as (
    select * from owned order by updated_at desc,id limit 12 offset ((least(greatest(coalesce(p_page,1),1),100)-1)*12)
  ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p) order by updated_at desc,id) from page_rows p),'[]'::jsonb),
    'total',(select count(*) from owned));
$$;
revoke all on function public.re_search_recipes(text,text,integer,text,integer,uuid),public.re_get_recipe_detail(uuid,uuid),
  public.re_get_recipe_draft(uuid),public.re_get_my_recipes(integer) from public,anon,authenticated;
grant execute on function public.re_search_recipes(text,text,integer,text,integer,uuid),public.re_get_recipe_detail(uuid,uuid) to anon,authenticated;
grant execute on function public.re_get_recipe_draft(uuid),public.re_get_my_recipes(integer) to authenticated;

-- Private bucket; a restrictive policy also defeats unrelated permissive
-- policies on an existing project's storage.objects for this bucket only.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('re_recipe_media','re_recipe_media',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy re_recipe_media_no_direct_access on storage.objects as restrictive for all to anon,authenticated
  using (bucket_id <> 're_recipe_media') with check (bucket_id <> 're_recipe_media');

create function re_private.re_reserve_recipe_upload(p_recipe_id uuid,p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := re_private.re_require_recipe_author(); v_id uuid; v_recipe uuid;
begin
  if p_request_id is null then raise exception 'VALIDATION_ERROR' using errcode = '22023'; end if;
  perform 1 from public.re_recipes where id = p_recipe_id and author_id = v_owner and status in ('draft','published') for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  perform re_private.re_consume_recipe_limit(v_owner::text,'media.sign','hour',60);
  select id,recipe_id into v_id,v_recipe from public.re_media_assets where owner_id = v_owner and upload_request_id = p_request_id;
  if found then
    if v_recipe <> p_recipe_id then raise exception 'CONFLICT' using errcode = 'P0001'; end if;
    return v_id;
  end if;
  if (select count(*) from public.re_media_assets where recipe_id = p_recipe_id) >= 100 then
    raise exception 'ASSET_LIMIT' using errcode = 'P0001'; end if;
  v_id := gen_random_uuid();
  insert into public.re_media_assets(id,owner_id,recipe_id,original_path,upload_request_id)
    values(v_id,v_owner,p_recipe_id,'originals/'||v_owner::text||'/'||v_id::text,p_request_id);
  return v_id;
end;
$$;
create function re_private.re_claim_recipe_upload(p_asset_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := re_private.re_require_recipe_author(); a public.re_media_assets%rowtype; v_token uuid := gen_random_uuid();
begin
  perform re_private.re_consume_recipe_limit(v_owner::text,'media.complete','minute',30);
  select * into a from public.re_media_assets where id = p_asset_id and owner_id = v_owner for update;
  if not found or not exists(select 1 from public.re_recipes where id = a.recipe_id and author_id = v_owner and status in ('draft','published')) then
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
create function public.re_reserve_recipe_upload(p_recipe_id uuid,p_request_id uuid) returns uuid language sql security invoker set search_path = '' as $$ select re_private.re_reserve_recipe_upload(p_recipe_id,p_request_id); $$;
create function public.re_claim_recipe_upload(p_asset_id uuid) returns jsonb language sql security invoker set search_path = '' as $$ select re_private.re_claim_recipe_upload(p_asset_id); $$;
revoke all on function re_private.re_reserve_recipe_upload(uuid,uuid),public.re_reserve_recipe_upload(uuid,uuid),re_private.re_claim_recipe_upload(uuid),public.re_claim_recipe_upload(uuid) from public,anon,authenticated;
grant execute on function re_private.re_reserve_recipe_upload(uuid,uuid),public.re_reserve_recipe_upload(uuid,uuid),re_private.re_claim_recipe_upload(uuid),public.re_claim_recipe_upload(uuid) to authenticated;

-- Only trusted image processor credentials may mark bytes as validated.
-- A fresh lease token fences off a stale processor after timeout/retry.
create function re_private.re_finish_recipe_upload(p_asset_id uuid,p_owner_id uuid,p_token uuid,p_result jsonb)
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
        and r.author_id = p_owner_id and r.status in ('draft','published')) then return false; end if;
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
create function public.re_finish_recipe_upload(p_asset_id uuid,p_owner_id uuid,p_token uuid,p_result jsonb)
returns boolean language sql security invoker set search_path = '' as $$ select re_private.re_finish_recipe_upload(p_asset_id,p_owner_id,p_token,p_result); $$;
revoke all on function re_private.re_finish_recipe_upload(uuid,uuid,uuid,jsonb),public.re_finish_recipe_upload(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant usage on schema re_private to service_role;
grant execute on function re_private.re_finish_recipe_upload(uuid,uuid,uuid,jsonb),public.re_finish_recipe_upload(uuid,uuid,uuid,jsonb) to service_role;
grant select on public.re_media_assets to service_role;
grant update(original_removed_at) on public.re_media_assets to service_role;

create function re_private.re_authorize_media_access(p_asset_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not re_private.re_media_is_readable(p_asset_id) then return false; end if;
  perform re_private.re_consume_recipe_limit('asset:'||p_asset_id::text,'media.read','minute',240);
  return true;
end;
$$;
create function public.re_authorize_media_access(p_asset_id uuid) returns boolean language sql security invoker set search_path = '' as $$ select re_private.re_authorize_media_access(p_asset_id); $$;
revoke all on function re_private.re_authorize_media_access(uuid),public.re_authorize_media_access(uuid) from public,anon,authenticated;
grant execute on function re_private.re_authorize_media_access(uuid),public.re_authorize_media_access(uuid) to anon,authenticated;
