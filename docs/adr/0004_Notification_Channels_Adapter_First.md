# ADR-0004: Channel-Adapter Notification Architecture — Owned Core Channels, Bridged Long-Tail

**Status:** Accepted
**Date:** 2026-07-08
**Deciders:** CTO / Founding team, AurexDesigns
**Related documents:** `../architecture/NotificationsArchitecture.md`, `../06_Module_Breakdown.md`, `../11_Design_Principles.md`

## Context

Every module emits notifiable moments — task assigned, invoice paid, deal moved, client commented — and the channel list users expect keeps growing: in-app, email, push, Slack, SMS, WhatsApp, Discord, Telegram. The `domain_events` spine already carries every notifiable state change, and preferences/digests/quiet-hours must be one coherent model regardless of channel (`../11_Design_Principles.md`: one system, not per-module bolt-ons). The trap is symmetric: build every channel first-party and a 2–4 person team drowns in per-channel compliance (WhatsApp Business template approval, US SMS 10DLC carrier registration, per-message costs); outsource the whole engine and a third vendor holds tenant notification data and duplicates our preference model. We need a structure that keeps the engine owned while making individual channels cheap to add, demote, or drop.

## Decision

We will build **one notification engine** consuming `domain_events`, with a **uniform channel-adapter contract** (`deliver(notification, recipient, channelConfig)` plus capability/preference metadata). First-party adapters ship for the core channels: in-app (Supabase Realtime), email (Resend), web push, and digest. Long-tail channels — Slack, SMS, WhatsApp, Discord, Telegram — are delivered first as **n8n-bridged adapters** (the adapter posts to an n8n workflow that owns the third-party plumbing) and are promoted to first-party adapters only on measured demand and acceptable unit economics per channel.

## Options Considered

### Option A — Adapter-first hybrid: owned engine, owned core adapters, bridged long-tail (chosen)
- **Pros:** the engine — preferences, batching, digests, quiet hours, audit — is built once and owned; core channels get first-party reliability where it matters daily; each long-tail channel costs roughly one n8n workflow to pilot, and usage data decides which earn promotion; per-channel liabilities (10DLC registration, WhatsApp template review, SMS per-message cost) are deferred until a channel proves demand.
- **Cons:** bridged channels have weaker delivery guarantees and observability than first-party ones; two adapter classes to reason about.
- **Chosen.**

### Option B — First-party everything, now
- **Pros:** uniform reliability, telemetry, and retry semantics across all channels from day one.
- **Cons:** five-plus provider integrations, compliance processes, and cost models built up front for channels **nobody has asked for yet**; WhatsApp and SMS alone are weeks of registration and review work plus real per-message money. This is speculative construction, which `../09_Scaling_Strategy.md` §1 exists to forbid.
- **Rejected.**

### Option C — Third-party notification platform (Knock, Courier, Novu)
- **Pros:** channels, preference UI, batching, and digests out of the box; genuinely good products.
- **Cons:** another vendor holding tenant notification content (which quotes CRM records, invoice amounts, client names); the preference model gets duplicated between our workspace settings and their platform, and the two will drift; per-notification pricing across thousands of workspaces is a COGS line we don't control.
- **Rejected for now.** Revisit if the channel matrix grows faster than the team can maintain adapters.

## Consequences

- **Positive:** one preference model, one digest engine, one audit trail regardless of channel; adding a pilot channel is an n8n workflow, not a sprint; the adapter contract is the seam — a bridged channel promotes to first-party (or a platform like Knock slots in underneath) without touching the engine.
- **Negative:** bridged channels are honestly second-class — delivery failures surface through n8n's observability, not ours, and an n8n outage silences the long-tail channels (core channels are unaffected by design); the promotion decision requires us to actually instrument per-channel usage and cost, which is work; users may perceive Slack/SMS as "supported" and hold bridged reliability to first-party expectations.
- **Revisit when:** (a) a bridged channel's volume or failure rate justifies first-party promotion, (b) channel count outgrows the team's adapter maintenance capacity (the Option C trigger), or (c) an enterprise deal demands delivery SLAs on a channel we currently bridge.
