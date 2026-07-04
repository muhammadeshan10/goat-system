# GOAT System v3 → Full Redesign — README

## 0. Do this first: hosting (this matters more than it looks like it does)

Opening `goat_system_v3.html` directly on your phone (`file://`) will **not** give
you the real installed-app experience. Service workers require a secure
context (HTTPS or `localhost`) — from a raw file, the service worker silently
fails to register, meaning no offline caching and no real "installed app"
behavior. Add-to-homescreen from a raw file just makes a bookmark shortcut
that still opens inside Chrome's UI, not a standalone app.

**The fix costs five minutes and is free: GitHub Pages.**

1. Create a new GitHub repo (public or private both work for Pages).
2. Upload all 6 files from this delivery into the repo root, keeping the
   names exactly as given:
   `goat_system_v3.html`, `manifest.json`, `service-worker.js`,
   `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
3. Repo Settings → Pages → Source: `main` branch, `/ (root)` → Save.
4. Wait ~1 minute, then visit `https://<your-username>.github.io/<repo-name>/goat_system_v3.html`
   on your phone.
5. Chrome menu → **Add to Home Screen**. This time it's a real PWA: own
   icon, opens full-screen with no browser chrome, works offline once
   loaded once.

Any other free static host (Netlify, Vercel, Cloudflare Pages) works
identically — GitHub Pages is just the zero-config option.

---

## 1. What's actually new

### Workout system — full rebuild
- **Workout Files** (renameable, unlimited) → **Days** (Day 1..N, add/rename/delete)
  → **Blocks** (single exercise / superset / PAP pair).
- Superset and PAP blocks are visually distinct (cyan vs purple, joined
  card, "+" connector) and each gets **one shared rest timer** per
  completed round — not per individual set, matching how you'd actually
  train a superset.
- PAP pairs are hard-capped at exactly 2 exercises in the builder UI —
  can't create one with 1 or 3+.
- Every exercise has a unit toggle: **reps** or **time** (seconds), for
  things like dead hangs and farmer's carries. Weight input stays visible
  but optional on time-based exercises, since weighted carries still need
  a load number even though the primary metric is duration.
- Rest timer is drift-corrected — it stores an absolute end-timestamp and
  recomputes from `Date.now()`, so backgrounding the tab or locking your
  phone doesn't desync it. **Honest limitation**: a website cannot access
  Android's OS-level alarm scheduler. If your screen is fully locked and
  Chrome gets suspended by the OS, the alert fires the instant you return
  to the tab, not necessarily while it's in your pocket. That's a hard
  platform ceiling, not a shortcut I took — no browser-based timer can
  clear it without a native app.

### Exercise Tracker (new "Progress" tab)
- The moment you add an exercise to any workout day, it auto-registers a
  tracker — shows up in Progress immediately, even before you've logged a
  single set.
- PR detection is automatic: reps-based PR = best Epley-estimated 1RM
  (`weight × (1 + reps/30)`), so a higher-rep set at slightly less weight
  can correctly beat a low-rep near-max attempt. Time-based PR = longest
  duration logged.
- Weekly-bucketed trend chart per exercise, gold dot marks the all-time
  PR point.
- Hitting a PR fires a banner + awards +25 XP, and also **auto-updates
  your Ranks page** if the exercise matches one of the 7 core barbell
  lifts tracked there (Deadlift, Bench, Squat, OHP, Pull-up, Clean, RDL) —
  log a heavy set during a real workout, your Ranks PR updates without
  separate manual re-entry. Manual entry on the Ranks page still works
  independently either way.

### No exercise library, no animation dependency
The old version gated exercises behind a hardcoded list of ~30
pre-built entries with muscle-diagram animations — anything not on that
list wasn't really usable the same way. That's gone entirely, not just
hidden: the 3D muscle visualizer, its ~190 lines of SVG-generation code,
and the modal that displayed it have all been deleted. Adding an exercise
now is just typing a name — always was in the new builder, but the old
visualizer was still sitting there as a leftover with a "view diagram"
button on Progress cards for the ~30 exercises that happened to match.
Removed on request; zero trace of it left in the code or UI.

### Visual density (Stats page)
- New donut chart: training split by muscle group, computed from actual
  logged sets (not just planned blocks).
- New PR-count bar chart: which exercises you're setting the most records
  on.

