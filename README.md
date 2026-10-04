# CS Society

CS Society is a community issue-reporting and volunteer coordination app. It
uses a static HTML/CSS/classic-JavaScript frontend, Supabase Auth, Postgres and
Storage, and hash-based routes. There is no framework runtime or API server.

## What is implemented

- Create an account, sign in, restore a Supabase session, request a password
  reset, and sign out.
- Load the authenticated account using `auth.getUser()` and its Auth UUID.
  Profile details are stored in `public.profiles`; role assignments are separate.
- Edit a display name, neighborhood, notification preferences, and optional
  profile photo.
- Submit a report with a category, title, description, coordinates, and optional
  photo. A database function creates the report, initial timeline event, and
  notification in one database transaction.
- Browse all community reports and filter/search the downloaded set in the
  browser. Filters include category, status, text, and distance from the
  selected map location. Reports are not paginated.
- Allow administrators to grant or remove volunteer access. Approved volunteers
  can claim a New report, release a claim, start work, post updates/photos/hours,
  and submit completion evidence for review. Claims and status transitions lock
  the report row while status, timeline, and notifications are updated.
- Give administrators a restricted dashboard to approve or reject completion
  evidence, manage volunteer access, and review submitted report flags.
- Keep completion evidence in the report timeline. An independent administrator
  must approve it before the report becomes Resolved.
- The report lifecycle is `New → Claimed → In Progress → Pending Verification
  → Resolved`; rejected evidence returns the report to `In Progress`.
- Create in-app notifications for report events and locally detected
  milestones, and mark notifications read. The app does not send email or SMS.
- Upload photos to a private `cs-report-photos` Storage bucket. Signed URLs let
  authenticated users view community report photos; the database stores object
  paths, not base64 photo contents.

There is **no demo-data or localStorage-backed account/report mode**. Local
storage holds only display-location and selected-view preferences. The
in-progress report draft exists in memory in the current tab and is lost on
reload or tab close. Reports and profiles are not cached for offline use.

### Not implemented / important workflow limits

- There is no in-app way to create administrator accounts; the project owner
  must bootstrap the first administrator directly in Supabase.
- The administrator dashboard lists flags, but does not yet include a
  flag-resolution/dismissal workflow.
- `near` notification preference is represented in settings/schema, but no
  nearby-report notification producer is implemented.
- Reports, report descriptions/timeline notes, coordinates, public display
  names/roles, and report-photo paths are publicly readable. The bucket itself
  is private and Storage reads require an authenticated user; signed photo URLs
  expire after one hour. Do not enter sensitive personal information in public
  report content.

## Framework, runtime, and dependencies

- **Frontend:** static HTML, CSS, and ordered classic JavaScript files.
- **Build:** Node.js built-ins only; no `package.json`, package manager install,
  bundler, or application server.
- **Build command:** `node scripts/build.js`
- **Output directory:** `dist/`
- **Vercel Node.js runtime:** use **24.x** for the configured Vercel project.
  The build uses `fs.cpSync`; Node.js 16.7+ supports that API, but local setup
  below uses Node.js 20+.
- **Serving locally:** Python 3's built-in HTTP server serves the generated
  static output; Python is only needed for that local serving command.

Leaflet, Supabase JS, fonts, and Leaflet CSS are loaded from CDNs. Map tiles,
place search, reverse geocoding, and directions use external providers (Esri
with OpenStreetMap tile fallback, Nominatim, and OSRM). Those integrations
require network access and are not operated by CS Society.

## Local setup and build

Prerequisites: Node.js 20+, Python 3, and access to the intended Supabase
project's public project URL and **anon/publishable key**.

From the project root:

