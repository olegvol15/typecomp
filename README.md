# Typecomp

A real-time typing competition platform. Players join a global room, type the same sentence within a 60-second round, and race each other live.

**Live demo:** https://typecomp.vercel.app

---

## How to use

1. **Create an account** — open the live demo, enter any email and password (no strict validation).
2. **Pick a username** — you'll be redirected to a one-time onboarding screen where you choose your display name.
3. **Race** — you land on the main page. A 60-second round is always running. When the timer is above 0, start typing the sentence shown — the input activates automatically.
   - Characters turn **green** when correct and **red** when wrong.
   - Your live WPM, accuracy, and character count are shown below the input.
4. **Leaderboard** — the table below the input updates in real time as other players type. Your row is highlighted in blue. Click any column header to sort; use the page-size selector to show more rows.
5. **All-time rankings** — below the per-round leaderboard you'll find an aggregated rankings table showing every player's best WPM, average WPM, average accuracy, and total race count across all finished rounds. Sortable and paginated the same way.
6. **Next round** — when the timer hits 0 your result is saved automatically. The next round starts within a second with a new sentence.

---

## Architecture

### Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSR auth guards, API routes, and client components in one repo |
| Database + Auth | Supabase (Postgres + Auth) | Managed Postgres with RLS, built-in magic link auth, and Realtime |
| Real-time | Supabase Realtime (presence + broadcast) | No separate WebSocket server needed; fits the single-repo constraint |
| Server state | TanStack Query | Stale-while-revalidate for round fetching; clean cache invalidation on round end |
| Table | TanStack Table | Headless — full control over sort, pagination, and URL-sync without fighting a styled library |
| Styling | Tailwind CSS v4 | Utility-first, no runtime CSS-in-JS overhead |
| Validation | Zod | Runtime validation on every incoming broadcast payload |

### Folder structure

```
src/
  _components/
    ui/          # Generic, reusable primitives (ProgressBar, Pagination)
    layout/      # Shell pieces (Header, LogoutButton)
    game/        # Domain components (RacePage, LeaderboardTable, RankingsTable, TypingInput, RoundTimer)
  app/           # Next.js routes only — no logic, no heavy components
  hooks/         # use-current-round, use-race
  lib/           # External adapters (Supabase clients, auth guard, profile helper)
  types/         # Shared TypeScript types (database rows, race domain)
  utils/         # Pure functions (stats, throttle, cn, format, url)
```

### Round engine (`POST /api/rounds/ensure`)

The endpoint is idempotent: it returns the active round if one exists, or atomically creates the next one.

Race-condition safety relies on the `unique(round_number)` database constraint. If two requests race on creating the same round, the loser catches the `23505` Postgres error and falls back to a plain `SELECT` of the winning row — no advisory locks needed.

Sentences rotate in insertion order: `sentence_index = (round_number - 1) % sentence_count`.

### Real-time layer (`use-race.ts`)

A single Supabase channel `race:global` handles everything:

- **Presence** — each client tracks `{ userId, username }`. On `sync`/`join`, any user not yet in the local players map gets a blank row immediately, so all online players appear even before they type.
- **Broadcast** — typing updates are throttled to ~120 ms to avoid flooding the channel. Every incoming payload is validated with Zod before touching state.
- `broadcast: { self: false }` means a user never receives their own updates. Self-stats are injected directly from local state into the leaderboard so the current user's row always reflects their live typing.

### Metrics

```
correctChars = positions where typed[i] === sentence[i]
accuracy     = correctChars / sentence.length          (0–1)
wpm          = (correctChars / 5) / (elapsedSeconds / 60)
             = 0 when elapsedSeconds < 1
```

Position-based correctness means only characters typed in the right slot count — consistent with standard typing test conventions.

### Persistence

Results are written to `round_results` via upsert on `(round_id, user_id)` in two cases:
1. The player completes the sentence (all characters correct) — immediate write.
2. The 60-second timer expires — write whatever the player reached.

During a round, stats travel only over the realtime broadcast channel — no per-keystroke DB writes.

### All-time rankings

The home page fetches all finished `round_results` rows server-side and aggregates them in JS into per-player stats: best WPM, average WPM, average accuracy, and total race count. The resulting `RankingsTable` is rendered below the per-round leaderboard using local component state for sorting and pagination, keeping it decoupled from the leaderboard's URL params.

---

## What I would do next in production

### Testing
- **Unit tests** — `computeStats`, `throttle`, `readTableUrl`/`writeTableUrl` are all pure functions; straightforward to cover with Vitest.
- **Integration tests** — the round engine (`POST /api/rounds/ensure`) is the most critical path; should test the idempotency guarantee and the 23505 race-condition recovery with a real Supabase test project or a mock.
- **E2E tests** — Playwright: two browser contexts on the same round, assert that typing in one appears in the other's leaderboard within 200 ms.

### Security
- Move round creation to a Postgres function (`SECURITY DEFINER`) so the client never needs INSERT on the `rounds` table — the anon key should not be able to write game state.
- Add a `SUPABASE_SERVICE_ROLE_KEY` server-side env var for all API routes to bypass RLS entirely at the server boundary, and lock down client-side RLS to read-only.
- Rate-limit `POST /api/rounds/ensure` per IP (e.g. via Upstash Ratelimit) to prevent flooding.
- Validate `typedText` server-side on persist: cap to sentence length, reject payloads whose `userId` doesn't match the authenticated session.

### Reliability
- The current round-transition has a ~500 ms gap where `secondsLeft = 0` and no new round exists yet. A short "Round over — next round starting…" overlay would remove the jarring freeze.
- If the Supabase Realtime connection drops, the client reconnects automatically but won't replay missed broadcasts. A short polling fallback (React Query `refetchInterval`) during the reconnect window would keep the leaderboard fresh.

### Observability
- Add Sentry for client and server error tracking.
- Log round-creation events and broadcast rates to understand system load.
- Track WPM distribution per round to surface cheating (unrealistically high WPM).

### Performance
- Index `round_results(round_id, wpm desc)` for fast leaderboard queries as result counts grow.
- Cache the active round in Redis/Upstash so `POST /api/rounds/ensure` doesn't hit Postgres on every page load.

### UX
- Username settings page — let users pick their own handle.
- Round history page — per-user breakdown across all rounds (currently aggregated globally in the rankings table).
- Round end screen — brief results overlay before the next round auto-starts.

---

## AI usage

This project was built with [Claude Code](https://claude.ai/claude-code) (Anthropic).

**AI-generated:** the initial scaffolding of all files, Supabase Realtime subscription wiring, TanStack Table column definitions, and the round engine route.

**Written / directed by the developer:** architecture decisions (single channel vs per-round channels, broadcast-only during typing + upsert on end, presence-first player visibility), the race-condition recovery strategy for `POST /api/rounds/ensure`, the `blankPlayer` fix for showing all online users before they type, and the overall folder structure and component boundaries.


---

## Assumptions and simplifications

- **Single global room** — the spec calls for one shared race. Multi-room support would require routing rounds by room ID through the channel name and all queries.
- **60-second rounds hardcoded** — round duration is not configurable; trivial to move to an env var.
- **Username auto-generated** — derived from email prefix + 4-char random suffix. No settings UI to change it.
- **No reconnection replay** — missed broadcasts during a Realtime disconnect are not recovered. Acceptable for a demo; needs a polling fallback in production.
- **Sentences seeded manually** — a small fixed set is inserted via SQL. In production these could be pulled from an external API or managed via an admin UI.
