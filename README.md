# AI Revenue Recovery — Autonomous Smart Dunning Engine

A production-style **Autonomous Revenue Recovery & Smart Dunning Engine** for recurring SaaS payment failures, built with **Java 21 (Spring Boot 3)**, **React + TypeScript + Vite + Tailwind CSS**, **PostgreSQL**, and the **Razorpay** platform (Webhooks + Payment Links).

---

## Table of Contents

- [What It Does](#what-it-does)
- [Architecture](#architecture)
- [Failure Classification](#failure-classification)
- [Recovery Strategies](#recovery-strategies)
- [Lifecycle & State Machine](#lifecycle--state-machine)
- [Resilience Features](#resilience-features)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Backend Reference](#backend-reference)
  - [REST API](#rest-api)
  - [Scheduled Jobs & Async Pipeline](#scheduled-jobs--async-pipeline)
  - [Data Model](#data-model)
  - [Configuration](#configuration)
- [Frontend Reference](#frontend-reference)
- [Getting Started](#getting-started)
- [Demo Walkthrough](#demo-walkthrough)
- [Project Status](#project-status)
- [Known Limitations](#known-limitations)
- [Consequences & Lessons Learned](./consequences.md)

---

## What It Does

When a recurring subscription payment fails, the engine autonomously decides how to recover the revenue:

1. **Ingests** Razorpay webhooks (`payment.failed`, `payment.captured`, `payment_link.paid`) over HTTP with strict **HMAC-SHA256 signature verification** (constant-time comparison).
2. **Classifies** the failure code into *soft/transient* vs. *hard/permanent* categories.
3. **Recovers** via two deterministic strategies:
   - **Soft errors** (`GATEWAY_*`, `*_TIMEOUT`, `SERVER_ERROR`, `BANK_DOWNTIME`) → smart-retry scheduler driven by a **bank-health radar** + **timing engine** (**max 3 retries**, radar-aware backoff, circuit-breaker hold during outages, pre-retry settlement re-check).
   - **Hard errors** (`INSUFFICIENT_FUNDS`, `EXPIRED_CARD`, `AUTHENTICATION_FAILED`, …) → autonomous escalation to a **Razorpay Payment Link** (UPI/Cards/Netbanking supported) + multi-channel dunning notifications (HTML email + SMS/WhatsApp).
4. **Settles** recovered revenue by listening for `payment.captured` / `payment_link.paid` webhooks or a customer one-click checkout resolution, then marks the event `RECOVERED_CUSTOMER_PAID`.
5. **Guards** every path with two-tier idempotency, a deterministic event lifecycle, a **dead-letter queue (DLQ)** with automated backoff reprocessing, and real-time **Server-Sent Events (SSE)** streaming to an operations dashboard.

---

## Architecture

```
                         Razorpay Platform
                    ┌────────┴──────────┐
             webhook │                   │ REST (Payment Links API)
                     ▼                   ▼
        WebhookController          DunningRecoveryService
        (HMAC-SHA256 verify)       generatePaymentLink()
                     │                   ▲
                     ▼                   │ link URL
              IdempotencyGate ───────────┘
        (in-memory lock + DB unique check)
                     │  @Async pipeline
                     ▼
            FailureClassifier
         (soft vs. hard error codes)
             │                       │
             ▼                       ▼
     SmartRetryScheduler      Escalation path
     (@Scheduled poll, 10s)   Payment Link + Email/SMS notify
     backoff 15/30/60s+jitter        │
             │                       │
             ▼                       ▼
        PostgreSQL (dunning_events)  NotificationService
             │                       (HTML email · SMS/WhatsApp sim)
             └───────────┬─────────────┘
                         ▼
               SseStreamService ──SSE ("recovery-event")──▶ React Dashboard
                                                          (KPIs · analytics · audit)

  Failure branch: any exception ──▶ WebhookDlqService ──▶ webhook_dlq_events
                                    (@Scheduled reprocessor, 20s,
                                     backoff 60s/120s, max 3 → DEAD_LETTER)
```

---

## Failure Classification

The classifier inspects Razorpay's `error_code` field on `payment.failed` payloads:

| Category | Matching error codes | Meaning | Strategy |
|---|---|---|---|
| `TRANSIENT_SOFT_FAIL` | code contains `GATEWAY`, `TIMEOUT`, `SERVER_ERROR`, `BANK_DOWNTIME` | Transient infrastructure/bank issues — worth retrying | `SMART_BACKOFF_RETRY` |
| `PERMANENT_HARD_FAIL` | Everything else (e.g., `BAD_REQUEST_INSUFFICIENT_FUNDS`, `CARD_EXPIRED`, `AUTHENTICATION_FAILED`) | Customer-side issues — retrying won't help without intervention | `AUTONOMOUS_PAYMENT_LINK_ESCALATION` |

Unknown codes default to `UNKNOWN_ERROR` and are treated as **hard failures** (fail-safe toward customer outreach rather than silent retries).

## Recovery Strategies

### 1. Smart Backoff Retry (soft failures)

- Event enters `SCHEDULED` status with `retryCount=0`, `maxRetries=3`, first attempt at **+15 seconds**.
- A scheduled poller executes due retries every 10 seconds.
- Backoff schedule per attempt: `15 × 2^(attempt−1)` seconds **+ 0–5 s random jitter** → **≈15s, ≈30s, ≈60s**.
- On success (simulated at ~70% in demo mode): status → `RECOVERED_RETRY_SUCCESS`.
- After exhausting 3 attempts: autonomous escalation — category flips to `PERMANENT_HARD_FAIL`, strategy becomes `EXHAUSTED_ESCALATED_LINK_DISPATCH`, a payment link is generated and dunning email dispatched.

### 2. Autonomous Payment Link Escalation (hard failures)

Fires immediately on classification — no waiting:

- Creates a Razorpay **Payment Link** via the official Java SDK (`razorpay.paymentLink.create`):
  - Amount in paise, currency `INR`, `accept_partial=false`
  - Customer name/contact/email attached
  - `notify: { sms: true, email: true }`, auto-reminders enabled
  - Description: `Payment Recovery for Inv #<paymentId>`
- Stores the resulting `short_url` in `recoveryUrl`.
- Dispatches a styled **HTML dunning email** (subject: *"Action Required: Complete your subscription renewal"*) with a secure CTA button, plus an SMS/WhatsApp notification (through the open-source **Evolution API** WhatsApp gateway when configured; log-simulated otherwise).
- If the Razorpay call fails, a synthetic fallback link is generated so demos keep working end-to-end.

### Settlement paths

A `RECOVERED_ACTION_TAKEN` (or retried) event reaches a terminal paid state via:

1. Razorpay sends `payment.captured` or `payment_link.paid` → engine matches `paymentId`, marks `RECOVERED_CUSTOMER_PAID` (strategy `WEBHOOK_PAYMENT_CAPTURED_SETTLED`), clears pending retries.
2. Customer completes payment in the built-in checkout portal → `POST /api/v1/customer/resolve/{paymentId}` → same terminal state (strategy `CUSTOMER_1CLICK_CHECKOUT_SUCCESS`).

Every transition is persisted and broadcast live over SSE.

---

## Lifecycle & State Machine

```
                 payment.failed webhook (async pipeline)
                                 │
        ┌────────── SOFT ────────┴──────── HARD ──────────┐
        ▼                                                 ▼
    SCHEDULED ◄─── reschedule                        RECOVERED_ACTION_TAKEN
        │            (nextRetryAt =                  (link + email + SMS sent)
        │             now + 15·2^(n−1)s + jitter)           │
        ├── attempt succeeds ──► RECOVERED_RETRY_SUCCESS    │
        │                        (terminal)                 │
        ├── attempt fails, n < 3 ──► stays SCHEDULED        │
        ├── attempts exhausted ──► PERMANENT_HARD_FAIL      │
        │       + RECOVERED_ACTION_TAKEN (escalated link)   │
        │                                                   │
        └─────────── any state ─── payment.captured /  ─────┤
                    with recoveryUrl   payment_link.paid    │
                                       customer resolve     ▼
                                              RECOVERED_CUSTOMER_PAID (terminal)

Dead-letter queue (separate lifecycle for undeliverable webhooks):

    RETRY_PENDING ──(reprocess OK)──► RESOLVED
         │
         └──(3 failed attempts)──► DEAD_LETTER  (parked for engineering inspection)
```

Terminal dunning states: `RECOVERED_RETRY_SUCCESS`, `RECOVERED_ACTION_TAKEN`, `RECOVERED_CUSTOMER_PAID`.

## Resilience Features

| Mechanism | Implementation |
|---|---|
| **Webhook signature verification** | HMAC-SHA256 over the raw payload using `Razorpay-Webhook-Secret`; digest compared to the `X-Razorpay-Signature` header via constant-time `MessageDigest.isEqual`. Invalid/missing signatures → `401 Unauthorized`. |
| **Idempotency (two tiers)** | ① Per-JVM `ConcurrentHashMap.putIfAbsent(paymentId)` blocks concurrent async duplicates; ② `existsByPaymentId` DB check backed by a UNIQUE column drops redelivered events. Settlement webhooks are additionally idempotent (terminal-state guard) so duplicate/out-of-order `payment.captured`/`payment_link.paid` deliveries are safe. |
| **Dead-Letter Queue** | Any exception during webhook processing is captured to `webhook_dlq_events` (`RETRY_PENDING`). A 20-second reprocessor replays them with exponential backoff (30s initial → 60s → 120s); after 3 failed attempts the payload parks in `DEAD_LETTER` for inspection. The ingest endpoint returns `202 Accepted` (not an error) so Razorpay doesn't re-flood while the DLQ owns the retry. |
| **Bounded retries** | Both the dunning retry loop (max 3) and the DLQ reprocessor (max 3) are strictly bounded — no infinite loops. |
| **Durable webhook audit trail** | Every inbound webhook is written to `webhook_event_log` (its own commit) **before** processing, so no payload is lost even if the JVM crashes mid-work; enables DLQ debugging and reconciliation. |
| **Settlement reconciliation** | `GET /api/v1/admin/reconcile` scans awaiting-settlement events and queries the Razorpay Payments API for real-time status, closing the gap when a customer pays but closes the tab before the webhook lands. |
| **Async offloading** | Webhook parsing/classification and all notifications run via `@Async`, keeping HTTP threads free. |
| **Non-blocking notifications** | Mail sender is injected optionally (`@Autowired(required=false)`) — the app boots cleanly even with mail disabled/misconfigured. |
| **Graceful degradation** | Payment-link creation falls back to a synthetic URL when Razorpay credentials are absent, keeping the full pipeline demonstrable offline. |

---

## Tech Stack

**Backend**

| Layer | Technology |
|---|---|
| Runtime | Java 21 |
| Framework | Spring Boot 3.2.5 (Web, Data JPA, Mail) |
| Database | PostgreSQL (versioned by **Flyway**: `V1` schema, `V2` webhook tables, `V3` smart-retry telemetry) + Hibernate `ddl-auto=validate` |
| Payments | Razorpay Java SDK 1.4.6 (Payment Links API) |
| Config secrets | dotenv-java 3.0.0 (loads `.env` at startup) |
| Boilerplate | Lombok |
| Realtime | Spring SSE (`SseEmitter`) |

**Frontend**

| Layer | Technology |
|---|---|
| Framework | React 18.3 + TypeScript (Vite 8) |
| Styling | Tailwind CSS v4 (CSS-first config via `@tailwindcss/vite`) |
| Icons | lucide-react |
| Realtime | Native `EventSource` (SSE) |

---

## Repository Layout

```
revenue recovery/
├── backend/
│   └── revenueRecovery/                # Spring Boot service
│       ├── pom.xml
│       └── src/
│           ├── main/java/com/razorpay/recovery/
│           │   ├── RecoveryApplication.java        # @EnableScheduling + @EnableAsync entrypoint (.env loader)
│           │   ├── config/CorsConfig.java          # CORS for :5173 and :3000
│           │   ├── controller/
│           │   │   ├── WebhookController.java      # Razorpay webhook ingress + HMAC gate
│           │   │   ├── SignatureVerifier.java      # HMAC-SHA256, constant-time compare
│           │   │   ├── SseController.java          # Live stream + history endpoints
│           │   │   ├── CustomerRecoveryController.java  # Invoice lookup + 1-click resolve
│           │   │   └── TestSimulationController.java    # Demo/benchmark harness
│           │   ├── model/
│           │   │   ├── DunningEvent.java           # Core JPA entity (dunning_events)
│           │   │   ├── WebhookDlqEvent.java        # DLQ entity (webhook_dlq_events)
│           │   │   └── FailureCategory.java        # TRANSIENT_SOFT_FAIL | PERMANENT_HARD_FAIL
│           │   ├── repository/
│           │   │   ├── DunningEventRepository.java # incl. findPendingRetriesReady query
│           │   │   └── WebhookDlqRepository.java
│           │   └── service/
│           │       ├── DunningRecoveryService.java # Core async pipeline + Payment Links
│           │       ├── SmartRetryScheduler.java    # Backoff retry poller
│           │       ├── WebhookDlqService.java      # DLQ capture + automated reprocessor
│           │       ├── SseStreamService.java       # Broadcaster registry
│           │       ├── NotificationService(+Impl).java  # HTML email + SMS/WhatsApp dispatch
│           └── main/resources/
│               ├── application.properties
│               └── db/migrations/V1__init_recovery_events_schema.sql
├── frontend/
│   └── recovery-ui/                    # React ops dashboard
│       └── src/
│           ├── App.tsx                 # Root: landing state + tabs + history fetch + SSE subscription + upsert logic
│           ├── components/
│           │   ├── Landing.tsx                  # Entry landing page telling the project story
│           │   ├── Header.tsx                  # Title bar + home button + soft/hard/batch simulators
│           │   ├── KpiGrid.tsx                 # Failed payments · interventions · salvaged ₹
│           │   ├── AnalyticsPanel.tsx          # Recovery %, cohort bars, top triggers, CSV export
│           │   ├── ServerAnalyticsPanel.tsx    # Recovered MRR + churn cohort funnel (server-computed)
│           │   ├── BankRadarBanner.tsx         # Bank-downtime radar with anomaly/restore controls
│           │   ├── EventList.tsx / EventCard.tsx # Live feed w/ Agent Trace + retry badges
│           │   ├── BenchmarkBanner.tsx         # Batch benchmark summary
│           │   ├── NotificationPreviewModal.tsx # Dunning email preview
│           │   ├── RecoveryPortalModal.tsx     # 1-click retention offers (grace discount / downgrade)
│           │   └── CustomerPaymentPortal.tsx   # Simulated Razorpay checkout (UPI/Card/Netbanking)
│           └── types/recovery.ts       # DunningEvent + BenchmarkReport interfaces
└── README.md
```

---

## Backend Reference

Base URL: `http://localhost:8080`

### REST API

#### Webhooks
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/webhook/razorpay` | Razorpay webhook ingress. Requires header `X-Razorpay-Signature` (HMAC-SHA256 of raw body). Handles `payment.failed` (→ recovery pipeline), `payment.captured` / `payment_link.paid` (→ settlement). Returns `200` processed · `401` bad signature · `202` queued into DLQ after internal failure. |

#### Real-time stream & history
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/stream/events` | Server-Sent Events stream (`text/event-stream`). Events are emitted under the custom name **`recovery-event`**. |
| `GET` | `/api/v1/stream/history` | Full JSON dump of all dunning events (dashboard hydration source). |

#### Customer self-service
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/customer/invoice/{paymentId}` | Fetch a single dunning event (invoice view). |
| `POST` | `/api/v1/customer/resolve/{paymentId}` | Mark invoice paid from the checkout portal. Body (optional): `{"method":"UPI"}` (also `CARD`, `NETBANKING`). Sets `RECOVERED_CUSTOMER_PAID` and broadcasts. |

#### Management, radar & analytics  *(requires `X-Admin-Key` when `ADMIN_API_KEY` is set)*
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/analytics` | Authoritative recovered-MRR & churn observability from the full persisted registry: total value at risk, recovered value, recovery rates (count + value), per-strategy INR split, and a daily churn-cohort funnel. |
| `GET` | `/api/v1/admin/analytics/export?format=csv` | Server-side CSV download of the same summary + strategy split + cohorts (`recovery_report_<date>.csv`) for BI/ops ingestion. |
| `GET` | `/api/v1/admin/reconcile` | Runs settlement reconciliation: scans awaiting-settlement events and syncs any that already settled on Razorpay (closed-tab safety net). |
| `GET` | `/api/v1/radar/status` | Bank-health radar report (per-rail status, failure rate, sample count). |
| `POST` | `/api/v1/radar/simulate-outage?bank=HDFC&rate=75.0` | Inject a simulated outage/degraded rail for the demo. |
| `POST` | `/api/v1/radar/restore?bank=HDFC` | Clear the simulated override and return to live telemetry. |

> **Auth gate:** all `/api/v1/admin/**`, `/api/v1/radar/**` and `/api/v1/test/**` endpoints are guarded by `AdminAuthInterceptor`, which requires the `X-Admin-Key` header to match `ADMIN_API_KEY`. When `ADMIN_API_KEY` is blank the gate is open (local-dev convenience) — **always set it in non-local environments**.

#### Simulation & benchmark harness
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/test/simulate?type=SOFT\|HARD&email=...&amount=...` | Fabricates a Razorpay-shaped `payment.failed` payload and pushes it through the real pipeline. `type` defaults to `HARD`; amount defaults to a random ₹499–₹4999. |
| `POST` | `/api/v1/test/simulate-batch?totalEvents=50` | Fires a mixed hard/soft batch and returns benchmark metrics: batch size, escalations, queued backoffs, total value processed (₹), duration ms, throughput events/sec. |
| `POST` | `/api/v1/test/simulate-capture?paymentId=...&method=UPI` | Simulates a settlement webhook for an existing event. |
| `POST` | `/api/v1/test/simulate-dlq` | Injects a corrupted payload directly into the dead-letter queue. |

### Scheduled Jobs & Async Pipeline

| Job | Cadence | Behavior |
|---|---|---|
| `SmartRetryScheduler.executePendingRetries` | every 10 s | Executes due `SCHEDULED` soft-fail retries. Each attempt: settlement re-check → radar circuit-breaker hold (bank outage, no attempt consumed) → real gateway re-charge (dev/test simulated, radar-aware) → reschedule via timing engine (liquidity window / degraded jitter / exponential backoff) → escalate after exhausting the budget. |
| `WebhookDlqService.processDlqRetries` | every 20 s | Replays `RETRY_PENDING` webhooks (routed through the ingestion pipeline so settled webhooks retry too); backoff 30s → 60s → 120s; parks in `DEAD_LETTER` after 3 failed attempts. |
| `processWebhookPayloadAsync` | on demand (@Async) | Parses webhook, idempotency gate, classify, persist, notify, broadcast. |
| `NotificationServiceImpl.sendEmail/Sms` | on demand (@Async) | Non-blocking multi-channel dunning dispatch. |

### Data Model

**`dunning_events`** (entity `DunningEvent`)
| Column | Type | Notes |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `payment_id` | VARCHAR(100) | UNIQUE + indexed — idempotency key |
| `amount` | NUMERIC | Stored in ₹ (converted from paise) |
| `customer_email`, `customer_contact` | VARCHAR | Dunning targets |
| `error_code`, `error_reason` | VARCHAR/TEXT | From Razorpay payload |
| `category` | enum STRING | `TRANSIENT_SOFT_FAIL` \| `PERMANENT_HARD_FAIL` |
| `strategy_applied` | VARCHAR | e.g., `SMART_BACKOFF_RETRY`, `AUTONOMOUS_PAYMENT_LINK_ESCALATION` |
| `reasoning_trace` | VARCHAR(1000) | Human-readable audit trail shown as "⚡ Agent Trace" in the UI |
| `recovery_url` | VARCHAR | Razorpay Payment Link short URL |
| `status` | VARCHAR | `SCHEDULED`, `RECOVERED_ACTION_TAKEN`, `RECOVERED_RETRY_SUCCESS`, `RECOVERED_CUSTOMER_PAID` |
| `bank_code` | VARCHAR | Normalized acquiring rail (`HDFC`, `SBI`, `ICICI`, `AXIS`, `KOTAK`, `UPI`) for radar telemetry + smart timing |
| `retry_count`, `max_retries` | INT | Defaults 0 / 3 |
| `next_retry_at` | TIMESTAMPTZ | Composite-indexed with `status` for the scheduler query |
| `last_retry_at` | TIMESTAMPTZ | Timestamp of the most recent retry attempt (telemetry) |
| `created_at` | TIMESTAMPTZ | |

**`webhook_event_log`** (entity `WebhookEventLog`)
| Column | Notes |
|---|---|
| `id`, `event_type`, `payment_id` | Indexed for reconciliation / DLQ debugging |
| `raw_payload` (TEXT), `processing_note` (TEXT) | Full body captured before processing |
| `status` | `RECEIVED` → processed state |
| `created_at`, `processed_at` | Audit timestamps |

**`webhook_dlq_events`** (entity `WebhookDlqEvent`)
| Column | Notes |
|---|---|
| `id`, `event_type`, `raw_payload` (TEXT), `exception_message` (TEXT) | Original failure context |
| `retry_count` / `max_retries` (3) | Bounded replay budget |
| `status` | `RETRY_PENDING` → `RESOLVED` \| `DEAD_LETTER` |
| `next_retry_at` | Composite-indexed with `status` for the reprocessor query |

### Configuration

All settings are environment-overridable. A `.env` file in `backend/revenueRecovery/` is loaded automatically at startup (missing file is ignored).

| Variable | Default | Purpose |
|---|---|---|
| `RAZORPAY_KEY_ID` | placeholder test key | Razorpay API key (Payment Links) |
| `RAZORPAY_KEY_SECRET` | placeholder secret | Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | placeholder secret | HMAC verification secret. Verification is always enforced; if blank the webhook is rejected. |
| `ADMIN_API_KEY` | blank | Operator/management API key required in the `X-Admin-Key` header for `/api/v1/admin/**`, `/api/v1/radar/**`, `/api/v1/test/**`. Blank = gate open (local dev). |
| `DB_URL` | `jdbc:postgresql://localhost:5432/revenue_recovery` | PostgreSQL JDBC URL |
| `DB_USER` / `DB_PASS` | `postgres` / `postgres` | DB credentials |
| `MAIL_ENABLED` | `false` | When `false`, emails are logged as `[SIMULATION EMAIL DISPATCH]` instead of sent |
| `MAIL_HOST` / `MAIL_PORT` | `smtp.gmail.com` / `587` | SMTP server (STARTTLS + auth enabled) |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | empty | SMTP credentials |
| `MAIL_FROM` | `billing@recoveryengine.io` | Sender address |
| `EVOLUTION_ENABLED` | `false` | When `false`, WhatsApp messages are logged as `[SIMULATION SMS/WHATSAPP DISPATCH]` |
| `EVOLUTION_BASE_URL` | `http://localhost:9090` | Base URL of the self-hosted Evolution API gateway |
| `EVOLUTION_API_KEY` | empty | Global gateway API key (used if no instance token) |
| `EVOLUTION_INSTANCE_NAME` | `recovery-engine` | Connected gateway instance name |
| `EVOLUTION_INSTANCE_TOKEN` | empty | Per-instance API key (overrides global key when set) |

Other notable properties: `server.port=8080`, `spring.jpa.hibernate.ddl-auto=validate` (Flyway owns schema creation/migration via `classpath:db/migrations`; `ddl-auto=validate` fails startup on any entity/schema drift), CORS allowed origins `http://localhost:5173` and `http://localhost:3000`. Dev-only controllers (`/test`, `/radar`) are `@Profile("dev")` and enabled via `SPRING_PROFILES_ACTIVE=dev`.

### Running the Evolution API WhatsApp gateway (optional, local)

The open-source Evolution API gateway runs alongside the app to send real WhatsApp dunning messages. A Docker Compose stack is provided in `evolution/docker-compose.yml` (gateway + PostgreSQL + Redis):

```bash
cd evolution
cp .env.example .env      # set EVOLUTION_AUTH_KEY to a long random secret
docker compose up -d      # gateway on http://localhost:9090
```

Then create + pair a WhatsApp instance (Baileys, free):

```bash
curl -X POST http://localhost:9090/instance/create \
  -H "apikey: <EVOLUTION_AUTH_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"recovery-engine","integration":"WHATSAPP-BAILEYS","qrcode":true,"token":"<instance-token>"}'
```

Scan the returned QR with WhatsApp → **Settings ▸ Linked devices ▸ Link a device**. Finally point the backend at it (in `backend/revenueRecovery/.env`, which is gitignored):

```
EVOLUTION_ENABLED=true
EVOLUTION_BASE_URL=http://localhost:9090
EVOLUTION_API_KEY=<EVOLUTION_AUTH_KEY>
EVOLUTION_INSTANCE_NAME=recovery-engine
EVOLUTION_INSTANCE_TOKEN=<instance-token>
```

When `EVOLUTION_ENABLED=true` and the instance is configured, `sendSmsOrWhatsAppRecovery` dispatches a real WhatsApp message; otherwise it logs `[SIMULATION SMS/WHATSAPP DISPATCH]`. Note the gateway's Baileys/WhatsApp-Web pairing is against WhatsApp's terms — fine for testing, but for high-volume production use the WhatsApp Cloud API variant (which Meta charges for).

---

## Frontend Reference

Single-page operations console ("Razorpay AI Revenue Recovery Engine"), dev-served on **port 5173**, talking to the backend origin configured via `VITE_API_BASE_URL` (default `http://localhost:8080`).

The app opens on a **landing page** that tells the project story (problem → pipeline → capabilities → tech stack) and acts as the entry point. Clicking **Open console** enters the control room, which is organized into **tabs** — Dashboard / Bank Radar / Analytics. A **home button** in the header returns to the landing page at any time.

### Dashboard sections

1. **Header** — live status indicator, home button, and simulation controls: target email input, **Soft Fail** and **Hard Fail** injectors, and a primary **Run 50-Event Batch** benchmark button.
2. **KPI Grid** — three cards: *Failed Payments Intercepted* (total events), *Autonomous Interventions* (recovered count), *Salvaged Revenue Pool* (sum of ₹ amounts recovered).
3. **Bank Radar tab** — real-time banking-rails health monitor with per-rail status cards, a failure-rate slider, and **Apply Anomaly** / **Restore Rail** controls to exercise the live circuit-breaker.
4. **Live Analytics Panel (Dashboard)** — overall recovery efficiency (% + progress bar with ₹ saved out of ₹ total), soft-vs-hard pipeline ratio stacked bar (queued backoffs vs. direct links), top failure triggers ranked by `error_code` frequency, and **Export Financial Audit CSV** (client-side CSV generation → `dunning_recovery_report_<date>.csv`, 13 audit columns).
5. **Server Analytics Panel (Analytics tab)** — fetches `GET /api/v1/admin/analytics` (with `X-Admin-Key` when `VITE_ADMIN_API_KEY` is set) every 15 s and renders the authoritative recovered value, recovery rates, still-at-risk exposure, the monetary split by recovery channel (Smart Retry vs Customer Discount / 1-Click Checkout vs Settlement Webhook vs Payment Link), and the daily churn-cohort funnel — a server-computed complement to the client-side live panel.
6. **Live Event Stream (Dashboard)** — scrollable feed of event cards showing payment ID, email, timestamp, color-coded category chip, amount, spinning "Attempt n/3" badge while a retry is pending, strategy label, and the **⚡ Agent Trace** reasoning audit line. Recovered-via-retry cards get a green banner; escalated cards show their clickable payment link, an "Email Dispatched" badge, and a **Preview** button that renders the exact customer-facing dunning email in a modal.
7. **Batch Benchmark Banner** — dismissible summary of batch runs: size, escalated-to-links count, backoff-queued count, total volume ₹, processing latency.
8. **Customer Payment Portal** — full-screen simulated Razorpay checkout: loads the invoice, shows the decline reason, offers UPI / Card / Netbanking selection, authorizes payment via the resolve endpoint, then displays an animated success receipt ("SETTLED — LIVE BROADCASTED") that also flips live on the ops dashboard via SSE.

### Data flow

- On mount: `GET /stream/history` hydrates the feed (newest-first), then an `EventSource` subscribes to `/api/v1/stream/events`.
- Incoming `recovery-event` frames are **upserted by `paymentId`**, so retry-state transitions mutate the same card live instead of duplicating rows.
- Connection closes cleanly on unmount.

---

## Getting Started

### Prerequisites

- **JDK 21**
- **Maven** (or use the bundled wrapper `mvnw.cmd`)
- **PostgreSQL 14+** running locally
- **Node.js 18+** and npm

### Fastest path: run everything in Docker

The repo ships an all-in-one Compose stack (`backend` + nginx-served `frontend` + `Postgres`) in the root `docker-compose.yml`:

```powershell
cd <repo root>
docker compose up --build -d
```

| Service | URL | Notes |
|---|---|---|
| Frontend (nginx) | http://localhost:3000 | Serves the built SPA and proxies `/api` → backend |
| Backend | http://localhost:8080 | Spring Boot API (Flyway migrates `revenue_recovery` automatically) |
| Postgres | localhost:5432 | Managed volume; created with the `revenue_recovery` database |

- The build sets `VITE_API_BASE_URL=""` so the browser talks same-origin to nginx; no CORS needed.
- Set `ADMIN_API_KEY` (and optionally `RAZORPAY_*`, `DB_PASS`) via an `.env` next to the compose file or in your shell.
- The **Evolution API** WhatsApp gateway stays in its own stack (`evolution/docker-compose.yml`, port 9090); when it isn't running the app logs simulated messages, so the panel demo works out of the box.
- Keep the local-dev path below when you want hot-reload for the demo (backends from IntelliJ, frontend from Vite).

### 1. Database setup

```sql
CREATE DATABASE revenue_recovery;
```

(Schema is created and versioned automatically by **Flyway** on first boot; Hibernate runs in `ddl-auto=validate` to catch any drift against the migrations.)

### 2. Configure the backend

Create `backend/revenueRecovery/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
DB_URL=jdbc:postgresql://localhost:5432/revenue_recovery
DB_USER=postgres
DB_PASS=postgres
MAIL_ENABLED=false
MAIL_FROM=billing@yourcompany.io
# Set to a strong value to enable the X-Admin-Key gate on operator endpoints
# (/api/v1/admin/**, /api/v1/radar/**, /api/v1/test/**). Blank = gate open.
# ADMIN_API_KEY=change-me
```

> The app runs fully without Razorpay/mail credentials — payment links fall back to synthetic URLs and emails are logged as simulations.

### 3. Run the backend

```powershell
cd backend/revenueRecovery
.\mvnw.cmd spring-boot:run
```

Backend starts on **http://localhost:8080**.

### 4. Run the frontend

```powershell
cd frontend/recovery-ui
npm install
npm run dev
```

Dashboard opens at **http://localhost:5173**.

### 5. Watch it recover revenue

Click **Hard Fail** in the header — within seconds you'll see the event classified, a payment link generated, an email dispatched (simulated), and the card appear live via SSE.

---

## Demo Walkthrough

> **Presentation tip:** the app opens on the landing page, which tells the story for you. Open the console and narrate the three-act flow below — it maps directly to the on-screen tabs.

| Act | Action | What the panel sees |
|---|---|---|
| 1 — Soft fail | Open **Bank Radar** tab, click **Soft Fail** in the header | The event is classified transient, scheduled with Gaussian-jittered timing, and auto-recovers via smart retry to a green `RECOVERED_RETRY_SUCCESS` card — with a Razorpay link available. |
| 2 — Hard fail | Click **Hard Fail** | Immediate classification to `RECOVERED_ACTION_TAKEN`, a real Razorpay payment link generated, "Email Dispatched", and **Preview** shows the exact customer email. |
| 3 — Analytics | Open **Analytics** tab | Recovered MRR, recovery rates, churn-cohort funnel, and salvage split by channel — live, server-computed. |

For deeper scenarios (batch benchmark, DLQ resilience, customer checkout, audit export) see the table below.

| Scenario | Try this | Expected behavior |
|---|---|---|
| Soft failure auto-retry | Click **Soft Fail** | Card appears with amber `TRANSIENT_SOFT_FAIL` chip + spinning "Attempt 1/3". Within seconds (radar-aware scheduling) it flips green (`RECOVERED_RETRY_SUCCESS`) or exhausts and escalates to a payment link; you can also `POST /api/v1/radar/simulate-outage` to watch the circuit-breaker hold. |
| Hard failure escalation | Click **Hard Fail** | Rose chip, immediate payment-link generation, "Email Dispatched" badge, **Preview** shows the exact HTML dunning email. |
| Batch benchmark | Click **Run 50-Event Batch** | Banner reports throughput, split between escalations and queued backoffs, and total ₹ processed. |
| Settlement webhook | `POST /api/v1/test/simulate-capture?paymentId=<id>` | Card transitions to `RECOVERED_CUSTOMER_PAID`. |
| Customer checkout | Open an escalated event's portal flow | Choose UPI/Card/Netbanking → authorize → animated receipt; dashboard updates in real time. |
| DLQ resilience | `POST /api/v1/test/simulate-dlq` | Corrupt payload lands in `RETRY_PENDING`; watch the 20 s reprocessor bounce it until `DEAD_LETTER`. |
| Audit export | Click **Export Financial Audit CSV** | Downloads `dunning_recovery_report_<today>.csv` with all events. |

---

## Project Status

- [x] Architecture design
- [x] Webhook ingestion with HMAC-SHA256 verification
- [x] Failure classifier (soft/hard)
- [x] Smart radar/timing-engine-driven retry scheduler (bank outage circuit-breaker, settlement re-check, radar-aware backoff)
- [x] Razorpay Payment Link escalation
- [x] Multi-channel dunning notifications (HTML email live; WhatsApp via open-source Evolution API gateway with console-simulation fallback)
- [x] PostgreSQL persistence + Flyway-versioned schema (`V1`/`V2`/`V3`) with `ddl-auto=validate`
- [x] Dead-letter queue with automated backoff reprocessing (routed through the ingestion pipeline)
- [x] `payment.captured` / `payment_link.paid` settlement pipeline (idempotent)
- [x] Durable webhook audit trail (`webhook_event_log`) + settlement reconciliation endpoint
- [x] Customer one-click resolution portal
- [x] React real-time dashboard (KPIs, live + server analytics, agent traces, email preview)
- [x] Batch benchmark harness + CSV financial audit export + server-side analytics/export
- [x] API-key auth on management/radar/test endpoints
- [x] Externalized frontend API URL (`VITE_API_BASE_URL`)
- [x] Unit test coverage (retry engine, timing/radar, analytics, webhook HMAC, auth gate)
- [x] CI pipeline (GitHub Actions): backend `mvn verify` (Java 21) + frontend typecheck/build
- [x] WhatsApp delivery via open-source **Evolution API** gateway (self-hosted, REST) with console-simulation fallback
- [x] Landing page + tabbed control room (Dashboard / Bank Radar / Analytics) with home navigation
- [x] Transient (soft) failures also receive a payable Razorpay recovery link alongside smart retry
- [x] Operator login gate (frontend sign-in validates against the backend; sign-out, key persisted) + one-click **Reset Demo** (clear + seed)
- [x] All-in-one `docker-compose.yml` (backend + nginx frontend + Postgres), Dockerfiles for both apps

## Known Limitations

- **Simulation semantics**: with non-live Razorpay credentials (typical dev/test), retry outcomes use a radar-aware simulated model and SMS/WhatsApp dispatches are console logs only unless an Evolution API gateway is configured (`EVOLUTION_ENABLED=true` + valid gateway/base URL) — by design for demo determinism. In production with real credentials, retries issue real gateway re-charges.
- **API-key auth is lightweight**: management endpoints are gated by a single shared `X-Admin-Key` header (constant-time compared), not per-user authN/authZ — sufficient for operator tools behind a trusted network.
- **Frontend admin key is a build-time env var** (`VITE_ADMIN_API_KEY`); use an API gateway/proxy to keep the key out of the browser bundle in stricter deployments.
- **No formal circuit breaker library** — resilience comes from bounded retries + the DLQ pattern.
