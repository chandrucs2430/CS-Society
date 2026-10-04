begin;

create table public.cs_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 100),
  roles text[] not null default array['resident']::text[]
    check (cardinality(roles) > 0 and roles <@ array['resident', 'volunteer']::text[]),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cs_profile_settings (
  user_id uuid primary key references public.cs_profiles(id) on delete cascade,
  neighborhood text not null default '' check (char_length(neighborhood) <= 160),
  notification_prefs jsonb not null default '{"claimed":true,"update":true,"resolved":true,"milestone":true,"near":false}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.cs_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.cs_profiles(id),
  volunteer_id uuid references public.cs_profiles(id),
  title text not null check (char_length(title) between 8 and 80),
  description text not null default '' check (char_length(description) <= 400),
  category text not null check (category in ('litter', 'dumping', 'damage', 'bin', 'other')),
  status text not null default 'New' check (status in ('New', 'Claimed', 'In Progress', 'Resolved')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  place text not null default '' check (char_length(place) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'New' and volunteer_id is null) or (status <> 'New' and volunteer_id is not null))
);

create table public.cs_report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.cs_reports(id) on delete cascade,
  actor_id uuid not null references public.cs_profiles(id),
  event_type text not null check (event_type in ('reported', 'claim', 'release', 'status', 'note')),
  status text check (status is null or status in ('New', 'Claimed', 'In Progress', 'Resolved')),
  note text not null default '' check (char_length(note) <= 400),
  photo_path text,
  volunteer_hours numeric(4,1) not null default 0 check (volunteer_hours between 0 and 24),
  created_at timestamptz not null default now()
);

create table public.cs_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.cs_profiles(id) on delete cascade,
  report_id uuid references public.cs_reports(id) on delete cascade,
  kind text not null check (kind in ('claimed', 'update', 'resolved', 'milestone', 'near')),
  message text not null check (char_length(message) between 1 and 300),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.cs_report_flags (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.cs_reports(id) on delete cascade,
  reporter_id uuid not null references public.cs_profiles(id) on delete cascade,
  reason text not null check (reason in ('inaccurate', 'inappropriate', 'duplicate')),
  details text not null default '' check (char_length(details) <= 300),
  created_at timestamptz not null default now(),
  unique (report_id, reporter_id)
);

create index cs_reports_created_at_idx on public.cs_reports (created_at desc);
create index cs_reports_status_idx on public.cs_reports (status);
create index cs_report_events_report_created_idx on public.cs_report_events (report_id, created_at);
create index cs_notifications_user_created_idx on public.cs_notifications (user_id, created_at desc);

alter table public.cs_profiles enable row level security;
alter table public.cs_profile_settings enable row level security;
alter table public.cs_reports enable row level security;
alter table public.cs_report_events enable row level security;
alter table public.cs_notifications enable row level security;
alter table public.cs_report_flags enable row level security;

create policy "Community profiles are readable"
  on public.cs_profiles for select to anon, authenticated using (true);
create policy "Users update their own profile"
  on public.cs_profiles for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy "Users read their own private profile settings"
  on public.cs_profile_settings for select to authenticated using (user_id = (select auth.uid()));
create policy "Users update their own private profile settings"
  on public.cs_profile_settings for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Community reports are readable"
  on public.cs_reports for select to anon, authenticated using (true);
create policy "Community report events are readable"
  on public.cs_report_events for select to anon, authenticated using (true);

create policy "Users read their own notifications"
  on public.cs_notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "Users mark their own notifications read"
  on public.cs_notifications for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Signed-in users submit report flags"
  on public.cs_report_flags for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy "Users read their own report flags"
  on public.cs_report_flags for select to authenticated using (reporter_id = (select auth.uid()));

revoke all on public.cs_profiles, public.cs_profile_settings, public.cs_reports, public.cs_report_events,
  public.cs_notifications, public.cs_report_flags from anon, authenticated;
