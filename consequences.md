# Consequences — Lessons Learned While Building

A candid record of the mistakes, surprises, and hard-won consequences we hit building the **AI Revenue Recovery Engine**. Most of these are the kind of thing that only surfaces when something fails in CI, a browser, or a container — worth writing down so the next person (or the panel) sees the real engineering behind the polish.

> Format: **Consequence** — what happened → **Why** the root cause → **Fix** we applied, and the **rule of thumb** it taught us.

---

## 1. Frontend dependency drift broke CI

- **Consequence:** CI failed with `Cannot find package '@tailwindcss/vite'` on a clean `npm ci`, even though `npm run dev` worked locally.
- **Why:** `package.json` declared Vite 5 / Tailwind 3, but the actual code and a *stale local `node_modules`* were using Vite 8.2.2 / Tailwind 4.3.3 / `@tailwindcss/vite`. A fresh `npm ci` ignores the stale local install and installs exactly what `package.json` + lockfile say — so the mismatch exploded.
- **Fix:** Aligned `package.json` (`vite ^8.2.2`, `@tailwindcss/vite ^4.3.3`, `tailwindcss ^4.3.3`) with the code and regenerated `package-lock.json`.
- **Rule:** **Never trust `node_modules` as the source of truth.** The lockfile + manifest are. Reproduce build failures with a clean install.

## 2. Lucide icon exports lie in `.d.ts`

- **Consequence:** We swapped `House` → `Home` (and chose other icons) but hit a runtime `X is not defined` / missing-export error despite the TypeScript types claiming an icon existed.
- **Why:** The installed `lucide-react@0.378.0` **runtime bundle** did not export `House`, even though the shipped `.d.ts` types suggested the family of icons. Version drift between types and runtime made the compiler optimistic.
- **Fix:** Grepped the actual runtime bundle `node_modules/lucide-react/dist/esm/lucide-react.js` and only used icons verified present (`Home`, `RotateCcw`, `LogOut`, `KeyRound`, etc.).
- **Rule:** **Verify library exports against the installed runtime bundle**, not the type declarations. Types describe intent; the bundle describes reality.

## 3. Soft failures had no payable recovery link

- **Consequence:** Transient (`SOFT`) failures were scheduled for smart retry but produced **no Razorpay recovery URL**, so a customer who wanted to pay right away couldn't.
- **Why:** `generatePaymentLink` was only invoked on the HARD path; transient events were queued as `SCHEDULED` with no link.
- **Fix:** `DunningRecoveryService.processWebhookPayload` now also generates a real `recoveryUrl` for transient events (`45f8664`); the `EventCard` falls back to the customer-portal deep link instead of `#`.
- **Rule:** Every failure state should leave the customer with **at least one actionable path to pay**, not just a queued background retry.

## 4. Razorpay test-credential fallback returned a 404 link

- **Consequence:** When the Razorpay API itself failed (test creds), `generatePaymentLink` returned a placeholder `https://rzp.io/i/rec_<hash>` that resolved to **404** in the real world.
- **Why:** Hard-coded fake fallback URLs don't point at a real pay page.
- **Fix:** Real short links `https://rzp.io/rzp/...` resolve 200; the placeholder is clearly a degraded-mode stand-in, and the UI prefers the customer-portal deep link when no real link exists.
- **Rule:** Simulated/synthetic links must be **visibly non-authoritative**, or they mislead operators into thinking recovery succeeded.

## 5. CORS preflight was killing authenticated calls

- **Consequence:** `OPTIONS` preflight requests to admin endpoints returned errors, blocking the management UI.
- **Why:** `AdminAuthInterceptor` rejected `OPTIONS` (no API key on a preflight) before the CORS filter could answer it with `Access-Control-Allow-*` headers.
- **Fix:** The interceptor now lets `OPTIONS` through (`09b68d3`), so preflight is answered by the CORS layer; `GET` correctly returns 200 with a valid key and 401 without.
- **Rule:** **Auth filters must never block CORS preflights.** CORS is a browser-transport concern and should be handled before authentication.

## 6. Flyway/DB conventions bit us

