begin;

do $$
begin
  if to_regclass('public.cs_profiles') is null
    or to_regclass('public.cs_profile_roles') is null
    or to_regclass('public.cs_reports') is null
    or to_regclass('public.cs_report_events') is null
  then
    raise exception 'Apply the initial schema and profile migrations before this migration.';
  end if;

  if exists (
    select 1 from public.cs_profile_roles where role = 'volunteer'
  ) then
    raise exception 'Existing volunteer roles need review before this migration. Revoke unapproved rows and retry; do not assume prior self-selected roles were approved.';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'cs-report-photos'
      and file_size_limit = 5242880
      and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[]
  ) then
    raise exception 'Inspect the cs-report-photos bucket and configure JPEG, PNG and WebP with a 5 MiB limit before retrying.';
  end if;
end;
$$;

update storage.buckets
set public = false
where id = 'cs-report-photos';

drop policy if exists "Community report photos are readable" on storage.objects;
drop policy if exists "Authenticated users can read community report photos" on storage.objects;
create policy "Authenticated users can read community report photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'cs-report-photos');

alter table public.cs_profile_roles
  drop constraint if exists cs_profile_roles_role_check;
alter table public.cs_profile_roles
  add constraint cs_profile_roles_role_check
  check (role in ('resident', 'volunteer', 'admin'));

alter table public.cs_profiles
  drop constraint if exists cs_profiles_roles_check;
alter table public.cs_profiles
  add constraint cs_profiles_roles_check
  check (cardinality(roles) > 0 and roles <@ array['resident', 'volunteer', 'admin']::text[]);

alter table public.cs_reports
  drop constraint if exists cs_reports_status_check;
alter table public.cs_reports
  add constraint cs_reports_status_check
  check (status in ('New', 'Claimed', 'In Progress', 'Pending Verification', 'Resolved'));

alter table public.cs_report_events
  drop constraint if exists cs_report_events_event_type_check;
alter table public.cs_report_events
  add constraint cs_report_events_event_type_check
  check (event_type in ('reported', 'claim', 'release', 'status', 'note', 'verification'));

alter table public.cs_report_events
  drop constraint if exists cs_report_events_status_check;
alter table public.cs_report_events
  add constraint cs_report_events_status_check
  check (status is null or status in ('New', 'Claimed', 'In Progress', 'Pending Verification', 'Resolved'));

create or replace function public.cs_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.cs_profile_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.cs_is_admin() from public, anon;
grant execute on function public.cs_is_admin() to authenticated;

create policy "Admins read all report flags"
  on public.cs_report_flags for select to authenticated
  using (public.cs_is_admin());