1. Copy the placeholder environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` and provide:

   ```dotenv
   # Public Supabase URL (also supports SUPABASE_URL)
   VITE_SUPABASE_URL=https://your-project-id.supabase.co

   # Public Anon / Publishable Key (also supports SUPABASE_ANON_KEY)
   VITE_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key

   # Optional: Secret Service-Role Key (For server-side maintenance only; NEVER public)
   # SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key
   ```

   Obtain these values from your Supabase project's API settings (**Project Settings → API**).
   Use only the project URL and public anon/publishable key for browser builds. Never
   use a database password, service-role key, or secret key in browser code or in
   any public variable. The build script automatically enforces this check and
   refuses to bundle any key with `service_role` claims.

3. Verify Supabase connectivity and schema health:

   ```powershell
   node scripts/check-connection.js
   ```

   This automated test suite verifies:
   - Environment variable format and anon key security
   - Supabase REST API reachability
   - Public community table read access (`cs_reports`, `cs_profiles`, `cs_report_events`)
   - Row Level Security (RLS) enforcement on private tables (`profiles`, `cs_profile_roles`, `cs_profile_settings`, `cs_notifications`)
   - Stored procedure / RPC function registration (`cs_create_report`, `cs_transition_report`, `cs_save_my_profile`, etc.)
   - Storage bucket (`cs-report-photos`) private signing endpoint
   - Build-time secret leak prevention in `dist/app-config.js`

4. Build and serve:

   ```powershell
   node scripts/build.js
   py -m http.server 8000 --directory dist
   ```

5. Open <http://localhost:8000>. Device location requires browser permission.

The build reads `VITE_SUPABASE_URL` / `SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
from the process environment or `.env`. It validates the URL, enforces HTTPS, and strictly refuses
placeholder values and service-role/secret keys. The generated `dist/app-config.js`
contains only the public URL and key and is browser-readable; it is not a place for secrets.
The checked-in `.gitignore` excludes `.env` files, build output, dependencies, and Vercel's
local project link while allowing the safe `.env.example` template.

## Supabase setup

### Inspect first; migrations are manual

The repository contains three ordered SQL migrations:

1. [`supabase/migrations/20261004120000_initial_schema.sql`](./supabase/migrations/20261004120000_initial_schema.sql)
2. [`supabase/migrations/20261004140000_profiles_auth.sql`](./supabase/migrations/20261004140000_profiles_auth.sql)
3. [`supabase/migrations/20261004160000_private_photos_verification.sql`](./supabase/migrations/20261004160000_private_photos_verification.sql)

The first creates the existing `cs_*` report/profile/settings/event/notification
tables, functions, policies, Auth trigger, and photo bucket configuration. The
second depends on the first; it adds `public.profiles` and protected role
assignments, replaces the Auth trigger and profile functions, and backfills
profile rows. Its backfill does not overwrite existing `profiles` rows. It
deliberately stops if `public.profiles` or `public.cs_profile_roles` already
exists. The third makes the photo bucket private, replaces volunteer
self-enablement with administrator-granted roles, and adds the atomic
completion-photo verification workflow.

Before running these migrations on an existing project:

1. Inspect existing tables, columns, constraints, triggers, grants, RLS
   policies, Auth users, volunteer assignments, and Storage bucket configuration.
2. Review all three migrations against those findings; do not run them blindly or
   against a shared/production database.
3. Apply the migrations in the listed order in a disposable Preview/staging
   project first. The repository has no `supabase/config.toml` or automated
   migration runner; use the Supabase SQL Editor or your reviewed migration
   process to execute them. Do not serve the app to users until all three
   migrations are complete and the first administrator is bootstrapped.
4. If the third migration stops because volunteer role rows already exist,
   review them in staging and explicitly remove unapproved assignments before
   retrying. The migration fails closed instead of silently deleting role data.
5. Test signup, report and photo operations, administrator decisions, role
   restrictions, and two-user RLS behavior in staging before considering Production.
6. Apply to Production only after reviewing the resulting schema/data impact.

For an existing deployment that still serves photos through public URLs, deploy
the signed-URL frontend first, then apply the private-bucket migration. This
avoids breaking photo display for users still on the older app revision.

**Existing role data warning:** the second migration initializes/backfills
`cs_profile_roles` with resident access and resets the legacy
`cs_profiles.roles` cache to resident. The third migration refuses to continue
if `cs_profile_roles` contains volunteer assignments, because the earlier app
allowed self-enablement and those rows are not verified administrator grants.
Review and explicitly remove unapproved rows in staging before retrying. Do
not run these migrations where preserving role assignments is required without
first adapting and reviewing them.

