# AI Revenue Recovery — Autonomous Smart Dunning Engine

A production-grade **Autonomous Revenue Recovery & Smart Dunning Engine** for recurring SaaS payment failures, built with **Java 21 (Spring Boot 3)**, **React 18 + Tailwind CSS**, and **Razorpay APIs**.

## What it does

When a recurring subscription payment fails, the engine autonomously decides how to recover the revenue:

1. **Ingests** Razorpay webhooks (`payment.failed`, etc.) with strict HMAC-SHA256 signature verification.
2. **Classifies** the failure code into soft/transient vs. hard/permanent categories.
3. **Recovers** via two deterministic strategies:
   - **Soft errors** (`GATEWAY_ERROR`, `BANK_DOWNTIME`, `NETWORK_TIMEOUT`) → bounded exponential-backoff retry scheduler (max 3 retries / 48h, jittered).
   - **Hard errors** (`EXPIRED_CARD`, `INSUFFICIENT_FUNDS`, `AUTHENTICATION_FAILED`) → autonomous escalation to Razorpay Payment Links (UPI intent supported) + multi-channel dunning notifications.
4. **Guards** every path with idempotency controls, a deterministic Finite State Machine, circuit breakers, and dead-letter handling.

## Architecture

```
Razorpay ──webhook──▶ WebhookController ──▶ IdempotencyGate ──▶ @Async pipeline
                        (HMAC-SHA256)                              │
                                                                   ▼
                                                    FailureClassifier (soft/hard)
                                                     │                    │
                                            BackoffScheduler        EscalationService
                                            (bounded retries)       (Payment Link + notify)
                                                     │                    │
                                                     ▼                    ▼
                                        RecoveryStateMachine (FAILED → SCHEDULED_FOR_RETRY |
                                              ESCALATED_TO_LINK → RESOLVED | CANCELLED_DEAD_LETTER)
                                                                   │
                                                     SseStreamService ──SSE──▶ React Dashboard
```

## Repository layout

```
backend/    Spring Boot service (webhooks, FSM, scheduler, Razorpay integration, SSE)
frontend/   React + Tailwind real-time monitoring console (KPIs, audit trail, simulators)
ARCHITECTURE_INCIDENTS.md   Incident/consequence matrix & engineering mitigations
```

## Status

- [x] Architecture design
- [ ] Backend implementation
- [ ] Frontend dashboard
- [ ] Incident documentation
