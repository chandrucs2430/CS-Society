# CS Society demo

This is a browser-only community issue reporting demo. It has no backend,
database, package manager, build step, or real authentication service.

## Run locally

From this folder, start a static web server:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000> in a browser. A local server is recommended
over opening the HTML file directly because the app loads its map library,
fonts, and map tiles from external hosts. Internet access is needed for those
resources; the rest of the interface and app data are local.

## Project structure

```text
index.html                   HTML shell and shared navigation/dialogs
styles.css                   Responsive styles, themes, and map styling
assets/
  favicon.png                Original embedded favicon
  logo.jpg                   Original embedded CS Society logo
src/js/
  core.js                    DOM helpers and app-wide constants
  data.js                    Categories, statuses, sample data, persistence
  domain.js                  Issue, notification, photo, and milestone rules
  maps.js                    Leaflet setup, map geometry, and map markers
  ui.js                      Shared page shell, dialogs, photo UI, validation
  router.js                  Hash routes and shared navigation chrome
  components.js              Reusable issue cards and impact totals
  init.js                    Event setup and initial route
  views/
    home.js                  Home screen
    solve.js                 Search, filtering, and map/list screen
    report.js                Multi-step report submission
    issue.js                 Issue detail and volunteer actions
    profile.js               Resident/volunteer profile and settings
    notifications.js         In-app notifications
    impact.js                Sample charts and activity
    auth.js                  Simulated sign-in, sign-up, and setup flows
```

The JavaScript files are loaded as ordered classic scripts. This intentionally
preserves the original app's shared top-level state and initialization behavior
without introducing a framework or build system. Keep the script order in
`index.html` intact when adding scripts.

## Demo behavior and limitations

- State uses the existing `good-neighbor-demo-v2` localStorage key and version
  2 data shape. The profile, reports, timeline entries, notification records,
  flags, and report counters stay in this browser.
- Sign-in and account setup are simulated. Any accepted demo credentials work;
  there are no accounts, sessions, or password recovery service on a server.
- Photo selection and profile photos are resized and stored in browser data;
  they are not uploaded. Sample report photos are generated SVG placeholders.
- Reports, impact totals, notifications, and the volunteer claim simulation
  are demo data/behavior, not a live community service or verified outcomes.
- The map keeps the existing Leaflet integration, loading the library from
  cdnjs, trying Esri street tiles, then falling back to OpenStreetMap tiles.
  Map interactions and geolocation depend on browser support, permissions,
  connectivity, and secure-context rules.
- Google Fonts are optional; system font fallbacks are defined in the CSS.

The legacy input, `index (7).html`, is retained unchanged as a reference copy.