After applying all migrations to staging, bootstrap the first administrator
manually using a verified Auth user UUID in Supabase SQL Editor. Do not expose
this operation through the app:

```sql
insert into public.cs_profile_roles (user_id, role)
select id, 'admin'
from auth.users
where id = 'REPLACE-WITH-VERIFIED-AUTH-USER-UUID'::uuid
on conflict (user_id, role) do nothing;
```

The trigger updates the community role cache. Administrators can subsequently
grant or remove volunteer access in the dashboard. No app function can grant
administrator access.

Vercel builds do not apply database migrations. No migration has been confirmed
as applied by this repository workflow.

A read-only schema inspection result shared during the 2026-10-04 audit showed
no matching app tables, policies, triggers, profile functions, or grants in
the supplied Production project; the inspected RLS output contained only
Supabase's built-in `storage.objects` table. This is a point-in-time result for
that project, not evidence about Preview/staging or later schema changes.
Re-run the inspection against each target immediately before migration.

### Auth, authorization, and Storage

- In Supabase **Authentication → URL Configuration**, set the site URL and add
  the exact localhost, Production, and Vercel Preview redirect URLs used by
  password reset. Email confirmation settings determine whether signup returns
  a session immediately.
- The Auth-user trigger creates a resident profile using only safe name
  metadata. Passwords, email addresses, tokens, and user-provided role metadata
  are not copied into the profile row.
- `public.profiles.id` references `auth.users.id`. The frontend queries it by
  the verified Auth user's UUID; database writes derive identity from
  `auth.uid()`. RLS allows authenticated users to read/update only their own
  private profile row. Editable fields are limited to display name,
  neighborhood, and avatar path; the ID is immutable.
- `cs_profile_roles` has RLS enabled and no direct client grants/policies. The
  public `cs_profiles.roles` value remains a community-readable compatibility
  cache; trusted functions keep it synchronized.
- Report status transitions use a `security definer` database function with a
  fixed search path. It locks the report row and validates current status,
  ownership, volunteer role, note/photo ownership, and allowed transition
  before writing the timeline and notifications in the same transaction.
- The private `cs-report-photos` bucket allows JPEG, PNG, and WebP up to 5 MiB.
  Authenticated uploads are limited by Storage RLS to the uploader's UUID
  folder. Authenticated users can create signed read URLs for community photos;
  anonymous users cannot view photos. Database records contain Storage paths.
- Completion requires a volunteer note and photo. The report enters
  `Pending Verification`; an administrator other than its reporter/assigned
  volunteer must approve it to reach `Resolved` or reject it back to
  `In Progress`. The database serializes decisions, appends timeline history,
  and notifies the reporter, volunteer, and administrators in the same
  transaction.
- `cs_profile_roles` has RLS enabled and no direct client writes. Admin roles
  are bootstrapped out of band by the project owner. Only admins can grant or
  remove volunteer roles through a protected function; users cannot self-promote.
- Browser configuration uses only the public anon/publishable key. There is no
  server function or service-role credential in this static app.

### Pre-migration inspection query

[`supabase/inspect/profile-schema-inspection.sql`](./supabase/inspect/profile-schema-inspection.sql) is a read-only query (it changes nothing) that returns the existing profile tables, RLS state, policies, triggers, grants and photo-bucket settings as one JSON document. Run it in the Supabase SQL Editor of each target project before applying the migrations. It lives outside `migrations/` on purpose so migration tooling never tries to apply it.

### Environment files and secrets

- Only `.env.example` is meant to be committed. `.gitignore` ignores every other `.env*` file, `dist/` and `.vercel`.
- `vercel env pull` writes `.env.local`, which can contain a short-lived `VERCEL_OIDC_TOKEN`. Do not zip, commit or share it.
- Make sure `VITE_SUPABASE_URL` points to the same Supabase project in `.env`, in Vercel, and in any MCP/CLI configuration (`.mcp.json` `project_ref`) for the environment you are working in.

## Vercel deployment