- **Consequence:** Initial confusion over the real table/DB names: it's `dunning_events` (singular), in DB `revenue_recovery`. A wrong name = a wired-up app pointing at nothing.
- **Why:** The "obvious" plural/singular guesser (`dunning_event`) disagreed with the actual migration-created schema.
- **Fix:** Confirmed the real names against the migration scripts and used them consistently; never dropped/recreated the live `revenue_recovery` DB.
- **Rule:** **Verify schema names against the migrations**, don't assume. And treat a live Postgres as sacred — never drop.

## 7. `.mvn` offline vs IntelliJ runs

- **Consequence:** `mvn -o` (offline) compiled/tests fine, but the backend was actually run from **IntelliJ** (which uses its own classpath and a different runtime, PID changes each run).
- **Why:** The dev/evolution environment has two valid-but-distinct ways to run; confusing them causes "works in my terminal, not in IntelliJ" (and vice-versa) bugs.
- **Fix:** A documented convention: **backends run from IntelliJ and must be restarted there after any backend source edit**; `.mvn offline` is for fast compile/test verification only.
- **Rule:** Reproduce the app the same way the operator does. The *running* instance is the source of truth, not the best-compiling one.

## 8. Reset/seed wrote to the DB but the UI showed nothing

- **Consequence:** "Nothing is mapping on clicking reset demo" — the backend reset seeded 6 records (history endpoint confirmed them), but the control-room feed never changed.
- **Why two independent things confused it:** (a) the container frontend had **no admin key baked in**, so `reset-demo` returned `401` and the `catch` silently swallowed it; (b) reset bumps `historyNonce` which re-fetches `/history`.
- **Fix:** Baked `VITE_ADMIN_API_KEY` into the frontend image (kept in sync with backend `ADMIN_API_KEY` via a compose build arg), so every admin call carries `X-Admin-Key`; the login screen remains the UX gate on top.
- **Rule:** **Silently swallowed errors are invisible bugs.** Log visibly, and ~never* rely on a static env var for an auth credential the browser must send on every call.

## 9. Docker registry DNS / Maven network flakiness

- **Consequence:** Two distinct Docker build failures: (a) `dial tcp: lookup registry-1.docker.io: no such host` while pulling base images, and (b) `mvn dependency:go-offline` timing out hitting `repo.maven.apache.org`.
- **Why:** (a) Docker Desktop's build DNS/registry access flaked mid-pull; (b) `go-offline` is infamous for aggressively fetching plugins/transitive metadata and timing out on unstable networks.
- **Fix:** For (a) retried / restarted Docker Desktop (the same images pulled fine on the next run). For (b) **dropped `dependency:go-offline`** and built directly with `mvn -B clean package -DskipTests`, adding Maven HTTP retry flags (`-Dmaven.wagon.http.retryHandler.count=3`) for resilience.
- **Rule:** Don't add an "optimization" layer (offline dependency pre-fetch) that's *more fragile* than the thing it caches. Prefer a simple, retry-tolerant build.

## 10. Nginx + SSE needs special config

- **Consequence:** Server-Sent Events through the nginx reverse proxy could buffer/terminate the stream.
- **Why:** Default nginx proxies buffer responses and use a short read timeout — both break a long-lived SSE connection.
- **Fix:** In `nginx.conf`: `proxy_buffering off`, `proxy_cache off`, long `proxy_read_timeout`, HTTP/1.1, and cleared `Connection` header; `location /api/` proxies to the backend.
- **Rule:** Real-time streams and reverse proxies are a classic pairing — remember to disable buffering and extend timeouts, or your "live" dashboard silently stops updating.

---

## The meta-lesson

Almost every consequence here is a **"works locally but not somewhere else"** failure:
- local `node_modules` vs. clean CI install → dependency drift
- dev browser vs. browser → CORS
- terminal Maven vs. IntelliJ runtime → wrong-runner bugs
- local dev loop vs. Docker container → missing baked credentials
- your machine vs. Docker Hub → registry/DNS flakiness

The pattern: **make the "clean" environment the one you validate against.** CI, a fresh `npm ci`, a container build, and the actual running process are the truth. Local convenience state is the thing that lies.
