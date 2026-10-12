-- New accounts skip the email-confirmation screen without changing shared Auth
-- settings. Authorization still requires a real, active Supabase session.
create or replace function re_private.re_ensure_account()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_profile_id uuid;
  v_user_id uuid := auth.uid();
  v_name text;
begin
  if v_user_id is null then raise exception 'UNAUTHENTICATED' using errcode = '42501'; end if;
  select btrim(u.raw_user_meta_data->>'display_name') into v_name
  from auth.users u
  where u.id = v_user_id and u.email_confirmed_at is not null
    and not coalesce(u.is_anonymous,false)
    and (u.banned_until is null or u.banned_until <= clock_timestamp())
    and exists(select 1 from auth.sessions s where s.user_id = u.id
      and s.id::text = (auth.jwt()->>'session_id')
      and (s.not_after is null or s.not_after > clock_timestamp()));
  if not found then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  -- Metadata is used for presentation only; it cannot set roles or status.
  if v_name is null or char_length(v_name) not between 2 and 30 then v_name := '새 요리사'; end if;
  perform pg_advisory_xact_lock(hashtextextended('re.account:' || v_user_id::text,0));
  select a.profile_id into v_profile_id from re_private.re_accounts a
    where a.auth_user_id = v_user_id for update;
  if found then
    -- Resume only this caller's incomplete onboarding; preserve their name/role.
    update re_private.re_accounts set profile_completed_at = clock_timestamp()
      where auth_user_id = v_user_id and profile_completed_at is null and status = 'active';
    return v_profile_id;
  end if;
  v_profile_id := gen_random_uuid();
  insert into public.re_profiles(id,handle,display_name)
    values(v_profile_id,'u_' || substr(replace(v_profile_id::text,'-',''),1,22),v_name);
  insert into re_private.re_accounts(auth_user_id,profile_id,profile_completed_at)
    values(v_user_id,v_profile_id,clock_timestamp());
  insert into re_private.re_audit_log(actor_id,action,entity_type,entity_id)
    values(v_profile_id,'account.created','profile',v_profile_id);
  return v_profile_id;
end;
$$;

-- The signup server alone may consume these fixed quotas. No plaintext email
-- is stored; the server supplies a keyed hash. A global cap bounds random emails.
create function re_private.re_consume_signup_limit(p_email_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_global integer;
  v_email integer;
begin
  if p_email_hash is null or p_email_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'VALIDATION_ERROR' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('re.signup.limit',0));
  delete from re_private.re_rate_limit_buckets
    where operation = 'auth.signup' and bucket_start < v_now - interval '2 days';
  insert into re_private.re_rate_limit_buckets as b(scope_key,operation,bucket_start,count)
    values('re.signup.global','auth.signup',date_trunc('hour',v_now,'UTC'),1)
    on conflict(scope_key,operation,bucket_start) do update set count = least(b.count + 1,31)
    returning count into v_global;
  if v_global > 30 then return false; end if;
  insert into re_private.re_rate_limit_buckets as b(scope_key,operation,bucket_start,count)
    values('re.signup.email:'||p_email_hash,'auth.signup',date_trunc('hour',v_now,'UTC'),1)
    on conflict(scope_key,operation,bucket_start) do update set count = least(b.count + 1,4)
    returning count into v_email;
  return v_email <= 3;
end;
$$;
create function public.re_consume_signup_limit(p_email_hash text)
returns boolean language sql security invoker set search_path = '' as $$
  select re_private.re_consume_signup_limit(p_email_hash);
$$;
revoke all on function re_private.re_consume_signup_limit(text),public.re_consume_signup_limit(text)
  from public,anon,authenticated;
grant usage on schema re_private to service_role;
grant execute on function re_private.re_consume_signup_limit(text),public.re_consume_signup_limit(text) to service_role;