### Mobile / Android
- IndexedDB replaces `localStorage` for persistence (higher capacity, more
  durable, survives more cache-clearing scenarios). `localStorage` stays
  as a synchronous safety-net snapshot underneath it.
- Full PWA infrastructure: manifest, service worker, real icons (not
  placeholders) at 192px/512px/apple-touch sizes.
- **Fixed: 5 whole pages were unreachable on mobile.** The original bottom
  nav only fit 5 icons, and Schedule/Tracker/Rewards/Stats/Manage had no
  mobile entry point once the sidebar hides at phone width — this was
  true even before this redesign touched anything. Added a 6th "More"
  button opening a sheet with all five.
- **Fixed: 7px horizontal overflow at 375px and below** (iPhone SE,
  budget Android) — also pre-existing, caused by the topbar's streak/XP
  badges not having a narrow-width fallback. Verified zero overflow now
  from 360px through 428px.

---

## 2. Your existing program — what got migrated vs. what didn't

Your default file, "WORKOUT FOR GOATS — Main," was seeded from your
original `EXERCISES`/`PROGRAMS` data. I only built superset/PAP block
relationships where **your own exercise descriptions explicitly stated
them**:

- **Day 1**: Bench Press + Pendlay Row → superset (your Bench Press
  description said "Superset with Pendlay Row").
- **Day 5**: Zercher Squat is seeded as a **single** block, not paired with
  Broad Jump — even though Broad Jump's own description says it's the
  "PAP contrast with Zercher Squat for Day 5." Broad Jump isn't in Day
  5's actual exercise list in your data, so I matched what you're
  currently training rather than guessing whether that was an intentional
  cut or a dropped exercise. **If it was dropped by mistake, add it back
  as a PAP block in about 10 seconds in the new builder.**

Every other day (2, 3, 4, 6, 7) is seeded as single-blocks. I didn't
invent groupings your data didn't state — regroup any other
superset/PAP pairs yourself in the builder.

---

## 3. Bugs found and fixed along the way

- **XP display was disconnected from its own toasts.** `calcXP()`
  recalculated live from lift PRs + streak + session count and never
  actually read the `S.xp` variable — so the "+10 XP" toast on logging an
  exercise didn't move the number shown in your topbar. Fixed: `S.xp` is
  now genuinely additive for the things that have no structural
  equivalent (per-exercise log, PR bonus), and the structural formula no
  longer double-counts session completion on top of it.
- **A duplicate `renderWorkoutPage()` definition** (old + new) meant the
  old one silently won and the new Workout page rendered as a blank
  screen — caught by actually loading the page in a real browser rather
  than trusting the code by inspection.
- **`endWorkout()` got accidentally deleted** along with genuinely dead
  legacy code sitting next to it during cleanup — caught by a full
  session-completion test throwing `endWorkout is not defined`, then
  fixed by recovering the exact original from your uploaded file (not
  reconstructed from memory) and re-applying the XP fix on top.
- **Weight input was fully hidden (`display:none`) for time-based
  exercises**, which silently broke the ability to log load for weighted
  carries even though the tracker's own PR display already expected a
  weight value for them. Now visible-but-optional.

All of the above were caught by actually running the app in a headless
Chromium instance and clicking through it — not by reading the code and
assuming it worked.

---

## 4. Known simplifications (deliberate, not oversights)

- **Muscle-group pie chart uses set count, not kg×reps volume.** A
  volume-weighted chart would silently exclude every time-based
  combat/conditioning exercise (most of Days 2/4/6), since they have no
  weight×reps figure. Set count treats both fairly.
- **Time-based PR is duration only**, with weight shown as a secondary
  number when present. A weighted-carry PR that properly trades off load
  vs. duration (e.g., "which is more impressive: 60kg for 40s or 50kg for
  60s?") is genuinely ambiguous and I didn't want to bake in a formula you
  didn't ask for. Easy to extend later if you want it.

---

## 5. Files in this delivery
| File | Purpose |
|---|---|
| `goat_system_v3.html` | The app itself |
| `manifest.json` | PWA manifest — needed for real "installed app" behavior |
| `service-worker.js` | Offline caching — needed for the app to work with no signal |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Real app icons, not placeholders |

All 6 files need to sit in the same folder/repo root for the manifest and
service worker's relative paths to resolve correctly.
