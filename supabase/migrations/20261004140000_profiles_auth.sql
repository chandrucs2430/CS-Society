begin;

do $$
begin
  if to_regclass('public.profiles') is not null then
    raise exception 'public.profiles already exists. Inspect its columns, constraints, policies, and data, then adapt this migration before applying it.';
  end if;
  if to_regclass('public.cs_profile_roles') is not null then
    raise exception 'public.cs_profile_roles already exists. Inspect its schema and data before applying this migration.';
  end if;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default ''
    check (char_length(display_name) <= 100),
  neighborhood text not null default ''
    check (char_length(neighborhood) <= 160),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cs_profile_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('resident', 'volunteer')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.profiles enable row level security;
alter table public.cs_profile_roles enable row level security;

create policy "Users read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles, public.cs_profile_roles from anon, authenticated;
grant select (id, display_name, neighborhood, avatar_path, created_at, updated_at)
  on public.profiles to authenticated;
grant update (display_name, neighborhood, avatar_path)
  on public.profiles to authenticated;

create or replace function public.cs_touch_profile_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.display_name := btrim(regexp_replace(coalesce(new.display_name, ''), '[[:space:]]+', ' ', 'g'));
  new.neighborhood := btrim(regexp_replace(coalesce(new.neighborhood, ''), '[[:space:]]+', ' ', 'g'));
  if char_length(new.display_name) > 100 or char_length(new.neighborhood) > 160 then
    raise exception 'The profile contains invalid fields.';
  end if;
  if tg_op = 'UPDATE' then
    if char_length(new.display_name) not between 2 and 100 then
      raise exception 'Your name must be between 2 and 100 characters.';
    end if;
    if auth.uid() is not null and auth.uid() <> old.id then
      raise exception 'You can only update your own profile.';
    end if;
    if new.id is distinct from old.id then
      raise exception 'A profile ID cannot be changed.';
    end if;
  end if;
  if new.avatar_path is not null and (
    split_part(new.avatar_path, '/', 1) <> new.id::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'cs-report-photos' and name = new.avatar_path
    )
  ) then
    raise exception 'The profile photo must be an uploaded image belonging to the profile owner.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.cs_touch_profile_updated_at() from public, anon, authenticated;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.cs_touch_profile_updated_at();

create or replace function public.cs_sync_public_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.cs_profiles
  set display_name = new.display_name,
      avatar_path = new.avatar_path,
      updated_at = now()
  where id = new.id;
  update public.cs_profile_settings
  set neighborhood = new.neighborhood,
      updated_at = now()
  where user_id = new.id;
  return new;
end;
$$;

create trigger profiles_sync_public_profile
  after insert or update of display_name, neighborhood, avatar_path on public.profiles
  for each row execute function public.cs_sync_public_profile();

create or replace function public.cs_sync_profile_role_cache()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_user uuid;
  assigned_roles text[];
begin
  if tg_op = 'DELETE' then
    affected_user := old.user_id;
  else
    affected_user := new.user_id;
  end if;

  select array_agg(role order by role)
  into assigned_roles
  from public.cs_profile_roles
  where user_id = affected_user;

  update public.cs_profiles
  set roles = coalesce(assigned_roles, array['resident']::text[]),
      updated_at = now()
  where id = affected_user;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.cs_sync_public_profile() from public, anon, authenticated;
revoke all on function public.cs_sync_profile_role_cache() from public, anon, authenticated;

create trigger profile_roles_sync_cache
  after insert or update or delete on public.cs_profile_roles
  for each row execute function public.cs_sync_profile_role_cache();

create or replace function public.cs_create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  safe_name text;
begin
  safe_name := left(btrim(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name', ''),
    '[[:space:]]+', ' ', 'g'
  )), 100);

  insert into public.cs_profiles (id, display_name, roles)
  values (new.id, safe_name, array['resident']::text[])
  on conflict (id) do nothing;

  insert into public.profiles (id, display_name)
  values (new.id, safe_name)
  on conflict (id) do nothing;

  insert into public.cs_profile_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.cs_profile_roles (user_id, role)
  values (new.id, 'resident')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

revoke all on function public.cs_create_profile_for_user() from public, anon, authenticated;
drop trigger if exists cs_auth_user_profile on auth.users;
create trigger cs_auth_user_profile
  after insert on auth.users
  for each row execute function public.cs_create_profile_for_user();

insert into public.cs_profiles (id, display_name, roles)
select id, '', array['resident']::text[]
from auth.users
on conflict (id) do nothing;

