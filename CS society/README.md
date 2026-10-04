# CS Society

CS Society is a browser-only community issue-reporting demo. It has no backend,
database, real authentication, or server-side notification delivery.

## Run locally

Use a static HTTP server from this directory (recommended for browser
geolocation and consistent `localStorage` behavior):

```powershell
Set-Location 'C:\gn\CS society'
py -m http.server 8000
```

Then open <http://localhost:8000>. Python is only used to serve the static files;
there is no package manager, build step, or application server.

The page also depends on external network resources for fonts, Leaflet, map
tiles, place lookup, and route lookup. Some features are unavailable when those
resources cannot be reached. Browser location requires the user's permission.

## Project structure

```text
index.html
assets/
  favicon.png
  logo.jpg
styles/
  app.css
scripts/
  core.js
  state.js
  domain/
    vocabulary.js
    helpers.js
  ui/
    icons.js
    cards.js
  maps.js
  shell.js
  router.js
  recovery.js
  screens/
    home.js
    solve.js
    report.js
    issue.js
    profile.js
    notifications.js
    impact.js
    auth.js
  main.js
  splash.js
```

The page keeps the original hash routes: home (`#/`), reports (`#/solve`),
report creation (`#/report`), issue detail (`#/issue/:id`), profile (`#/me`),
notifications (`#/notifications`), impact (`#/impact`), and sign-in/profile
setup (`#/auth`). Screen files register their renderer with the shared router.
Unknown hashes open a not-found recovery screen. Connectivity, location,
sign-in, access, map-load, and unexpected-error recovery screens are handled by
`scripts/recovery.js`; map lifecycle and retry behavior remain in
`scripts/maps.js`.

The scripts are intentionally loaded as ordered classic scripts, not ES
modules: the existing app uses shared top-level state and helpers across
screens. Keep their order in `index.html` when moving code; no bundler or
framework has been added.

## Demo behavior and data

- Sign-in and resident/volunteer roles are simulated in this browser.
- Reports, profile details, preferences, notifications, and progress are stored
  in `localStorage` under `cs-society-live-v1`; clearing site data or using a
  different browser/device will not share them.
- Selected photos are resized in the browser and stored as data URLs in that
  local state. There is no upload service.
- A fresh browser state starts with no reports; dashboard and impact totals
  are calculated from locally saved activity and therefore start at zero. The
  reset control restores that initial demo state.
- Leaflet is loaded from cdnjs. The map uses Esri tiles with an OpenStreetMap
  tile fallback; place search/reverse lookup uses Nominatim, route requests use
  the public OSRM routing endpoint, and the Google Maps link opens an external
  directions page. These are external demo integrations, not app-owned
  production services.

A production phase would need explicit service interfaces for account/session
management, issue and timeline persistence, photo uploads, notifications,
moderation/flags, and trusted geospatial search/routing. None is implemented
here.
