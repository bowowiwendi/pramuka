# AGENTS.md — morse-pramuka

## Project overview

Single-page app (static HTML + Vercel serverless API) for Indonesian scouting (Pramuka) games.
All game logic, UI, and state live in `index.html` (~1600 lines). No build step, no bundler.

## Key files

| File | Purpose |
|---|---|
| `index.html` | Entire frontend: 3 games + leaderboard + admin (all JS in one `<script>`) |
| `api/score.js` | Vercel serverless API — score CRUD + admin actions |
| `favicon.png` | 32×32 PNG favicon |

## Developer commands

```bash
npm run dev       # vercel dev — serves static + API locally
npm run deploy    # vercel --prod
```

No lint, typecheck, or test scripts exist. Verify by opening in browser.

## Architecture

### Frontend (`index.html`)

All JS is in one `<script>` block. Function order matters for readability but not execution (declarations are hoisted).

**Tabs (panels):**
- `panel-quiz` — Tebak Morse (guess letter from morse code, with sound)
- `panel-input` — Ketik Morse (type morse code for a letter)
- `panel-chart` — Morse reference table
- `panel-semaphore` — Semaphore flag quiz + reference chart (uses Canvas for drawing)
- `panel-leaderboard` — Per-game leaderboards with sub-tabs (`.lb-tab` / `.lb-section`)
- `panel-cerdas` — Cerdas Cermat (25-question multiple choice, 40-min timer)

**Shared UI patterns:**
- Sub-tab system: `.sema-tab` / `.sema-section` (semaphore), `.lb-tab` / `.lb-section` (leaderboard), `.cc-tab` / `.cc-section` (cerdas cermat — removed, now uses main leaderboard)
- **Do not reuse `.sema-tab` or `.sema-section` class names** — they conflict across panels. Use unique prefixes.

### API (`api/score.js`)

ESM (`"type": "module"` in package.json). Uses `export default` handler.

**Game score keys (localStorage + Redis prefix):**
- `morse` / `morseScores` / `morsescore:` — Tebak Morse + Ketik Morse combined (best score)
- `semaphore` / `semaphoreScores` / `semascore:` — Semaphore quiz (best score)
- `cc` / `ccScores` / `ccscore:` — Cerdas Cermat (cumulative — scores add up across plays)

**API routing logic:**
- `POST` with `body.action` in `['list','delete','update']` → admin handler (requires `password`)
- Otherwise → regular score handler (`POST` to save, `GET` to list, `?game=` query param)

**Admin password:** defaults to `admin123`, override via `ADMIN_PASSWORD` env var.

**Redis fallback:** If `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are not set, falls back to in-memory arrays (data resets on cold start).

### Score submission

- `submitGameScore(game, name, score)` in `index.html` handles both localStorage and API POST
- Morse/semaphore: `Math.max` (best score wins)
- Cerdas cermat: `+=` (cumulative across plays)

## Gotchas

1. **`file://` protocol breaks API** — fetch to `/api/score` fails without a server. Use `vercel dev` or deploy.
2. **No `updateTotalScore()` function** — was removed during refactor. Do not re-add or reference it.
3. **Sub-tab class conflicts** — each panel's sub-tabs must use unique class names. The leaderboard uses `.lb-tab`/`.lb-section`, semaphore uses `.sema-tab`/`.sema-section`.
4. **Cerdas Cermat uses player bar name** — no separate name input. If no player name set, shows the name modal.
5. **API uses `req.body` directly** — Vercel auto-parses JSON. No body-parser middleware needed.
6. **Redis uses raw `fetch` calls** — not the Upstash SDK. The REST API format is `/get/{key}`, `/set/{key}`, `/del/{key}`, `/keys/{pattern}`.

## Push workflow

```bash
git add -A && git commit -m "message"
git pull --rebase origin main && git push
```
`gh auth setup-git` may be needed if git credential helper is not configured.
