# streak-maintainer (StreakOS mobile)

## Status
- Phase 1 (foundation): complete and verified (typecheck, unit tests)
- Phase 2 (habits, check-in, Today): complete and verified (typecheck, unit tests).
- Phase 3 (planning and progress): complete and verified (typecheck, 50 unit tests).
- Phase 4 (auth and sync): complete and verified locally (typecheck, 63 unit tests). The Supabase SQL and live sync are NOT yet run against a real project.
- Phase 5 (reminders, settings, data, builds): complete and verified locally (typecheck, 81 unit tests). Not yet run on a device or built with EAS.

## What is here
- Expo Router app with five tabs: Today, Habits, Month, Week, Progress.
- Today: habit progress, streak, level, energy/focus/mood check-in, Big 3, daily review.
- Week: navigable weeks, Weekly Boss Task (+100 XP, issued once), weekly score and rank, Big 3 per day.
- Month: monthly board with status colors, completion percent, and tap-through to a day detail screen.
- Progress: overview, 14-day energy/focus/mood averages, 30-day category completion, achievements.
- Habit screens: Today, Habits (search, category filter), habit details (pause, resume, archive), create and edit form.
- Streakboard design tokens with Light, Dark, and System themes.
- SQLite schema with versioned migrations (`src/db`).
- Pure business rules (`src/domain`): schedules, pauses, per-habit streaks, 80% ceiling threshold, XP, XP reversal on undo, levels, consistency streaks.
- Data layer (`src/data`): SQLite repository and TanStack Query hooks. Completion toggles are optimistic.
- Tests: 50 unit tests across rules, schedules, progress, planning, achievements, analytics, and validation.

## Design decisions
- XP is derived from completion state, not accumulated. Undoing a completion recomputes the day and the XP difference, so rewards cannot duplicate.
- Pausing records a date range. Past days are never rewritten, so pausing does not reduce history.
- Archiving ends scheduling yesterday and keeps history.
- Per-habit `xp_reward` is stored but the engine uses the global 10 XP per completion until the website's rules are confirmed.
- Completions upsert on (habit, date) with an `updated_at` timestamp, which Phase 4 sync will need.

## Run
    npm install
    npx expo start
    npm test
    npm run typecheck

Native builds need a development build (`npx expo run:android` or `npx expo run:ios`) because expo-sqlite and expo-haptics require native code.

## UI (matches the reference recording)
- Today: level bar with LEVEL, STREAK, and PERFECT chips; activity rings for Habits, Big 3, and XP; habit list with "+10 XP each" and a Manage link; check-in, Big 3, and review below.
- Week: habit-by-day board, weekly score bar with rank, boss task card, and Big 3 per day.
- Month: Calendar and Board views. Board shows habits by day, week by week.
- Day: percent ring for habits plus Big 3, Big 3 list, habit list.
- Toasts: "Level N unlocked", "Perfect day · +50 XP", "Boss task done · +100 XP".
- Branding, copy, and the marketing site are our own. The reference app's logo and marketing pages are not reproduced.

## Assumptions to confirm against the website
- Week starts on Monday.
- Weekly score: one point per Big 3 task done, plus 3 for the boss task (max 24). Rank thresholds: 5, 10, 16.
- "Seven-Day" and "30-Day" achievements use the longest consistency streak.
- Boss task reward is 100 XP, issued once per week and removed if undone.
- Each completed Big 3 task awards 10 XP once, removed if undone. This is new in Phase 5 and follows the reference app.
- Daily XP target on the rings is 10 per scheduled habit, plus the 50 perfect-day bonus, plus 30 for Big 3.
- The day ring counts habits plus the three Big 3 slots.

## Phase 4: auth and sync

