# ADR-0006: Owned AI Gateway Library Over Hosted Gateways/Proxies

**Status:** Accepted
**Date:** 2026-07-08
**Deciders:** CTO / Founding team, AurexDesigns
**Related documents:** `../architecture/AIArchitecture.md`, `../07_AI_Strategy.md`, `../08_Tech_Stack.md`, `../12_Project_Rules.md`

## Context

Every AI feature in AurexOS — Aurex chat, agent workflows, RAG, classification, digests — makes model calls carrying the most sensitive data in the system: tenant CRM records, financials, contracts, and email in prompts. Project rule R-AI1 (`../12_Project_Rules.md`) mandates a single choke point for every model call: no per-provider SDK scattered through feature code, because cost metering, audit logging, budget enforcement, and provider failover all require one place to stand. The stack commits to Claude primary / OpenAI secondary with logical model tiers (`../08_Tech_Stack.md` §4.1–4.2), per-workspace metering to `ai_usage` from the first call, and per-workspace budgets (`../07_AI_Strategy.md`). The question is *what* the choke point is: a library we own, a hosted gateway, or a self-hosted proxy.

## Decision

We will route **all model calls through an owned gateway library in `packages/ai`**: provider adapters (Claude primary, OpenAI secondary; Gemini and OpenAI-compatible open-source endpoints addable as adapters), logical tiers (Light / Standard / Frontier, plus a pinned Embeddings tier), per-workspace metering to `ai_usage`, budget enforcement, failover routing, redaction hooks, and full telemetry — instead of a hosted gateway (OpenRouter) or a self-hosted proxy (LiteLLM).

## Options Considered

### Option A — Owned gateway library in `packages/ai` (chosen)
- **Pros:** no third party in the most sensitive data path — prompts containing tenant business data go only to the model providers we contract with; tenancy-aware metering is native (`workspace_id` flows from the calling context straight into `ai_usage`, no reconciliation from a vendor's usage export); our actual needs are small — two providers, tier routing, metering — well within library scope for this team; the interface is the seam: a hosted gateway can later sit **behind** it as just another adapter without touching feature code.
- **Cons:** we own retry semantics, streaming correctness, prompt caching, and provider API churn ourselves — the unglamorous plumbing hosted gateways sell.
- **Chosen.**

### Option B — Hosted gateway (OpenRouter or similar)
- **Pros:** instant access to every model, unified billing, failover for free.
- **Cons:** a third party now sees every prompt — tenant CRM notes, invoice amounts, contract terms — which expands the compliance surface (DPAs, sub-processor lists, enterprise security reviews) for a convenience we barely need with two providers; per-workspace metering must be reconstructed from their logs rather than emitted natively.
- **Rejected.** Remains available as an adapter behind our interface if model-catalog breadth ever matters.

### Option C — Self-hosted LiteLLM proxy
- **Pros:** open source, no third party sees prompts, broad provider support.
- **Cons:** another always-on service to deploy, patch, monitor, and secure — for a 2-person team, standing infrastructure is the scarcest budget there is; and its per-key metering still has to be mapped onto our workspace model.
- **Rejected.**

### Option D — Per-provider SDKs in feature code
- **Pros:** zero abstraction, fastest first demo.
- **Cons:** banned by R-AI1. No choke point means no reliable cost attribution, no uniform audit trail (violating "no unaudited AI writes," `../03_System_Goals.md` §11.8), and failover retrofitted across every call site.
- **Rejected.**

## Consequences

- **Positive:** model churn is a config change (tier → model mapping), not a deploy; per-workspace AI billing for Phase 5 is already metered; provider failover, budget ceilings, and redaction live in one audited codepath; adding Gemini or an open-source endpoint is one adapter file.
- **Negative:** the real cost is ours to carry — retry/backoff correctness under provider rate limits, streaming edge cases (partial tool calls, mid-stream failover), prompt-cache invalidation, and tracking two providers' API evolutions are permanent maintenance, not a one-time build; a subtle gateway bug (double-billed tokens, dropped audit rows, broken failover) is invisible until it costs money or trust, so the gateway needs its own test suite with recorded provider fixtures (`../08_Tech_Stack.md` §8).
- **Revisit when:** (a) supported provider count exceeds 3–4 and adapter maintenance visibly drags product velocity, or (b) gateway plumbing consumes engineering attention that a hosted gateway *behind our interface* (keeping metering and audit native) would demonstrably recover.
