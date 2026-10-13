-- P4. All writes take the period lock before account/recipe/review locks.
-- No shared Auth settings, global triggers, default public privileges or other apps are changed.
create table public.re_award_periods (
  id uuid constraint re_award_periods_pk primary key default gen_random_uuid(),
  slug text not null constraint re_award_periods_slug_uq unique constraint re_award_periods_slug_check check(slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'),
  kind text not null default 'monthly' constraint re_award_periods_kind_check check(kind = 'monthly'),
  month_key date not null constraint re_award_periods_month_check check(extract(day from month_key) = 1),
  title text not null constraint re_award_periods_title_check check(char_length(btrim(title)) between 2 and 80),
  theme text not null constraint re_award_periods_theme_check check(char_length(btrim(theme)) between 2 and 1000),
  submission_opens_at timestamptz not null, submission_closes_at timestamptz not null,
  voting_opens_at timestamptz not null, voting_closes_at timestamptz not null, finalize_not_before timestamptz not null,
  state text not null default 'draft' constraint re_award_periods_state_check check(state in ('draft','published','finalized','cancelled')),
  rules jsonb not null constraint re_award_periods_rules_check check(rules = '{"version":"monthly-v1","minReviews":5,"priorMean":3.5,"priorWeight":5,"minAccountHours":24,"tieBreakers":["adjustedScore","reviewCount","fiveStarCount"]}'::jsonb), source_revision bigint not null default 0 constraint re_award_periods_revision_check check(source_revision >= 0),
  final_run_id uuid, created_by uuid not null references public.re_profiles(id),
  created_at timestamptz not null default clock_timestamp(),
  constraint re_award_periods_schedule_check check(submission_opens_at < submission_closes_at and submission_closes_at = voting_opens_at and voting_opens_at < voting_closes_at and voting_closes_at < finalize_not_before),
  constraint re_award_periods_final_check check((state = 'finalized') = (final_run_id is not null))
);
create unique index re_award_periods_active_month on public.re_award_periods(month_key) where state <> 'cancelled';
create index re_award_periods_creator on public.re_award_periods(created_by);
create table public.re_award_entries (
  id uuid constraint re_award_entries_pk primary key default gen_random_uuid(),
  period_id uuid not null references public.re_award_periods(id), recipe_id uuid not null references public.re_recipes(id),
  recipe_version_id uuid not null, author_id uuid not null references public.re_profiles(id),
  status text not null default 'submitted' constraint re_award_entries_status_check check(status in ('submitted','withdrawn','disqualified')),
  submitted_at timestamptz not null default clock_timestamp(),
  constraint re_award_entries_version_fk foreign key(recipe_id,recipe_version_id) references public.re_recipe_versions(recipe_id,id),
  constraint re_award_entries_author_uq unique(period_id,author_id), constraint re_award_entries_recipe_uq unique(period_id,recipe_id),
  constraint re_award_entries_period_id_uq unique(period_id,id)
);
create index re_award_entries_version on public.re_award_entries(recipe_version_id);
create index re_award_entries_author on public.re_award_entries(author_id);
create index re_award_entries_recipe on public.re_award_entries(recipe_id);
create table public.re_award_evaluations (
  id uuid constraint re_award_evaluations_pk primary key default gen_random_uuid(),
  period_id uuid not null, entry_id uuid not null, reviewer_id uuid not null references public.re_profiles(id),
  review_id uuid not null references public.re_cook_reviews(id),
  rating_snapshot integer not null constraint re_award_evaluations_rating_check check(rating_snapshot between 1 and 5),
  eligibility text not null constraint re_award_evaluations_eligibility_check check(eligibility in ('included','withdrawn','excluded')),
  evaluated_at timestamptz not null, updated_at timestamptz not null default clock_timestamp(),
  constraint re_award_evaluations_entry_fk foreign key(period_id,entry_id) references public.re_award_entries(period_id,id),
  constraint re_award_evaluations_reviewer_uq unique(entry_id,reviewer_id), constraint re_award_evaluations_review_uq unique(period_id,review_id)
);
create index re_award_evaluations_reviewer on public.re_award_evaluations(reviewer_id);
create index re_award_evaluations_review on public.re_award_evaluations(review_id);
create table public.re_award_runs (
  id uuid constraint re_award_runs_pk primary key default gen_random_uuid(), period_id uuid not null references public.re_award_periods(id),
  source_revision bigint not null, input_hash text not null, result_hash text not null default '', rules_snapshot jsonb not null,
  status text not null default 'prepared' constraint re_award_runs_status_check check(status in ('prepared','finalized')),
  prepared_at timestamptz not null default clock_timestamp(), finalized_at timestamptz, idempotency_key uuid not null,
  constraint re_award_runs_request_uq unique(period_id,idempotency_key), constraint re_award_runs_period_id_uq unique(period_id,id)
);
create unique index re_award_runs_final on public.re_award_runs(period_id) where status = 'finalized';
alter table public.re_award_periods add constraint re_award_periods_run_fk foreign key(id,final_run_id) references public.re_award_runs(period_id,id);
-- One canonical manifest per run: IDs, eligibility reasons and rating numbers only.
create table re_private.re_award_run_inputs (
  run_id uuid constraint re_award_run_inputs_pk primary key references public.re_award_runs(id), manifest jsonb not null
);
create table public.re_award_results (
  run_id uuid not null references public.re_award_runs(id), entry_id uuid not null references public.re_award_entries(id),
  recipe_id uuid not null references public.re_recipes(id), recipe_version_id uuid not null, author_id uuid not null references public.re_profiles(id),
  rank integer not null constraint re_award_results_rank_check check(rank > 0), medal text constraint re_award_results_medal_check check(medal in ('gold','silver','bronze')),
  review_count integer not null, rating_sum integer not null, five_star_count integer not null, raw_average numeric not null, adjusted_score numeric not null,
  visibility text not null default 'visible' constraint re_award_results_visibility_check check(visibility in ('visible','content_removed','revoked')),
  constraint re_award_results_stats_check check(review_count >= 5 and rating_sum between review_count and review_count * 5 and five_star_count between 0 and review_count and raw_average between 1 and 5 and adjusted_score between 1 and 5),
  constraint re_award_results_rank_medal_check check(medal is not distinct from (case rank when 1 then 'gold' when 2 then 'silver' when 3 then 'bronze' end)),
  constraint re_award_results_pk primary key(run_id,entry_id),
  constraint re_award_results_version_fk foreign key(recipe_id,recipe_version_id) references public.re_recipe_versions(recipe_id,id)
);
create index re_award_results_recipe on public.re_award_results(recipe_id);
create index re_award_results_author on public.re_award_results(author_id);
create index re_award_results_entry on public.re_award_results(entry_id);
alter table public.re_award_periods enable row level security;
alter table public.re_award_entries enable row level security;
alter table public.re_award_evaluations enable row level security;
alter table public.re_award_runs enable row level security;
alter table public.re_award_results enable row level security;
alter table re_private.re_award_run_inputs enable row level security;
-- Deliberately no direct table grants: checked projections below are the read API.
revoke all on public.re_award_periods,public.re_award_entries,public.re_award_evaluations,public.re_award_runs,public.re_award_results,re_private.re_award_run_inputs from public,anon,authenticated;
alter table public.re_notifications drop constraint re_notifications_type_check;
alter table public.re_notifications add constraint re_notifications_type_check check(type in ('review','reply','award'));

create function re_private.re_award_member(p_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select re_private.re_is_public_profile(p_id) and exists(select 1 from re_private.re_accounts where profile_id = p_id and role = 'member' and not is_test_account and status = 'active');
$$;
create function re_private.re_award_phase(p public.re_award_periods) returns text language sql volatile set search_path = '' as $$
  select case when p.state <> 'published' then p.state when clock_timestamp() < p.submission_opens_at then 'upcoming'
    when clock_timestamp() < p.submission_closes_at then 'submission' when clock_timestamp() < p.voting_closes_at then 'voting' else 'review' end;
$$;
create function re_private.re_award_period_json(p public.re_award_periods) returns jsonb language sql volatile set search_path = '' as $$
  select jsonb_build_object('id',p.id,'slug',p.slug,'title',p.title,'theme',p.theme,'month',p.month_key,'state',p.state,'phase',re_private.re_award_phase(p),
    'submissionOpensAt',p.submission_opens_at,'submissionClosesAt',p.submission_closes_at,'votingOpensAt',p.voting_opens_at,'votingClosesAt',p.voting_closes_at,
    'finalizeNotBefore',p.finalize_not_before,'rules',p.rules,'revision',p.source_revision,'finalRunId',p.final_run_id);
$$;
create function re_private.re_award_entry_json(e public.re_award_entries) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',e.id,'periodId',e.period_id,'status',e.status,'recipeId',e.recipe_id,'versionId',e.recipe_version_id,
    'versionNo',v.version_no,'title',v.title,'coverAssetId',v.cover_asset_id,'author',p.display_name,'handle',p.handle,'authorId',e.author_id)
  from public.re_recipe_versions v join public.re_profiles p on p.id = e.author_id where v.id = e.recipe_version_id
    and re_private.re_recipe_is_public(e.recipe_id);
$$;
-- All mutable eligibility is included, so prepare/finalize also detects out-of-band
-- account/visibility changes. P5 moderation must acquire period locks before writes.
create function re_private.re_award_manifest(p_period uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('entryId',e.id,'recipeId',e.recipe_id,'versionId',e.recipe_version_id,'authorId',e.author_id,
    'reason',case when e.status <> 'submitted' then e.status when not re_private.re_recipe_is_public(e.recipe_id) or exists(select 1 from public.re_recipe_version_assets va join public.re_media_assets ma on ma.id = va.asset_id where va.version_id = e.recipe_version_id and ma.status <> 'ready') then 'content_unavailable'
      when not re_private.re_award_member(e.author_id) then 'author_ineligible' else 'included' end,
    'evaluations',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'reviewId',a.review_id,'reviewerId',a.reviewer_id,'rating',a.rating_snapshot,
      'reason',case when a.eligibility <> 'included' then a.eligibility when not re_private.re_award_member(a.reviewer_id) then 'reviewer_ineligible'
        when not re_private.re_review_is_public(a.review_id) then 'review_unavailable'
        when (select count(*) from public.re_review_assets ra join public.re_media_assets ma on ma.id = ra.asset_id and ma.status = 'ready' where ra.review_id = a.review_id) not between 1 and 3 then 'photo_unavailable'
        else 'included' end) order by a.id),'[]'::jsonb) from public.re_award_evaluations a where a.entry_id = e.id)) order by e.id),'[]'::jsonb)
  from public.re_award_entries e where e.period_id = p_period;
