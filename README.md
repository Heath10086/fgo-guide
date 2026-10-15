# Chaldea Field Guide

A Fate/Grand Order (FGO) character lookup web application. The project uses a vanilla HTML, CSS, and JavaScript frontend with a Vercel Function backend, and retrieves character data from Atlas Academy.

## Architecture

| Location | Responsibility | Runs on |
| --- | --- | --- |
| `public/` | Pages, styles, search, cards, and interactions | The browser |
| `api/atlas.js` | Validate requests, fetch Atlas data, and prepare responses | Vercel's servers |
| `vercel.json` | Configure the public directory and rewrite the three API routes | The Vercel platform |

Data flow: browser → `/api/...` → Vercel Function → Atlas Academy → JSON response → page.

The backend is a single Vercel Function; Express is not used. The frontend and backend are deployed together on Vercel.

The Atlas Academy API does not require an API key. Clients can inspect API URLs and JSON responses, but backend code is not delivered as browser JavaScript. Because this repository is public, no secrets should be stored in source code. If credentials are introduced in the future, they must be stored in server-side environment variables and never exposed in source code, API responses, or `public/`.

## Local Development

Prerequisites: Node.js 22 and npm.

Open the entire `fgo-guide` folder in VS Code and run the following command in the terminal:

```sh
npm start
```

When you see `Ready! Available at http://localhost:3000`, open that address. Keep the terminal running; press `Ctrl+C` to stop.

Alternatively, select **Terminal → Run Task → FGO Guide: Vercel local preview**.

Notes:

- `npm start` uses a pinned version of the Vercel CLI through `npx`. It runs the same function entry point as the deployed website, rather than a custom Express server.
- Local tooling requires Node.js 22 and npm. The application has no Express or other application dependencies. CLI dependencies are stored in the tool cache, not installed inside the project.
- On a new computer, you may need to run `npx --yes vercel@64.0.2 login` and link the existing Vercel project.
- If port `3000` is already in use, stop the previous preview before starting another one.
- If macOS reports `EMFILE: too many open files, watch`, run `CHOKIDAR_USEPOLLING=1 npm start`.
- Go Live cannot run the backend by itself. The existing Live Server configuration forwards `/api` to port `3000`, so the Vercel preview must already be running. Opening port `3000` directly is recommended.
- Refresh after editing a page. Character data, Japanese names, and images require an internet connection.

## Frontend Structure

| File (relative to `public/`) | Responsibility |
| --- | --- |
| `index.html` / `servant.html` | Homepage / shared character detail template, with characters selected using `?id=1` |
| `style.css` / `home-editorial.css` | Base styles, cards, and profiles / homepage-only editorial styling |
| `js/api.js` | Requests, timeouts, and in-page caching |
| `js/main.js` / `js/search.js` | Homepage cards and filters / name matching and autocomplete |
| `js/servant.js` | Character information, skills, and Noble Phantasms |
| `js/japanese.js` / `js/daily.js` | Japanese names / daily discovery and on-demand loading |
| `js/select.js` | Consistent class and rarity dropdowns |
| `js/onboarding.js` / `js/navigation.js` | Introductory tour / floating navigation that starts open and can be closed manually |

## API

| GET route | Response |
| --- | --- |
| `/api/servants` | Basic list of available NA characters |
| `/api/servant?id=1` | Character details; accepts collection numbers and internal IDs |
| `/api/japanese-names` | Japanese name list containing only id/name pairs |

`vercel.json` rewrites these three routes to `api/atlas.js`, using the `resource` parameter to select the operation. Frontend API URLs remain unchanged.

You can also test `/api/atlas?resource=servant&id=1`.

The backend only contacts the fixed Atlas host and does not accept arbitrary proxy URLs. It supports `GET` and `HEAD`, validates positive integer IDs, and rejects duplicate routing parameters.

Successful responses include cache headers; errors are not cached. Atlas requests have a 15-second timeout.

## Testing

```sh
npm test
```

Tests use Node's built-in test runner. They require no third-party testing libraries, do not call the real API, and do not deploy anything.

`test/api.test.js` covers route configuration, list filtering, Japanese name response trimming, IDs, invalid requests, error handling, and `HEAD` requests.

In the local preview, also check:

- Artoria search
- Class and rarity filters
- Expanding and collapsing the three daily cards
- Character profiles
- The introductory tour
- Navigation controls

`/api/servant?id=abc` should return `400`. `/package.json` and `/.env.local` must not expose source code or environment configuration.

## Deployment

- Live website: https://fgo-guide.vercel.app/
- Source repository: https://github.com/Heath10086/fgo-guide

Commit the project from its root directory. The existing Vercel project is connected to this repository's `main` branch, so pushing commits triggers automatic deployment.

Workflow: edit locally → test locally → Git commit → Git push → check the Vercel deployment.

Use this repository's `vercel.json`: Framework is Other (`null`), static output is `public`, and there is no build step. The Express preset is not used.

The frontend and backend do not need separate repositories or domains.

`.gitignore` excludes `.env*`, `.vercel/`, tool dependencies, and logs. `.vercelignore` also excludes tests and editor configuration from deployment uploads.

`.vercel/` stores local project-linking information, and `.env.local` contains local environment configuration. Neither should be shared. Secret values are not included in this document.

## Data Behavior and Scope

Search fetches the character list first, then matches names in the browser; it does not request Atlas data for each keystroke. Japanese data only supplies names and is not mixed with NA combat statistics.

Daily characters are discovery suggestions, not validated team compositions. Alternate skill and Noble Phantasm versions are not additional abilities equipped simultaneously. This project is not a damage simulator.

Data sources and character asset attribution are listed in the page footer.