Configure the Vercel project for this repository:

- **Root Directory:** `./` (repository root)
- **Framework Preset:** Other
- **Build Command:** `node scripts/build.js`
- **Output Directory:** `dist`
- **Node.js Version:** 24.x
- No dependency install is required; if the project requires an explicit
  install command, use `true`.

`vercel.json` sets the build/output paths and rewrites direct paths to
`index.html`. App navigation itself uses hash routes.

Set these variables in **Project Settings → Environment Variables**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Set Production values only for Production deployments, using the Production
Supabase project. Set Preview values only for Preview deployments, using a
separate staging Supabase project. Never reuse Production credentials/data for
Preview. Vercel's `VERCEL_ENV` is copied into the generated runtime config and
the app displays a Preview badge for Preview builds. Rebuild after changing
variables. Configure the intended Production branch in Vercel Git settings so
pull requests and non-production branches produce Preview deployments.

### Deployment status known during this audit

An earlier source revision was reported Ready in Vercel Production at
`https://cssociety1.vercel.app` on 2026-10-04 and that alias returned the app
HTML through an authenticated Vercel CLI request. The deployment uses Vercel
deployment protection. **The current working-tree changes have not been
deployed or re-verified**, and anonymous/public access has not been confirmed.
Production and Preview environment variable values and their Supabase project
separation have not been independently inspected in this repository audit.

### Current account-access checkpoint (2026-10-04)

- The authenticated Vercel CLI account is `chandrucs2430`. Its linked project
  ID is `prj_8BIAYjMerbOVfsnpleLZ1fGGzesj`, matching the project ID supplied for
  this setup. Vercel currently reports the project name as `cssociety` (under
  `cs-tech2`), rather than the supplied name `cs2`.
- Vercel reports Root Directory `CS society`, Framework Preset `Other`,
  Build Command `node scripts/build.js`, Output Directory `dist`, and Node.js
  Version `24.x`.
- The names `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present in
  both Vercel Production and Preview configurations. Their values were not
  read or printed, so the Production-to-Production and Preview-to-staging
  mappings are **not verified**.
- No Supabase CLI or authenticated Supabase project connection is available
  in this environment. The staging project reference and its current schema
  therefore remain unconfirmed. No Supabase SQL was run, no migrations or
  Auth settings were changed, and no admin role was granted.
- No Preview deployment was created or tested during this setup attempt. The
  current changes remain undeployed; no new Production deployment or alias
  verification is claimed.

## Project structure

```text
index.html                 Static document and ordered script loading
assets/                    Logo and favicon
styles/app.css             Application styles
scripts/
  backend.js               Supabase Auth, queries, RPCs, Storage operations
  build.js                 Static build and public runtime config
  check-connection.js      Automated Supabase connection, schema, and RLS test suite
  state.js                 In-memory UI state
  domain/                  App vocabulary and helpers
  ui/                      Shared icons and cards
  screens/                 Hash-route screen implementations, including admin
  maps.js                  Map, geolocation, search, and directions
  router.js                Hash routing and unknown-route handling
supabase/migrations/       SQL schema, triggers, RLS, functions, Storage policies
supabase/inspect/          Read-only SQL for inspecting a target project before migrating
vercel.json                Static output and rewrites
.env.example               Public-key placeholders only
```

Screen scripts are classic scripts and share global state/helpers; keep their
load order in `index.html`.

## Verification and limitations

Checks run for this repository change are recorded in the accompanying task
report. There is no `package.json`, automated test suite, or Supabase CLI
configuration in the app directory. A successful local static build only
checks asset copying and build-time environment validation; it does not verify
database connectivity, migrations, Auth, RLS, Storage, or production
environment separation.

The schema/RLS/function review is a source audit, not a live authorization
test. Test two distinct authenticated users and an independently bootstrapped
administrator in staging to verify profile and notification isolation, report
ownership, serialized claims, completion-photo submission, independent approve
and reject decisions, volunteer access changes, private signed photo links,
flag visibility, and sign-out/account-switch cleanup. Unknown hash routes render
the app's not-found view; offline state does not provide cached reports or
account details.