$$;
create function re_private.re_award_hash(p jsonb) returns text language sql immutable set search_path = '' as $$ select encode(sha256(convert_to(p::text,'UTF8')),'hex'); $$;
create function re_private.re_award_result_hash(p_run uuid) returns text language sql stable security definer set search_path = '' as $$
  select re_private.re_award_hash(coalesce(jsonb_agg(to_jsonb(r) order by r.entry_id),'[]'::jsonb)) from public.re_award_results r where r.run_id = p_run;
$$;

-- Called only from the review mutation, after sorted period locks and all photo validation.
create function re_private.re_sync_award_review(p_review uuid,p_new boolean,p_at timestamptz) returns void language plpgsql security definer set search_path = '' as $$
declare r public.re_cook_reviews%rowtype; p public.re_award_periods%rowtype; e public.re_award_entries%rowtype; changed integer;
begin
  select * into r from public.re_cook_reviews where id = p_review;
  for e in select * from public.re_award_entries where recipe_version_id = r.recipe_version_id order by period_id loop
    select * into p from public.re_award_periods where id = e.period_id;
    if p.state <> 'published' then continue; end if;
    changed := 0;
    if p_new and e.status = 'submitted' and r.status = 'published' and r.created_at >= p.voting_opens_at and r.created_at < p.voting_closes_at
      and re_private.re_award_member(r.author_id) and re_private.re_award_member(e.author_id) and r.author_id <> e.author_id
      and exists(select 1 from re_private.re_accounts where profile_id = r.author_id and created_at <= r.created_at - interval '24 hours') then
      insert into public.re_award_evaluations(period_id,entry_id,reviewer_id,review_id,rating_snapshot,eligibility,evaluated_at,updated_at)
        values(p.id,e.id,r.author_id,r.id,r.rating,'included',r.created_at,p_at) on conflict do nothing;
      get diagnostics changed = row_count;
    elsif not p_new then
      if r.status <> 'published' then
        update public.re_award_evaluations set eligibility = 'withdrawn',updated_at = p_at where review_id = r.id and period_id = p.id and eligibility = 'included';
        get diagnostics changed = row_count;
      elsif p_at < p.voting_closes_at and re_private.re_award_member(r.author_id) then
        update public.re_award_evaluations set rating_snapshot = r.rating,eligibility = 'included',updated_at = p_at
          where review_id = r.id and period_id = p.id and eligibility <> 'excluded' and (rating_snapshot <> r.rating or eligibility <> 'included');
        get diagnostics changed = row_count;
      end if;
    end if;
    if changed > 0 then update public.re_award_periods set source_revision = source_revision + 1 where id = p.id; end if;
  end loop;