create or replace function public.cs_admin_set_volunteer(
  p_user_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.cs_is_admin() then
    raise exception 'Administrator access is required to manage volunteer roles.';
  end if;
  if p_user_id is null or p_enabled is null
    or not exists (select 1 from public.profiles where id = p_user_id)
  then
    raise exception 'Choose a valid account.';
  end if;
  if not p_enabled and exists (
    select 1 from public.cs_reports
    where volunteer_id = p_user_id and status in ('Claimed', 'In Progress', 'Pending Verification')
  ) then
    raise exception 'This volunteer has an active report. Resolve or reassign it before removing access.';
  end if;

  if p_enabled then
    insert into public.cs_profile_roles (user_id, role)
    values (p_user_id, 'volunteer')
    on conflict (user_id, role) do nothing;
  else
    delete from public.cs_profile_roles
    where user_id = p_user_id and role = 'volunteer';
  end if;
end;
$$;

revoke all on function public.cs_admin_set_volunteer(uuid, boolean) from public, anon;
grant execute on function public.cs_admin_set_volunteer(uuid, boolean) to authenticated;

revoke all on function public.cs_enable_volunteer() from public, anon, authenticated;
drop function public.cs_enable_volunteer();

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
declare
  report_title text;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required to flag a report.';
  end if;
  if p_reason not in ('inaccurate', 'inappropriate', 'duplicate')
    or char_length(coalesce(p_details, '')) > 300
  then
    raise exception 'The report flag contains invalid fields.';
  end if;

  select title into report_title
  from public.cs_reports
  where id = p_report_id;
  if not found then
    raise exception 'The report no longer exists.';
  end if;

  insert into public.cs_report_flags (report_id, reporter_id, reason, details)
  values (p_report_id, auth.uid(), p_reason, btrim(coalesce(p_details, '')));

  insert into public.cs_notifications (user_id, report_id, kind, message)
  select roles.user_id, p_report_id, 'update', 'A report was flagged for administrator review: ' || report_title
  from public.cs_profile_roles as roles
  left join public.cs_profile_settings as settings on settings.user_id = roles.user_id
  where roles.role = 'admin'
    and roles.user_id <> auth.uid()
    and coalesce((settings.notification_prefs ->> 'update')::boolean, true);
end;
$$;

revoke all on function public.cs_create_report_flag(uuid, text, text) from public, anon, authenticated;
grant execute on function public.cs_create_report_flag(uuid, text, text) to authenticated;

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
  notice_message text;
  recipient_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required to update a report.';
  end if;
  if char_length(coalesce(p_note, '')) > 400
    or coalesce(p_hours, 0) not between 0 and 24
    or coalesce(p_hours, 0) <> round(coalesce(p_hours, 0) * 2) / 2
  then
    raise exception 'The update contains invalid fields.';
  end if;
  if p_photo_path is not null and (
    split_part(p_photo_path, '/', 1) <> auth.uid()::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'cs-report-photos' and name = p_photo_path
    )
  ) then
    raise exception 'The photo must be uploaded by the signed-in user.';
  end if;

  select * into current_report
  from public.cs_reports
  where id = p_report_id
  for update;
  if not found then
    raise exception 'The report no longer exists.';
  end if;

  if p_action = 'claim' then
    if char_length(btrim(coalesce(p_note, ''))) > 0
      or p_photo_path is not null or coalesce(p_hours, 0) > 0
    then
      raise exception 'Claim actions cannot include an update.';
    end if;
    if current_report.reporter_id = auth.uid()
      or current_report.status <> 'New'
      or not exists (
        select 1 from public.cs_profile_roles
        where user_id = auth.uid() and role = 'volunteer'
      )
    then
      raise exception 'This report cannot be claimed by your account.';
    end if;
    next_status := 'Claimed';
    event_kind := 'claim';
    update public.cs_reports
    set status = next_status, volunteer_id = auth.uid(), updated_at = now()
    where id = p_report_id;
  elsif p_action = 'release' then
    if char_length(btrim(coalesce(p_note, ''))) > 0
      or p_photo_path is not null or coalesce(p_hours, 0) > 0
      or current_report.status <> 'Claimed'
      or current_report.volunteer_id is distinct from auth.uid()
      or not exists (
        select 1 from public.cs_profile_roles
        where user_id = auth.uid() and role = 'volunteer'
      )
    then
      raise exception 'Only the assigned volunteer can release this claim.';
    end if;
    next_status := 'New';
    event_kind := 'release';
    update public.cs_reports
    set status = next_status, volunteer_id = null, updated_at = now()
    where id = p_report_id;
  elsif p_action in ('start', 'resolve', 'update') then
    if current_report.volunteer_id is distinct from auth.uid()
      or not exists (
        select 1 from public.cs_profile_roles
        where user_id = auth.uid() and role = 'volunteer'
      )
    then
      raise exception 'Only the assigned volunteer can update this report.';
    end if;

    if p_action = 'start' and current_report.status = 'Claimed' then
      next_status := 'In Progress';
    elsif p_action = 'resolve'
      and current_report.status = 'In Progress'
      and char_length(btrim(coalesce(p_note, ''))) >= 5
      and p_photo_path is not null
    then
      next_status := 'Pending Verification';
    elsif p_action = 'update'
      and current_report.status in ('Claimed', 'In Progress')
      and p_status = current_report.status
      and (char_length(btrim(coalesce(p_note, ''))) > 0
        or p_photo_path is not null or coalesce(p_hours, 0) > 0)
    then
      next_status := current_report.status;
    else
      raise exception 'This report cannot be moved to the requested status. Completion requires a photo and note.';
    end if;

    event_kind := case when next_status <> current_report.status then 'status' else 'note' end;
    update public.cs_reports
    set status = next_status, updated_at = now()
    where id = p_report_id;
  elsif p_action = 'note' then
    if current_report.reporter_id <> auth.uid()
      or (char_length(btrim(coalesce(p_note, ''))) = 0 and p_photo_path is null)
      or coalesce(p_hours, 0) > 0
    then
      raise exception 'Only the report owner can add a note.';
    end if;
    next_status := null;
    event_kind := 'note';
  elsif p_action in ('verify_approve', 'verify_reject') then
    if not public.cs_is_admin() then
      raise exception 'Administrator access is required to verify completion photos.';
    end if;
    if auth.uid() in (current_report.reporter_id, current_report.volunteer_id) then
      raise exception 'A report owner or assigned volunteer cannot verify their own completion evidence.';
    end if;
    if current_report.status <> 'Pending Verification'
      or p_photo_path is not null or coalesce(p_hours, 0) > 0
      or not exists (
        select 1 from public.cs_report_events
        where report_id = p_report_id
          and event_type = 'status'
          and status = 'Pending Verification'
          and photo_path is not null
      )
    then
      raise exception 'This report has no pending completion photo to verify.';
    end if;
    if p_action = 'verify_approve' then
      next_status := 'Resolved';
      notice_message := 'An administrator approved the completion evidence';
    else
      if char_length(btrim(coalesce(p_note, ''))) < 5 then
        raise exception 'Explain what needs to be fixed before rejecting the evidence.';
      end if;
      next_status := 'In Progress';
      notice_message := 'An administrator requested more work: ' || btrim(p_note);
    end if;
    event_kind := 'verification';
    update public.cs_reports
    set status = next_status, updated_at = now()
    where id = p_report_id;
  else
    raise exception 'Unknown report action.';
  end if;

  insert into public.cs_report_events
    (report_id, actor_id, event_type, status, note, photo_path, volunteer_hours)
  values (
    p_report_id,
    auth.uid(),
    event_kind,
    next_status,
    coalesce(btrim(p_note), ''),
    p_photo_path,
    case when event_kind in ('claim', 'release') then 0 else coalesce(p_hours, 0) end
  );

  notice_kind := case
    when next_status = 'Resolved' then 'resolved'
    when p_action = 'claim' then 'claimed'
    else 'update'
  end;
  notice_message := coalesce(notice_message, case
    when next_status = 'Pending Verification' then 'Completion evidence is awaiting administrator review'
    when next_status = 'Resolved' then 'Your report was verified and resolved'
    when p_action = 'claim' then 'A volunteer claimed your report'
    when p_action = 'verify_reject' then 'An administrator requested more work'
    else 'There is a new update on your report'
  end);

  for recipient_id in
    select distinct recipient
    from unnest(array[current_report.reporter_id, current_report.volunteer_id]) as recipients(recipient)
    where recipient is not null and recipient <> auth.uid()
  loop
    if coalesce((
      select (notification_prefs ->> notice_kind)::boolean
      from public.cs_profile_settings
      where user_id = recipient_id
    ), true) then
      insert into public.cs_notifications (user_id, report_id, kind, message)
      values (recipient_id, p_report_id, notice_kind, notice_message);
    end if;
  end loop;

  if p_action = 'resolve' then
    insert into public.cs_notifications (user_id, report_id, kind, message)
    select roles.user_id, p_report_id, 'update', 'Completion evidence is awaiting administrator review'
    from public.cs_profile_roles as roles
    left join public.cs_profile_settings as settings on settings.user_id = roles.user_id
    where roles.role = 'admin'
      and roles.user_id <> auth.uid()
      and roles.user_id not in (current_report.reporter_id, current_report.volunteer_id)
      and coalesce((settings.notification_prefs ->> 'update')::boolean, true);
  end if;
end;
$$;

revoke all on function public.cs_transition_report(uuid, text, text, text, text, numeric)
  from public, anon, authenticated;
grant execute on function public.cs_transition_report(uuid, text, text, text, text, numeric)
  to authenticated;

commit;