grant select (id, display_name, roles, avatar_path) on public.cs_profiles to anon, authenticated;
grant select on public.cs_reports, public.cs_report_events to anon, authenticated;
grant select on public.cs_profile_settings to authenticated;
grant select on public.cs_notifications, public.cs_report_flags to authenticated;
grant update (is_read) on public.cs_notifications to authenticated;
grant insert (report_id, reporter_id, reason, details) on public.cs_report_flags to authenticated;

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
  insert into public.cs_profile_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger cs_auth_user_profile
  after insert on auth.users
  for each row execute function public.cs_create_profile_for_user();

insert into public.cs_profiles (id)
select id from auth.users
on conflict (id) do nothing;

insert into public.cs_profile_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.cs_create_report(
  p_title text,
  p_description text,
  p_category text,
  p_latitude double precision,
  p_longitude double precision,
  p_place text,
  p_photo_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_report_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in is required to report an issue.'; end if;
  if not exists (
    select 1 from public.cs_profiles
    where id = auth.uid() and roles @> array['resident']::text[]
  ) then raise exception 'The resident role is required to create a report.'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 8 and 80
    or p_description is null or char_length(p_description) > 400
    or p_category not in ('litter', 'dumping', 'damage', 'bin', 'other')
    or p_latitude not between -90 and 90 or p_longitude not between -180 and 180
    or char_length(coalesce(p_place, '')) > 200
  then raise exception 'The report contains invalid fields.'; end if;
  if p_photo_path is not null and (
    split_part(p_photo_path, '/', 1) <> auth.uid()::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'cs-report-photos' and name = p_photo_path
    )
  ) then raise exception 'The photo must be an uploaded image belonging to the signed-in user.'; end if;

  insert into public.cs_reports
    (reporter_id, title, description, category, latitude, longitude, place)
  values
    (auth.uid(), btrim(p_title), p_description, p_category, p_latitude, p_longitude, coalesce(p_place, ''))
  returning id into new_report_id;

  insert into public.cs_report_events
    (report_id, actor_id, event_type, note, photo_path)
  values (new_report_id, auth.uid(), 'reported', p_description, p_photo_path);

  if coalesce((
    select notification_prefs ->> 'update'
    from public.cs_profile_settings where user_id = auth.uid()
  )::boolean, true) then
    insert into public.cs_notifications (user_id, report_id, kind, message)
    values (auth.uid(), new_report_id, 'update', 'Your report was shared with nearby volunteers');
  end if;
  return new_report_id;
end;
$$;

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
  if auth.uid() is null then raise exception 'Sign in is required to update your profile.'; end if;
  if p_display_name is null or char_length(btrim(p_display_name)) not between 2 and 100
    or p_neighborhood is null or char_length(p_neighborhood) > 160
    or coalesce(cardinality(p_roles), 0) = 0
    or not (p_roles <@ array['resident', 'volunteer']::text[])
    or p_notification_prefs is null or jsonb_typeof(p_notification_prefs) <> 'object'
    or exists (
      select 1 from jsonb_each(p_notification_prefs) as pref(key, value)
      where key not in ('claimed', 'update', 'resolved', 'milestone', 'near')
        or jsonb_typeof(value) <> 'boolean'
    )
  then raise exception 'The profile contains invalid fields.'; end if;
  if p_avatar_path is not null and (
    split_part(p_avatar_path, '/', 1) <> auth.uid()::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'cs-report-photos' and name = p_avatar_path
    )
  ) then raise exception 'The profile photo must be an uploaded image belonging to the signed-in user.'; end if;

  update public.cs_profiles set
    display_name = btrim(p_display_name),
    roles = p_roles,
    avatar_path = p_avatar_path,
    updated_at = now()
  where id = auth.uid();
  update public.cs_profile_settings set
    neighborhood = p_neighborhood,
    notification_prefs = p_notification_prefs,
    updated_at = now()
  where user_id = auth.uid();
end;
$$;