end;
$$;

create or replace function re_private.re_mutate_cook_review(p_version_id uuid,p_expected_revision integer,p_rating integer,p_body text,
  p_asset_ids uuid[],p_request_id uuid,p_delete boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid; recipe public.re_recipes%rowtype;
  review public.re_cook_reviews%rowtype; digest text; asset_count integer; was_new boolean; mutation_at timestamptz;
begin
  perform 1 from public.re_award_periods where state = 'published' order by id for update;
  actor := re_private.re_require_recipe_author();
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
  was_new := review.id is null;
  if p_delete then
    if review.id is null then raise exception 'NOT_FOUND'; end if;
    perform re_private.re_consume_recipe_limit(actor::text,'review.edit','minute',30);
    mutation_at := clock_timestamp();
    update public.re_cook_reviews set status = 'deleted',body = '',rating = null,revision = revision + 1,
      last_request_id = p_request_id,last_request_hash = digest,updated_at = mutation_at where id = review.id returning * into review;
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
      mutation_at := clock_timestamp();
      insert into public.re_cook_reviews(recipe_id,recipe_version_id,author_id,rating,body,last_request_id,last_request_hash,created_at,updated_at)
        values(recipe.id,p_version_id,actor,p_rating,btrim(p_body),p_request_id,digest,mutation_at,mutation_at) returning * into review;
      insert into public.re_notifications(recipient_id,actor_id,type,entity_id,event_key)
        values(recipe.author_id,actor,'review',review.id,'review:'||review.id::text||':created') on conflict(recipient_id,event_key) do nothing;
    else
      perform re_private.re_consume_recipe_limit(actor::text,'review.edit','minute',30);
      mutation_at := clock_timestamp();
      update public.re_cook_reviews set rating = p_rating,body = btrim(p_body),status = 'published',revision = revision + 1,
        last_request_id = p_request_id,last_request_hash = digest,updated_at = mutation_at where id = review.id returning * into review;
    end if;
    delete from public.re_review_assets where review_id = review.id;
    insert into public.re_review_assets(review_id,asset_id,position) select review.id,x.id,x.pos::integer from unnest(p_asset_ids) with ordinality x(id,pos);
  end if;
  perform re_private.re_sync_award_review(review.id,was_new,mutation_at);
  return jsonb_build_object('id',review.id,'revision',review.revision);
end;
$$;

-- One fixed command API. Never execute a client-provided function or SQL string.
create function re_private.re_award_command(p_input jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare op text := p_input->>'operation'; actor uuid; at_time timestamptz; p public.re_award_periods%rowtype;
  e public.re_award_entries%rowtype; r public.re_recipes%rowtype; run public.re_award_runs%rowtype; evaluation public.re_award_evaluations%rowtype;
  request uuid := (p_input->>'requestId')::uuid; month_start date; manifest jsonb; reason text := btrim(p_input->>'reason');
  fixed_rules constant jsonb := '{"version":"monthly-v1","minReviews":5,"priorMean":3.5,"priorWeight":5,"minAccountHours":24,"tieBreakers":["adjustedScore","reviewCount","fiveStarCount"]}'::jsonb;
begin
  if p_input is null or jsonb_typeof(p_input) <> 'object' or op is null or op not in ('create','publish','cancel','enter','withdraw','restore','entryStatus','evaluationStatus','prepare','finalize','revoke') or request is null then raise exception 'VALIDATION_ERROR'; end if;
  if op = 'create' then
    actor := re_private.re_require_recipe_author();
    if not re_private.re_is_admin() then raise exception 'FORBIDDEN'; end if;
    perform re_private.re_consume_recipe_limit(actor::text,'award.create','day',12);
    month_start := (p_input->>'month')::date;
    if month_start is null or extract(day from month_start) <> 1 or month_start < (clock_timestamp() at time zone 'Asia/Seoul')::date
      or p_input->>'title' is null or p_input->>'theme' is null or char_length(btrim(p_input->>'title')) not between 2 and 80 or char_length(btrim(p_input->>'theme')) not between 2 and 1000
      or not coalesce((p_input->>'slug') ~ '^[a-z0-9][a-z0-9-]{2,59}$',false) then raise exception 'VALIDATION_ERROR'; end if;
    select * into p from public.re_award_periods where id = request;
    if found then
      if p.month_key <> month_start or p.title <> btrim(p_input->>'title') or p.theme <> btrim(p_input->>'theme') or p.slug <> p_input->>'slug' then raise exception 'CONFLICT'; end if;
      return jsonb_build_object('id',p.id);
    end if;
    insert into public.re_award_periods(id,slug,month_key,title,theme,submission_opens_at,submission_closes_at,voting_opens_at,voting_closes_at,finalize_not_before,rules,created_by)
      values(request,p_input->>'slug',month_start,btrim(p_input->>'title'),btrim(p_input->>'theme'),month_start::timestamp at time zone 'Asia/Seoul',
        (month_start + 20)::timestamp at time zone 'Asia/Seoul',(month_start + 20)::timestamp at time zone 'Asia/Seoul',
        (month_start + interval '1 month') at time zone 'Asia/Seoul',(month_start + interval '1 month 3 days') at time zone 'Asia/Seoul',fixed_rules,actor) returning * into p;
  else
    select * into p from public.re_award_periods where id = (p_input->>'periodId')::uuid for update;
    if not found then raise exception 'NOT_FOUND'; end if;
    actor := re_private.re_require_recipe_author();
    at_time := clock_timestamp();
    if op in ('enter','withdraw','restore') then
      if not re_private.re_award_member(actor) or p.state <> 'published' then raise exception 'FORBIDDEN'; end if;
      select * into e from public.re_award_entries where period_id = p.id and author_id = actor;
      if op = 'withdraw' then
        if e.id is null then raise exception 'NOT_FOUND'; end if;
        if e.status = 'disqualified' then raise exception 'FORBIDDEN'; end if;
        if e.status = 'withdrawn' then return jsonb_build_object('id',e.id); end if;
        update public.re_award_entries set status = 'withdrawn' where id = e.id;
      else
        if at_time < p.submission_opens_at or at_time >= p.submission_closes_at then raise exception 'WINDOW_CLOSED'; end if;
        if p_input->>'versionId' is null or not coalesce((p_input->>'agreed')::boolean,false) then raise exception 'VALIDATION_ERROR'; end if;
        if e.id is not null then
          if e.recipe_version_id <> (p_input->>'versionId')::uuid or e.status = 'disqualified' then raise exception 'CONFLICT'; end if;
          if e.status = 'submitted' then return jsonb_build_object('id',e.id); end if;
          select * into r from public.re_recipes where id = e.recipe_id for update;
          if not re_private.re_recipe_is_public(r.id) then raise exception 'FORBIDDEN'; end if;
          perform re_private.re_check_recipe_assets(r.id,actor,v.body) from public.re_recipe_versions v where v.id = e.recipe_version_id;
          if clock_timestamp() >= p.submission_closes_at then raise exception 'WINDOW_CLOSED'; end if;
          update public.re_award_entries set status = 'submitted' where id = e.id;
        else
          if op <> 'enter' then raise exception 'NOT_FOUND'; end if;
          select r0.* into r from public.re_recipes r0 where r0.current_version_id = (p_input->>'versionId')::uuid for update;
          if not found or r.author_id <> actor or not re_private.re_recipe_is_public(r.id) or r.first_published_at < p.submission_opens_at or r.first_published_at >= p.submission_closes_at then raise exception 'FORBIDDEN'; end if;
          perform re_private.re_validate_recipe_body(v.body,true) from public.re_recipe_versions v where v.id = r.current_version_id;
          perform re_private.re_check_recipe_assets(r.id,actor,v.body) from public.re_recipe_versions v where v.id = r.current_version_id;
          -- Check time again after waiting for the recipe lock.
          if clock_timestamp() >= p.submission_closes_at then raise exception 'WINDOW_CLOSED'; end if;
          insert into public.re_award_entries(period_id,recipe_id,recipe_version_id,author_id) values(p.id,r.id,r.current_version_id,actor) returning * into e;
        end if;
      end if;
      update public.re_award_periods set source_revision = source_revision + 1 where id = p.id;
      insert into re_private.re_audit_log(actor_id,action,entity_type,entity_id,safe_metadata)
        values(actor,'award.'||op,'award_entry',e.id,jsonb_build_object('periodId',p.id,'versionId',e.recipe_version_id));
      return jsonb_build_object('id',e.id);
    end if;
    if not re_private.re_is_admin() then raise exception 'FORBIDDEN'; end if;
    perform re_private.re_consume_recipe_limit(actor::text,'award.admin','minute',30);
    at_time := clock_timestamp();
    if op in ('cancel','entryStatus','evaluationStatus','revoke') and (reason is null or char_length(reason) not between 10 and 1000) then raise exception 'VALIDATION_ERROR'; end if;
    if op = 'publish' then
      if p.state = 'published' then return jsonb_build_object('id',p.id); end if;
      if p.state <> 'draft' or at_time >= p.submission_opens_at then raise exception 'WINDOW_CLOSED'; end if;
      update public.re_award_periods set state = 'published',source_revision = source_revision + 1 where id = p.id;
    elsif op = 'cancel' then
      if p.state = 'cancelled' then return jsonb_build_object('id',p.id); end if;
      if p.state = 'finalized' then raise exception 'FORBIDDEN'; end if;
      update public.re_award_periods set state = 'cancelled',source_revision = source_revision + 1 where id = p.id;
    elsif op = 'entryStatus' then
      if p.state <> 'published' or p_input->>'status' is null or p_input->>'status' not in ('submitted','disqualified') then raise exception 'FORBIDDEN'; end if;
      select * into e from public.re_award_entries where id = (p_input->>'entryId')::uuid and period_id = p.id;
      if not found then raise exception 'NOT_FOUND'; end if;
      -- Admin restoration reverses disqualification, never an author's withdrawal.
      if p_input->>'status' = 'submitted' and (e.status = 'withdrawn' or not re_private.re_recipe_is_public(e.recipe_id) or not re_private.re_award_member(e.author_id)) then raise exception 'FORBIDDEN'; end if;
      if e.status = p_input->>'status' then return jsonb_build_object('id',e.id); end if;
      update public.re_award_entries set status = p_input->>'status' where id = e.id;
      update public.re_award_periods set source_revision = source_revision + 1 where id = p.id;
    elsif op = 'evaluationStatus' then
      if p.state <> 'published' or p_input->>'status' is null or p_input->>'status' not in ('included','excluded') then raise exception 'FORBIDDEN'; end if;
      select * into evaluation from public.re_award_evaluations where id = (p_input->>'evaluationId')::uuid and period_id = p.id;
      if not found then raise exception 'NOT_FOUND'; end if;
      if p_input->>'status' = 'included' and (not re_private.re_award_member(evaluation.reviewer_id) or not re_private.re_review_is_public(evaluation.review_id)
        or (select count(*) from public.re_review_assets ra join public.re_media_assets a on a.id = ra.asset_id and a.status = 'ready' where ra.review_id = evaluation.review_id) not between 1 and 3) then raise exception 'FORBIDDEN'; end if;
      if evaluation.eligibility = p_input->>'status' then return jsonb_build_object('id',evaluation.id); end if;
      -- Never change the frozen rating during an administrative restoration.
      update public.re_award_evaluations set eligibility = p_input->>'status',updated_at = at_time where id = evaluation.id;
      update public.re_award_periods set source_revision = source_revision + 1 where id = p.id;
    elsif op = 'prepare' then
      select * into run from public.re_award_runs where period_id = p.id and idempotency_key = request;
      if found then return jsonb_build_object('id',run.id); end if;
      if p.state <> 'published' or at_time < p.voting_closes_at then raise exception 'WINDOW_CLOSED'; end if;
      manifest := re_private.re_award_manifest(p.id);
      insert into public.re_award_runs(period_id,source_revision,input_hash,rules_snapshot,idempotency_key)
        values(p.id,p.source_revision,re_private.re_award_hash(jsonb_build_array(p.rules,manifest)),p.rules,request) returning * into run;
      insert into re_private.re_award_run_inputs(run_id,manifest) values(run.id,manifest);
      with candidates as (
        select x->>'entryId' entry_id,x->>'recipeId' recipe_id,x->>'versionId' version_id,x->>'authorId' author_id,
          count(*)::integer n,sum((v->>'rating')::integer)::integer total,count(*) filter(where (v->>'rating')::integer = 5)::integer fives
        from jsonb_array_elements(manifest) x cross join lateral jsonb_array_elements(x->'evaluations') v
        where x->>'reason' = 'included' and v->>'reason' = 'included' group by x->>'entryId',x->>'recipeId',x->>'versionId',x->>'authorId'
        having count(*) >= (p.rules->>'minReviews')::integer
      ), scored as (select *, (total::numeric + (p.rules->>'priorMean')::numeric * (p.rules->>'priorWeight')::numeric)/(n + (p.rules->>'priorWeight')::numeric) score from candidates),
      ranked as (select *,rank() over(order by score desc,n desc,fives desc)::integer place from scored)
      insert into public.re_award_results(run_id,entry_id,recipe_id,recipe_version_id,author_id,rank,medal,review_count,rating_sum,five_star_count,raw_average,adjusted_score)
        select run.id,entry_id::uuid,recipe_id::uuid,version_id::uuid,author_id::uuid,place,
          case place when 1 then 'gold' when 2 then 'silver' when 3 then 'bronze' end,n,total,fives,total::numeric/n,score from ranked;
      update public.re_award_runs set result_hash = re_private.re_award_result_hash(run.id) where id = run.id;
    elsif op = 'finalize' then
      select * into run from public.re_award_runs where id = (p_input->>'runId')::uuid and period_id = p.id;
      if not found then raise exception 'NOT_FOUND'; end if;
      if p.state = 'finalized' and p.final_run_id = run.id then return jsonb_build_object('id',run.id); end if;
      if p.state <> 'published' or at_time < p.finalize_not_before then raise exception 'WINDOW_CLOSED'; end if;
      select i.manifest into manifest from re_private.re_award_run_inputs i where i.run_id = run.id;
      if run.status <> 'prepared' or run.source_revision <> p.source_revision or run.rules_snapshot <> p.rules or manifest is null
        or run.input_hash <> re_private.re_award_hash(jsonb_build_array(p.rules,manifest))
        or run.input_hash <> re_private.re_award_hash(jsonb_build_array(p.rules,re_private.re_award_manifest(p.id)))
        or run.result_hash <> re_private.re_award_result_hash(run.id) then raise exception 'CONFLICT'; end if;
      update public.re_award_runs set status = 'finalized',finalized_at = at_time where id = run.id;
      update public.re_award_periods set state = 'finalized',final_run_id = run.id where id = p.id;
      insert into public.re_notifications(recipient_id,actor_id,type,entity_id,event_key)
        select author_id,actor,'award',p.id,'award:'||p.id::text||':final' from public.re_award_results where run_id = run.id and medal is not null and author_id <> actor
        on conflict(recipient_id,event_key) do nothing;
    elsif op = 'revoke' then
      if p.state <> 'finalized' then raise exception 'FORBIDDEN'; end if;
      update public.re_award_results set visibility = 'revoked' where run_id = p.final_run_id and entry_id = (p_input->>'entryId')::uuid;
      if not found then raise exception 'NOT_FOUND'; end if;
    end if;
  end if;
  insert into re_private.re_audit_log(actor_id,action,entity_type,entity_id,reason,safe_metadata)
    values(actor,'award.'||op,'award_period',p.id,reason,jsonb_strip_nulls(jsonb_build_object('runId',run.id,'entryId',p_input->>'entryId','evaluationId',p_input->>'evaluationId')));
  return jsonb_build_object('id',coalesce(run.id,p.id));
exception when unique_violation then raise exception 'CONFLICT';
end;
$$;
create function public.re_award_command(p_input jsonb) returns jsonb language sql security invoker set search_path = '' as $$ select re_private.re_award_command(p_input); $$;

create function re_private.re_award_result_json(r public.re_award_results) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('entryId',r.entry_id,'rank',r.rank,'medal',r.medal,'count',r.review_count,'ratingSum',r.rating_sum,'fiveStarCount',r.five_star_count,
    'average',r.raw_average,'score',r.adjusted_score,'visibility',case when r.visibility = 'revoked' then 'revoked'
      when r.visibility = 'content_removed' or not re_private.re_recipe_is_public(r.recipe_id) then 'content_removed' else 'visible' end,
    'entry',case when r.visibility = 'visible' and re_private.re_recipe_is_public(r.recipe_id) then re_private.re_award_entry_json(e) end)
    from public.re_award_entries e where e.id = r.entry_id;
$$;
create function re_private.re_get_awards(p_slug text,p_page integer,p_author uuid,p_recipe uuid,p_own_page integer) returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.re_award_periods%rowtype; actor uuid := re_private.re_community_viewer(); result jsonb; off integer := (least(greatest(coalesce(p_page,1),1),100)-1)*12;
begin
  if p_slug is null then
    select jsonb_build_object('periods',coalesce((select jsonb_agg(re_private.re_award_period_json(x::public.re_award_periods) order by x.month_key desc,x.id) from
      (select * from public.re_award_periods where state <> 'draft' order by month_key desc,id limit 12 offset off) x),'[]'::jsonb),
      'periodTotal',(select count(*) from public.re_award_periods where state <> 'draft'),
      'results',coalesce((select jsonb_agg(re_private.re_award_result_json(x::public.re_award_results)||jsonb_build_object('period',re_private.re_award_period_json(ap)) order by ap.month_key desc,x.rank,x.entry_id)
        from (select r.* from public.re_award_results r join public.re_award_periods a on a.final_run_id = r.run_id and a.state = 'finalized'
          where r.medal is not null and (p_author is null or (r.author_id = p_author and r.visibility = 'visible' and re_private.re_recipe_is_public(r.recipe_id)))
          and (p_recipe is null or (r.recipe_id = p_recipe and r.visibility = 'visible' and re_private.re_recipe_is_public(r.recipe_id)))
          order by a.month_key desc,r.rank,r.entry_id limit 12 offset off) x join public.re_award_runs ar on ar.id = x.run_id join public.re_award_periods ap on ap.id = ar.period_id),'[]'::jsonb),
      'resultTotal',(select count(*) from public.re_award_results r join public.re_award_periods a on a.final_run_id = r.run_id and a.state = 'finalized'
        where r.medal is not null and (p_author is null or (r.author_id = p_author and r.visibility = 'visible' and re_private.re_recipe_is_public(r.recipe_id)))
        and (p_recipe is null or (r.recipe_id = p_recipe and r.visibility = 'visible' and re_private.re_recipe_is_public(r.recipe_id))))) into result;
    return result;
  end if;
  select * into p from public.re_award_periods where slug = p_slug and state <> 'draft';
  if not found then return null; end if;
  return jsonb_build_object('period',re_private.re_award_period_json(p),'entries',coalesce((select jsonb_agg(re_private.re_award_entry_json(x.entry) order by x.order_key,(x.entry).id)
    from (select e as entry,md5(e.id::text||(clock_timestamp() at time zone 'Asia/Seoul')::date::text) order_key from public.re_award_entries e
      where period_id = p.id and status = 'submitted' and re_private.re_recipe_is_public(recipe_id)
      order by order_key,e.id limit 12 offset off) x),'[]'::jsonb),
    'entryTotal',(select count(*) from public.re_award_entries where period_id = p.id and status = 'submitted' and re_private.re_recipe_is_public(recipe_id)),
    'ownEntry',(select jsonb_build_object('id',e.id,'status',e.status,'versionId',e.recipe_version_id,'recipeId',e.recipe_id) from public.re_award_entries e where e.period_id = p.id and e.author_id = actor),
    'canEnter',coalesce(re_private.re_award_member(actor),false),
    'ownRecipes',coalesce((select jsonb_agg(jsonb_build_object('versionId',r.current_version_id,'title',v.title,'versionNo',v.version_no) order by r.first_published_at desc,r.id)
      from (select * from public.re_recipes where author_id = actor and status = 'published' and first_published_at >= p.submission_opens_at and first_published_at < p.submission_closes_at
        order by first_published_at desc,id limit 12 offset ((least(greatest(coalesce(p_own_page,1),1),100)-1)*12)) r join public.re_recipe_versions v on v.id = r.current_version_id),'[]'::jsonb),
    'ownRecipeTotal',(select count(*) from public.re_recipes where author_id = actor and status = 'published' and first_published_at >= p.submission_opens_at and first_published_at < p.submission_closes_at),
    'results',coalesce((select jsonb_agg(re_private.re_award_result_json(x::public.re_award_results) order by x.rank,x.entry_id) from
      (select * from public.re_award_results where run_id = p.final_run_id order by rank,entry_id limit 12 offset off) x),'[]'::jsonb),
    'resultTotal',(select count(*) from public.re_award_results where run_id = p.final_run_id));
end;
$$;
create function public.re_get_awards(p_slug text default null,p_page integer default 1,p_author uuid default null,p_recipe uuid default null,p_own_page integer default 1)
returns jsonb language sql security invoker set search_path = '' as $$ select re_private.re_get_awards(p_slug,p_page,p_author,p_recipe,p_own_page); $$;

create function re_private.re_get_review_award_context(p_version uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.re_award_periods%rowtype; e public.re_award_entries%rowtype; a public.re_award_evaluations%rowtype; actor uuid := re_private.re_community_viewer(); status text;
begin
  if not re_private.re_recipe_is_public((select recipe_id from public.re_recipe_versions where id = p_version)) then return null; end if;
  select e0.* into e from public.re_award_entries e0 join public.re_award_periods p0 on p0.id = e0.period_id
    where e0.recipe_version_id = p_version and p0.state in ('published','finalized') order by p0.month_key desc limit 1;
  if not found then return null; end if;
  select * into p from public.re_award_periods where id = e.period_id;
  select * into a from public.re_award_evaluations where entry_id = e.id and reviewer_id = actor;
  status := case when p.state = 'finalized' then 'finalized' when e.status <> 'submitted' then 'entry_unavailable'
    when a.id is not null then a.eligibility when clock_timestamp() < p.voting_opens_at then 'not_open'
    when clock_timestamp() >= p.voting_closes_at then 'closed' when actor is null then 'login'
    when actor = e.author_id or not re_private.re_award_member(actor) then 'ineligible'
    when exists(select 1 from public.re_cook_reviews where recipe_version_id = p_version and author_id = actor) then 'existing_review'
    when not exists(select 1 from re_private.re_accounts where profile_id = actor and created_at <= clock_timestamp() - interval '24 hours') then 'too_new'
    else 'eligible' end;
  return jsonb_build_object('period',re_private.re_award_period_json(p),'status',status,'rating',a.rating_snapshot);
end;
$$;
create function public.re_get_review_award_context(p_version uuid) returns jsonb language sql security invoker set search_path = '' as $$ select re_private.re_get_review_award_context(p_version); $$;

create function re_private.re_get_admin_awards(p_period uuid,p_page integer,p_run uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.re_award_periods%rowtype; run public.re_award_runs%rowtype; off integer := (least(greatest(coalesce(p_page,1),1),100)-1)*12; manifest jsonb;
begin
  if not re_private.re_is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_period is null then
    return jsonb_build_object('periods',coalesce((select jsonb_agg(re_private.re_award_period_json(x::public.re_award_periods) order by x.month_key desc,x.id)
      from (select * from public.re_award_periods order by month_key desc,id limit 12 offset off) x),'[]'::jsonb),'total',(select count(*) from public.re_award_periods));
  end if;
  select * into p from public.re_award_periods where id = p_period;
  if not found then return null; end if;
  select * into run from public.re_award_runs where period_id = p.id and (case when p_run is not null then id = p_run when p.final_run_id is not null then id = p.final_run_id else true end) order by prepared_at desc,id desc limit 1;
  select i.manifest into manifest from re_private.re_award_run_inputs i where i.run_id = run.id;
  return jsonb_build_object('period',re_private.re_award_period_json(p),'run',case when run.id is not null then jsonb_build_object('id',run.id,'revision',run.source_revision,'status',run.status,'preparedAt',run.prepared_at,'inputHash',run.input_hash,
      'stale',run.source_revision <> p.source_revision or run.input_hash <> re_private.re_award_hash(jsonb_build_array(p.rules,re_private.re_award_manifest(p.id)))) end,
    'entries',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'status',x.status,'entry',re_private.re_award_entry_json(x::public.re_award_entries)) order by x.id)
      from (select * from public.re_award_entries where period_id = p.id order by id limit 12 offset off) x),'[]'::jsonb),
    'entryTotal',(select count(*) from public.re_award_entries where period_id = p.id),
    'evaluations',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'entryId',x.entry_id,'reviewId',x.review_id,'eligibility',x.eligibility,'rating',x.rating_snapshot) order by x.id)
      from (select * from public.re_award_evaluations where period_id = p.id order by id limit 12 offset off) x),'[]'::jsonb),
    'evaluationTotal',(select count(*) from public.re_award_evaluations where period_id = p.id),
    'inputs',coalesce((select jsonb_agg(jsonb_build_object('entryId',x->>'entryId','reason',x->>'reason','includedCount',(select count(*) from jsonb_array_elements(x->'evaluations') v where v->>'reason' = 'included'),
      'excludedReasons',(select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) from (select v->>'reason' reason,count(*) count from jsonb_array_elements(x->'evaluations') v where v->>'reason' <> 'included' group by v->>'reason') g)))
      from (select value x from jsonb_array_elements(coalesce(manifest,'[]'::jsonb)) limit 12 offset off) s),'[]'::jsonb),
    'results',coalesce((select jsonb_agg(re_private.re_award_result_json(x::public.re_award_results) order by x.rank,x.entry_id) from (select * from public.re_award_results where run_id = run.id order by rank,entry_id limit 12 offset off) x),'[]'::jsonb),
    'resultTotal',(select count(*) from public.re_award_results where run_id = run.id));