insert into public.cs_profile_settings (user_id)
select id
from auth.users
on conflict (user_id) do nothing;

insert into public.cs_profile_roles (user_id, role)
select id, 'resident'
from auth.users
on conflict (user_id, role) do nothing;

update public.cs_profiles
set roles = array['resident']::text[],
    updated_at = now();

insert into public.profiles
  (id, display_name, neighborhood, avatar_path, created_at, updated_at)
select
  users.id,
  left(btrim(regexp_replace(coalesce(
    nullif(public_profiles.display_name, ''),
    users.raw_user_meta_data ->> 'display_name',
    users.raw_user_meta_data ->> 'name',
    ''
  ), '[[:space:]]+', ' ', 'g')), 100),
  left(btrim(coalesce(settings.neighborhood, '')), 160),
  case when exists (
    select 1 from storage.objects
    where bucket_id = 'cs-report-photos' and name = public_profiles.avatar_path
  ) then public_profiles.avatar_path else null end,
  coalesce(public_profiles.created_at, users.created_at, now()),
  coalesce(public_profiles.updated_at, users.updated_at, now())
from auth.users as users
left join public.cs_profiles as public_profiles on public_profiles.id = users.id
left join public.cs_profile_settings as settings on settings.user_id = users.id
on conflict (id) do nothing;

create or replace function public.cs_enable_volunteer()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in is required to enable volunteering.';
  end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Your profile is not ready. Contact the project administrator.';
  end if;
  insert into public.cs_profile_roles (user_id, role)
  values (auth.uid(), 'volunteer')
  on conflict (user_id, role) do nothing;
end;
$$;

create or replace function public.cs_save_my_profile(
  p_display_name text,
  p_neighborhood text,
  p_avatar_path text,
  p_notification_prefs jsonb
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_profile public.profiles%rowtype;
  normalized_name text;
  normalized_neighborhood text;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required to update your profile.';
  end if;

  normalized_name := btrim(regexp_replace(coalesce(p_display_name, ''), '[[:space:]]+', ' ', 'g'));
  normalized_neighborhood := btrim(regexp_replace(coalesce(p_neighborhood, ''), '[[:space:]]+', ' ', 'g'));
  if char_length(normalized_name) not between 2 and 100
    or char_length(normalized_neighborhood) > 160
    or p_notification_prefs is null
    or jsonb_typeof(p_notification_prefs) <> 'object'
    or exists (
      select 1
      from jsonb_each(p_notification_prefs) as pref(key, value)
      where key not in ('claimed', 'update', 'resolved', 'milestone', 'near')
        or jsonb_typeof(value) <> 'boolean'
    )
  then
    raise exception 'The profile contains invalid fields.';
  end if;

  if p_avatar_path is not null and (
    split_part(p_avatar_path, '/', 1) <> auth.uid()::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'cs-report-photos' and name = p_avatar_path
    )
  ) then
    raise exception 'The profile photo must be an uploaded image belonging to the signed-in user.';
  end if;

  update public.profiles
  set display_name = normalized_name,
      neighborhood = normalized_neighborhood,
      avatar_path = p_avatar_path
  where id = auth.uid()
  returning * into saved_profile;
  if not found then
    raise exception 'Your profile is missing. Contact the project administrator.';
  end if;

  update public.cs_profile_settings
  set neighborhood = normalized_neighborhood,
      notification_prefs = p_notification_prefs,
      updated_at = now()
  where user_id = auth.uid();
  if not found then
    raise exception 'Your profile settings are missing. Contact the project administrator.';
  end if;

  return saved_profile;
end;
$$;

-- Keep the prior client RPC shape for rollout compatibility, but ignore its role argument.
create or replace function public.cs_update_profile(
  p_display_name text,
  p_neighborhood text,
  p_roles text[],
  p_avatar_path text,
  p_notification_prefs jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.cs_save_my_profile(
    p_display_name, p_neighborhood, p_avatar_path, p_notification_prefs
  );
end;
$$;

revoke all on function public.cs_save_my_profile(text, text, text, jsonb)
  from public, anon;
revoke all on function public.cs_update_profile(text, text, text[], text, jsonb)
  from public, anon;
revoke all on function public.cs_enable_volunteer() from public, anon;
grant execute on function public.cs_save_my_profile(text, text, text, jsonb) to authenticated;
grant execute on function public.cs_update_profile(text, text, text[], text, jsonb) to authenticated;
grant execute on function public.cs_enable_volunteer() to authenticated;

commit;
