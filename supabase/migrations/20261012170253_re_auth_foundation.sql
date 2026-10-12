-- P1 foundation. Auth IDs remain private; all application writes use narrow RPCs.
-- Fail on a collision rather than adopting another app's schema.
create schema re_private;
revoke all on schema re_private from public, anon, authenticated;
grant usage on schema re_private to authenticated;

alter default privileges in schema re_private revoke all on tables from public, anon, authenticated;
alter default privileges in schema re_private revoke execute on functions from public, anon, authenticated;

create table public.re_profiles (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  display_name text not null default '새 요리사',
  bio text not null default '',
  -- P2 adds the FK when media_assets is introduced. P1 accepts no avatar writes.
  avatar_asset_id uuid check (avatar_asset_id is null),
  visibility_status text not null default 'active' check (visibility_status in ('active', 'deleted')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint re_profiles_handle_format check (handle ~ '^[a-z0-9_]{3,24}$'),
  constraint re_profiles_reserved_handle check (handle not in (
    'admin', 'api', 'auth', 'me', 'settings', 'login', 'signup', 'logout',
    'recipes', 'awards', 'u', 'dev', 'support', 'help', 'system', 'notifications',
    'terms', 'privacy', 'challenges'
  )),
  constraint re_profiles_display_name_length check (char_length(btrim(display_name)) between 2 and 30),
  constraint re_profiles_bio_length check (char_length(bio) <= 300)
);

create table re_private.re_accounts (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id uuid not null unique references public.re_profiles(id),
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'deleting')),
  is_test_account boolean not null default false,
  profile_completed_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);

create table public.re_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z][a-z0-9-]{1,39}$'),
  name text not null check (char_length(name) between 1 and 30),
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table re_private.re_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.re_profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  reason text,
  safe_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_metadata) = 'object'),
  created_at timestamptz not null default clock_timestamp()
);
create index re_audit_log_actor_time on re_private.re_audit_log(actor_id, created_at desc);

create table re_private.re_rate_limit_buckets (
  scope_key text not null,
  operation text not null,
  bucket_start timestamptz not null,
  count integer not null check (count > 0),
  primary key (scope_key, operation, bucket_start)
);
create index re_rate_limit_buckets_time on re_private.re_rate_limit_buckets(bucket_start);

alter table public.re_profiles enable row level security;
alter table public.re_categories enable row level security;
alter table re_private.re_accounts enable row level security;
alter table re_private.re_audit_log enable row level security;
alter table re_private.re_rate_limit_buckets enable row level security;
revoke all on public.re_profiles, public.re_categories from public, anon, authenticated;
revoke all on re_private.re_accounts, re_private.re_audit_log, re_private.re_rate_limit_buckets from public, anon, authenticated;
grant select on public.re_profiles, public.re_categories to anon, authenticated;

create function re_private.re_current_profile_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select a.profile_id from re_private.re_accounts a where a.auth_user_id = (select auth.uid());
$$;

create function re_private.re_is_active_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from re_private.re_accounts a
    join auth.users u on u.id = a.auth_user_id
    join auth.sessions s on s.user_id = u.id and s.id::text = (select auth.jwt()->>'session_id')
    where a.auth_user_id = (select auth.uid()) and a.status = 'active'
      and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)
      and (u.banned_until is null or u.banned_until <= now())
      and (s.not_after is null or s.not_after > now())
  );
$$;

create function re_private.re_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select re_private.re_is_active_member() and exists (
    select 1 from re_private.re_accounts a where a.auth_user_id = (select auth.uid()) and a.role = 'admin'
  );
$$;