create or replace function public.cs_enable_volunteer()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Sign in is required to enable volunteering.'; end if;
  update public.cs_profiles set
    roles = array(
      select distinct role_value
      from unnest(roles || array['volunteer']::text[]) as enabled(role_value)
      order by role_value
    ),
    updated_at = now()
  where id = auth.uid();
end;
$$;

create or replace function public.cs_transition_report(
  p_report_id uuid,
  p_action text,
  p_note text default '',
  p_status text default null,
  p_photo_path text default null,
  p_hours numeric default 0
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_report public.cs_reports%rowtype;
  event_kind text;
  next_status text;
  notice_kind text;
begin
  if auth.uid() is null then raise exception 'Sign in is required to update a report.'; end if;
  if char_length(coalesce(p_note, '')) > 400 or coalesce(p_hours, 0) not between 0 and 24
  then raise exception 'The update contains invalid fields.'; end if;
  if p_photo_path is not null and (
    split_part(p_photo_path, '/', 1) <> auth.uid()::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'cs-report-photos' and name = p_photo_path
    )
  ) then raise exception 'The photo must be an uploaded image belonging to the signed-in user.'; end if;

  select * into current_report from public.cs_reports
  where id = p_report_id for update;
  if not found then raise exception 'The report no longer exists.'; end if;

  if p_action = 'claim' then
    if char_length(btrim(coalesce(p_note, ''))) > 0 or p_photo_path is not null or coalesce(p_hours, 0) > 0
    then raise exception 'Claim actions cannot include an update.'; end if;
    if current_report.status <> 'New' or not exists (
      select 1 from public.cs_profiles
      where id = auth.uid() and roles @> array['volunteer']::text[]
    ) then raise exception 'This report cannot be claimed by your account.'; end if;
    next_status := 'Claimed';
    event_kind := 'claim';
    update public.cs_reports set status = next_status, volunteer_id = auth.uid(), updated_at = now()
      where id = p_report_id;
  elsif p_action = 'release' then
    if char_length(btrim(coalesce(p_note, ''))) > 0 or p_photo_path is not null or coalesce(p_hours, 0) > 0
      or current_report.status <> 'Claimed' or current_report.volunteer_id is distinct from auth.uid()
    then raise exception 'Only the volunteer who claimed this report can release it.'; end if;
    next_status := 'New';
    event_kind := 'release';
    update public.cs_reports set status = next_status, volunteer_id = null, updated_at = now()
      where id = p_report_id;
  elsif p_action in ('start', 'resolve', 'update') then
    if current_report.volunteer_id is distinct from auth.uid() or not exists (
      select 1 from public.cs_profiles
      where id = auth.uid() and roles @> array['volunteer']::text[]
    ) then raise exception 'Only the assigned volunteer can update this report.'; end if;
    if p_action = 'start' and current_report.status = 'Claimed' then
      next_status := 'In Progress';
    elsif p_action = 'resolve' and current_report.status in ('Claimed', 'In Progress')
      and char_length(btrim(coalesce(p_note, ''))) >= 5 then
      next_status := 'Resolved';
    elsif p_action = 'update' and p_status = current_report.status
      and (char_length(btrim(coalesce(p_note, ''))) > 0 or p_photo_path is not null or coalesce(p_hours, 0) > 0) then
      next_status := current_report.status;
    else
      raise exception 'This report cannot be moved to the requested status.';
    end if;
    event_kind := case when next_status <> current_report.status then 'status' else 'note' end;
    update public.cs_reports set status = next_status, updated_at = now() where id = p_report_id;
  elsif p_action = 'note' then
    if current_report.reporter_id <> auth.uid()
      or (char_length(btrim(coalesce(p_note, ''))) = 0 and p_photo_path is null)
      or coalesce(p_hours, 0) > 0
    then raise exception 'Only the report owner can add a note.'; end if;
    next_status := null;
    event_kind := 'note';
  else
    raise exception 'Unknown report action.';
  end if;

  insert into public.cs_report_events
    (report_id, actor_id, event_type, status, note, photo_path, volunteer_hours)
  values (
    p_report_id, auth.uid(), event_kind, next_status, coalesce(p_note, ''),
    p_photo_path, case when event_kind in ('claim', 'release') then 0 else coalesce(p_hours, 0) end
  );

  if current_report.reporter_id <> auth.uid() then
    notice_kind := case when next_status = 'Resolved' then 'resolved'
      when p_action = 'claim' then 'claimed' else 'update' end;
    if coalesce((
      select (notification_prefs ->> notice_kind)::boolean
      from public.cs_profile_settings where user_id = current_report.reporter_id
    ), true) then
      insert into public.cs_notifications (user_id, report_id, kind, message)
      values (
        current_report.reporter_id, p_report_id, notice_kind,
        case when notice_kind = 'claimed' then 'A volunteer claimed your report'
          when notice_kind = 'resolved' then 'Your report was marked resolved'
          else 'There is a new update on your report' end
      );
    end if;
  end if;