### Architecture
- Every local write runs in one SQLite transaction together with an outbox row (`sync_queue`). A crash cannot leave a change without its queued op.
- Ops carry full record state and a stable `opId`. The server records each applied `opId` in `applied_ops`, so retries never apply twice.
- Push: `sync_push(ops)` applies ops in order. Upserts are last-writer-wins by client `updated_at`. Rejected ops are reported as conflicts, and the client adopts the server row on the next pull.
- Pull: `sync_pull(p_cursor)` returns rows whose `server_seq` is past the cursor. The cursor is stored in `meta`.
- XP and rewards are still derived on the device. Reward grants and revokes are keyed by `event_id`, so they are idempotent.
- Sign-out is blocked while ops are pending, so unsynced changes are never discarded. Switching accounts on one device clears local data first.
- Sync runs on sign-in, on app foreground, every 30 seconds, and 1.5 seconds after a local change. Failures back off from 2 seconds up to 5 minutes.

### Supabase setup (once)
1. Create a Supabase project. Enable Email auth.
2. Open the SQL editor and run `supabase/migrations/0001_sync.sql`.
3. Under Authentication, URL configuration, add the redirect `streakos://auth/update-password`.
4. Copy `.env.example` to `.env` and fill in the project URL and anon key. Never put the service role key in the app.
5. Restart Expo with `npx expo start --clear` so the `EXPO_PUBLIC_` values are picked up.

### Known limitations
- The SQL migration and live sync are untested against a real Supabase project. Run it and report errors.
- `sync_pull` uses a plain sequence cursor. Under heavy concurrency a row can commit with a lower sequence after the cursor passes it. The migration notes a lag-window fix.
- Per-habit `xp_reward` is not synced. The engine uses 10 XP.
- The password reset deep link needs a dev build with the `streakos` scheme. It does not work in Expo Go.
- Account deletion and data export are Phase 5.

## Phase 5: reminders, settings, data, and builds

### Reminders
- Local notifications only, scheduled with expo-notifications. No push server is needed.
- Types: habit reminders (at each habit's reminder time on its scheduled days, next 7 days), daily check-in, evening review, and weekly planning (choose the weekday).
- Quiet hours can cross midnight. Reminders inside quiet hours are not scheduled.
- Every change cancels the app's pending reminders and schedules the current plan again, so there are no duplicates. Archived habits drop out, and a habit already done today is skipped.
- The plan is capped at 60 scheduled notifications, under the iOS limit of 64.
- The app re-plans when habits, completions, or settings change, and when it returns to the foreground.

### Settings and data
- Settings are stored on the device. Display name is also saved to the Supabase account.
- Week start, date and time format, theme, and accent are applied across the app.
- Export writes all personal data to a JSON file and opens the share sheet.
- Delete account needs a signed-in, online session. It runs `delete_my_account()` on the server, which cascades to all synced rows. Then it clears the device.
- Apply `supabase/migrations/0002_account_delete.sql` after `0001_sync.sql`.

### Build and distribution (EAS)
One-time setup:
1. `npm install -g eas-cli` then `eas login`.
2. `eas init` in this folder. It writes the project ID into app.json.
3. Replace `com.example.streakos` in app.json with your own identifier. Add `assets/icon.png` and `assets/adaptive-icon.png`.
4. Set the EAS secrets for `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, or use an `.env` file in the EAS build.

Builds:
- Development client (APK for internal testing): `eas build --profile development --platform android`
- Installable APK for personal use: `npm run build:android:apk`
- Google Play bundle: `npm run build:android:aab`, then `npm run submit:android`
- iOS: `npm run build:ios` needs an Apple Developer account. EAS manages signing if you let it.

### Store and platform requirements (not handled by code)
- Apple and Google both require a privacy policy URL. Account deletion must also be reachable from the app, which it is.
- iOS and Android allow users to turn notifications off in system settings. The app shows the permission state and does not override it.
- Background reminders are best effort. Battery saver modes and OS limits can delay them.

## Deferred
- Charts: Progress uses simple bars for now. A chart library comes later.
- Confetti animation on milestones. Toasts only for now.
- Timezone: the setting is stored and shown, but dates still follow the device clock. Timezone-aware dates need a refactor.
- Settings do not sync across devices yet.
- Expo Go cannot schedule these notifications reliably. Use a development build.
- Month habit filters.

## Before release
Replace `com.example.streakos` in app.json and add `assets/icon.png` and `assets/adaptive-icon.png`.