end;
$$;
create function public.re_get_admin_awards(p_period uuid default null,p_page integer default 1,p_run uuid default null) returns jsonb language sql security invoker set search_path = '' as $$ select re_private.re_get_admin_awards(p_period,p_page,p_run); $$;

-- Revoke defaults explicitly on each newly introduced entry point and helper.
revoke all on function re_private.re_award_member(uuid),re_private.re_award_phase(public.re_award_periods),re_private.re_award_period_json(public.re_award_periods),
  re_private.re_award_entry_json(public.re_award_entries),re_private.re_award_manifest(uuid),re_private.re_award_hash(jsonb),re_private.re_award_result_hash(uuid),
  re_private.re_sync_award_review(uuid,boolean,timestamptz),re_private.re_award_result_json(public.re_award_results),
  re_private.re_award_command(jsonb),public.re_award_command(jsonb),re_private.re_get_awards(text,integer,uuid,uuid,integer),public.re_get_awards(text,integer,uuid,uuid,integer),
  re_private.re_get_review_award_context(uuid),public.re_get_review_award_context(uuid),re_private.re_get_admin_awards(uuid,integer,uuid),public.re_get_admin_awards(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function re_private.re_award_command(jsonb),public.re_award_command(jsonb),re_private.re_get_admin_awards(uuid,integer,uuid),public.re_get_admin_awards(uuid,integer,uuid) to authenticated;
grant execute on function re_private.re_get_awards(text,integer,uuid,uuid,integer),public.re_get_awards(text,integer,uuid,uuid,integer),re_private.re_get_review_award_context(uuid),public.re_get_review_award_context(uuid) to anon,authenticated;

create function re_private.re_award_notification_slug(p_id uuid) returns text language sql stable security definer set search_path = '' as $$ select slug from public.re_award_periods where id = p_id and state = 'finalized'; $$;
revoke all on function re_private.re_award_notification_slug(uuid) from public,anon,authenticated;
grant execute on function re_private.re_award_notification_slug(uuid) to authenticated;
create or replace function public.re_get_my_notifications(p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with rows as materialized(select * from public.re_notifications where recipient_id = re_private.re_community_viewer()),
  page_rows as(select * from rows order by created_at desc,id limit 12 offset ((least(greatest(coalesce(p_page,1),1),100)-1)*12)),
  visible as(select n.id,n.created_at,jsonb_build_object('id',n.id,'type',n.type,'readAt',n.read_at,'createdAt',n.created_at,
    'recipeId',coalesce(r.recipe_id,c.recipe_id),'versionId',r.recipe_version_id,'entityId',coalesce(r.id,c.id),
    'threadId',c.parent_id,'awardSlug',case when n.type = 'award' then re_private.re_award_notification_slug(n.entity_id) end) as card from page_rows n
    left join public.re_review_cards r on n.type = 'review' and r.id = n.entity_id
    left join public.re_comment_cards c on n.type = 'reply' and c.id = n.entity_id and c.card->>'status' = 'published')
  select jsonb_build_object('items',coalesce((select jsonb_agg(card order by created_at desc,id) from visible),'[]'::jsonb),
    'total',(select count(*) from rows),'unread',(select count(*) from rows where read_at is null));
$$;