end;
$$;

create or replace function public.cs_create_report_flag(
  p_report_id uuid,
  p_reason text,
  p_details text default ''
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Sign in is required to flag a report.'; end if;
  if p_reason not in ('inaccurate', 'inappropriate', 'duplicate')
    or char_length(coalesce(p_details, '')) > 300
  then raise exception 'The report flag contains invalid fields.'; end if;
  insert into public.cs_report_flags (report_id, reporter_id, reason, details)
  values (p_report_id, auth.uid(), p_reason, coalesce(p_details, ''));
end;
$$;

create or replace function public.cs_add_milestone_notification(p_message text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Sign in is required to save a milestone.'; end if;
  if p_message is null or char_length(p_message) not between 1 and 300
  then raise exception 'The milestone message is invalid.'; end if;
  if coalesce((
    select (notification_prefs ->> 'milestone')::boolean
    from public.cs_profile_settings where user_id = auth.uid()
  ), true) then
    insert into public.cs_notifications (user_id, kind, message)
    values (auth.uid(), 'milestone', p_message);
  end if;
end;
$$;

revoke all on function public.cs_create_profile_for_user() from public, anon, authenticated;
revoke all on function public.cs_create_report(text, text, text, double precision, double precision, text, text) from public, anon;
revoke all on function public.cs_update_profile(text, text, text[], text, jsonb) from public, anon;
revoke all on function public.cs_enable_volunteer() from public, anon;
revoke all on function public.cs_transition_report(uuid, text, text, text, text, numeric) from public, anon;
revoke all on function public.cs_create_report_flag(uuid, text, text) from public, anon;
revoke all on function public.cs_add_milestone_notification(text) from public, anon;
grant execute on function public.cs_create_report(text, text, text, double precision, double precision, text, text) to authenticated;
grant execute on function public.cs_update_profile(text, text, text[], text, jsonb) to authenticated;
grant execute on function public.cs_enable_volunteer() to authenticated;
grant execute on function public.cs_transition_report(uuid, text, text, text, text, numeric) to authenticated;
grant execute on function public.cs_create_report_flag(uuid, text, text) to authenticated;
grant execute on function public.cs_add_milestone_notification(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cs-report-photos', 'cs-report-photos', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

do $$
declare
  photo_bucket storage.buckets%rowtype;
begin
  select * into photo_bucket from storage.buckets where id = 'cs-report-photos';
  if not found or photo_bucket.file_size_limit is distinct from 5242880
    or not coalesce(photo_bucket.allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[], false)
  then
    raise exception 'The cs-report-photos bucket must be private, limited to 5 MB, and allow JPEG, PNG and WebP. Inspect and configure it before applying this migration.';
  end if;
  update storage.buckets set public = false where id = 'cs-report-photos';
end;
$$;

create policy "Authenticated users can read community report photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'cs-report-photos');
create policy "Users upload photos in their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cs-report-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Users delete their own photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'cs-report-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.cs_report_events where photo_path = name
    )
    and not exists (
      select 1 from public.cs_profiles where avatar_path = name
    )
  );

commit;