-- Exposes a visibility boolean only, never the Auth ID, email, or account status.
create function re_private.re_is_public_profile(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from re_private.re_accounts a join auth.users u on u.id = a.auth_user_id
    where a.profile_id = p_profile_id and a.status = 'active'
      and a.profile_completed_at is not null and u.email_confirmed_at is not null
      and not coalesce(u.is_anonymous, false)
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;

grant usage on schema re_private to anon;
revoke all on function re_private.re_current_profile_id(), re_private.re_is_active_member(), re_private.re_is_admin(), re_private.re_is_public_profile(uuid) from public, anon, authenticated;
grant execute on function re_private.re_current_profile_id(), re_private.re_is_active_member(), re_private.re_is_admin() to authenticated;
grant execute on function re_private.re_is_public_profile(uuid) to anon, authenticated;

create policy re_profiles_public_read on public.re_profiles for select to anon, authenticated
  using (visibility_status = 'active' and re_private.re_is_public_profile(id));
create policy re_profiles_own_read on public.re_profiles for select to authenticated
  using (id = (select re_private.re_current_profile_id()));
create policy re_categories_public_read on public.re_categories for select to anon, authenticated using (is_active);
create policy re_categories_admin_read on public.re_categories for select to authenticated using ((select re_private.re_is_admin()));

-- Shared Auth: no auth.users trigger and no bulk enrollment of other apps' users.
-- Called only after an explicit recipe-app login or signup confirmation.
create function re_private.re_ensure_account()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_profile_id uuid; v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  if not exists(select 1 from auth.users u join auth.sessions s on s.user_id = u.id
    where u.id = v_user_id and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
      and (u.banned_until is null or u.banned_until <= clock_timestamp())
      and s.id::text = (auth.jwt()->>'session_id') and (s.not_after is null or s.not_after > clock_timestamp())) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  -- App-scoped lock serializes first enrollment without locking shared Auth rows.
  perform pg_advisory_xact_lock(hashtextextended('re.account:' || v_user_id::text,0));
  select a.profile_id into v_profile_id from re_private.re_accounts a where a.auth_user_id = v_user_id;
  if found then return v_profile_id; end if;
  v_profile_id := gen_random_uuid();
  insert into public.re_profiles(id,handle)
    values(v_profile_id,'u_' || substr(replace(v_profile_id::text,'-',''),1,22));
  -- Roles never come from user metadata or caller-supplied IDs.
  insert into re_private.re_accounts(auth_user_id,profile_id) values(v_user_id,v_profile_id);
  insert into re_private.re_audit_log(actor_id,action,entity_type,entity_id)
    values(v_profile_id,'account.created','profile',v_profile_id);
  return v_profile_id;
end;
$$;
create function public.re_ensure_account()
returns uuid language sql security invoker set search_path = '' as $$ select re_private.re_ensure_account(); $$;
revoke all on function re_private.re_ensure_account(),public.re_ensure_account() from public,anon,authenticated;
grant execute on function re_private.re_ensure_account(),public.re_ensure_account() to authenticated;

-- Own-account projection. No direct grants on re_private.re_accounts are needed.
create function re_private.re_get_my_account()
returns table (
  profile_id uuid, handle text, display_name text, bio text,
  role text, status text, email_verified boolean, profile_completed boolean
) language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  return query select p.id, p.handle, p.display_name, p.bio, a.role, a.status,
    u.email_confirmed_at is not null, a.profile_completed_at is not null
    from re_private.re_accounts a join public.re_profiles p on p.id = a.profile_id
    join auth.users u on u.id = a.auth_user_id
    where a.auth_user_id = auth.uid()
      and exists (select 1 from auth.sessions s where s.user_id = auth.uid()
        and s.id::text = (auth.jwt()->>'session_id') and (s.not_after is null or s.not_after > now()));
end;
$$;
create function public.re_get_my_account()
returns table (
  profile_id uuid, handle text, display_name text, bio text,
  role text, status text, email_verified boolean, profile_completed boolean
) language sql stable security invoker set search_path = '' as $$ select * from re_private.re_get_my_account(); $$;
revoke all on function re_private.re_get_my_account(), public.re_get_my_account() from public, anon, authenticated;
grant execute on function re_private.re_get_my_account(), public.re_get_my_account() to authenticated;

create function re_private.re_consume_profile_rate_limit()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  -- Bounded cleanup for this caller; no global scans during a member request.
  delete from re_private.re_rate_limit_buckets where scope_key = auth.uid()::text
    and operation = 'profile.update' and bucket_start < v_now - interval '1 hour';
  insert into re_private.re_rate_limit_buckets as b(scope_key, operation, bucket_start, count)
    values (auth.uid()::text, 'profile.update', date_trunc('minute', v_now), 1)
    on conflict (scope_key, operation, bucket_start) do update set count = b.count + 1
    returning count into v_count;
  if v_count > 5 then raise exception 'RATE_LIMITED' using errcode = 'P0001'; end if;
end;
$$;
revoke all on function re_private.re_consume_profile_rate_limit() from public, anon, authenticated;

create function re_private.re_update_profile(p_handle text, p_display_name text, p_bio text)
returns public.re_profiles language plpgsql security definer set search_path = '' as $$
declare
  v_account re_private.re_accounts%rowtype;
  v_profile public.re_profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  select * into v_account from re_private.re_accounts where auth_user_id = auth.uid() for update;
  if not found or not re_private.re_is_active_member() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into v_profile from public.re_profiles where id = v_account.profile_id for update;
  if v_profile.visibility_status <> 'active' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_handle is null or p_handle !~ '^[a-z0-9_]{3,24}$'
    or p_display_name is null or char_length(btrim(p_display_name)) not between 2 and 30
    or p_bio is null or char_length(p_bio) > 300 then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;
  if v_account.profile_completed_at is not null and p_handle <> v_profile.handle then
    raise exception 'HANDLE_LOCKED' using errcode = '22023';
  end if;
  perform re_private.re_consume_profile_rate_limit();
  update public.re_profiles set handle = p_handle, display_name = btrim(p_display_name), bio = btrim(p_bio),
    updated_at = clock_timestamp() where id = v_account.profile_id returning * into v_profile;
  update re_private.re_accounts set profile_completed_at = coalesce(profile_completed_at, clock_timestamp())
    where auth_user_id = auth.uid();
  insert into re_private.re_audit_log(actor_id, action, entity_type, entity_id)
    values (v_account.profile_id, 'profile.updated', 'profile', v_account.profile_id);
  return v_profile;
end;
$$;
create function public.re_update_profile(p_handle text, p_display_name text, p_bio text)
returns public.re_profiles language sql security invoker set search_path = '' as $$
  select re_private.re_update_profile(p_handle, p_display_name, p_bio);
$$;
revoke all on function re_private.re_update_profile(text, text, text), public.re_update_profile(text, text, text) from public, anon, authenticated;
grant execute on function re_private.re_update_profile(text, text, text), public.re_update_profile(text, text, text) to authenticated;

create function public.re_check_admin_access()
returns boolean language sql stable security invoker set search_path = '' as $$ select re_private.re_is_admin(); $$;
revoke all on function public.re_check_admin_access() from public, anon, authenticated;
grant execute on function public.re_check_admin_access() to authenticated;

-- Product taxonomy, not demo users or content.
insert into public.re_categories(slug, name, sort_order) values
  ('rice', '밥/덮밥', 1), ('noodles', '면', 2), ('soup', '국/찌개', 3),
  ('side-dish', '반찬', 4), ('meat-fish', '고기/생선', 5), ('salad', '샐러드', 6),
  ('dessert', '간식/디저트', 7), ('drink', '음료', 8), ('other', '기타', 9);
