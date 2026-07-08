# 15 — Future Ideas

| | |
|---|---|
| **Document** | Future Vision & Idea Backlog — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO, AurexDesigns |
| **Related** | [01_Project_Vision.md](./01_Project_Vision.md) · [04_Feature_List.md](./04_Feature_List.md) · [10_Roadmap.md](./10_Roadmap.md) · [12_Project_Rules.md](./12_Project_Rules.md) |

---

> **Nothing in this document is committed.** These are directions we believe in, held deliberately outside the roadmap so they cannot distort it. An idea moves from here into [10_Roadmap.md](./10_Roadmap.md) only through the phase-gate process (10 §11) — with an owner, prerequisites verified, and an ADR. Until then, no idea on this page justifies scope creep, speculative abstractions, or "while we're at it" engineering ([12_Project_Rules.md](./12_Project_Rules.md) R-Q1 applies to architecture, too).

**Effort tiers:** **S** = weeks · **M** = 1–2 quarters · **L** = 2+ quarters or a dedicated team.
**Earliest phase** references roadmap phases; "5 + n" means n expansion cycles after commercial launch. Most ideas are post-Phase 5 by design.

## 0. Principles for future bets

Every idea below was filtered through, and will be re-judged against, five tests:

1. **Moat over feature.** We prioritize ideas that compound — ecosystems, data advantages, network effects — over ideas any competitor can copy in a quarter.
2. **Dogfood first.** AurexDesigns must be able to use (and suffer) the first version internally or with its own clients before external customers touch it. Ideas we cannot dogfood rank lower.
3. **Trust is the budget.** Anything touching client-visible output, credentials, or cross-tenant data spends trust we cannot refund. Those ideas carry deliberately later phases and heavier prerequisites, however attractive they look.
4. **The rules travel.** Every future idea inherits [12_Project_Rules.md](./12_Project_Rules.md) unchanged — especially R-D1/R-D2 (tenancy), R-AI3 (human approval), and R-AI4 (no cross-tenant data). An idea that requires weakening a rule must first win the rule-change process, not the roadmap slot.
5. **Revenue quality matters.** We prefer monetization that aligns with customer success (usage, outcomes, marketplace take-rates on value created) over monetization that fights it (artificial gates, per-seat punishments for growth).

## 1. Marketplaces

The marketplace trilogy is the heart of AurexOS's platform ambition: turning a product into an ecosystem where agencies, creators, and developers make money *on top of* us. Sequencing matters — templates first (lowest risk), integrations second (needs the API), agents last (highest trust bar).

### 1.1 Template Marketplace

- **Description:** Agencies and creators publish workspace templates — project blueprints ("Webflow site build, 6 weeks"), proposal and contract packs, SOP libraries, automation bundles, full "agency-in-a-box" setups. One-click install into a workspace with entity remapping and preview-before-install.
- **Value:** Slashes onboarding time (the known Phase 5 bottleneck), seeds network effects, and creates a creator community with skin in the game. Shared template links double as top-of-funnel marketing.
- **Monetization:** Free + paid templates; 20–30% platform fee on paid; verified-creator program; AurexDesigns publishes flagship first-party templates — which also proves the creator tooling works.
- **Prerequisites:** Stable export/import of cross-module entity graphs; template versioning; content moderation and a review pipeline; payout infrastructure (Stripe Connect).
- **Key risk:** an empty marketplace is worse than none — we must seed 30+ excellent first-party templates before opening third-party submissions.
- **Earliest phase:** 5 + 1 (first post-launch expansion). **Effort:** M.

### 1.2 AI Agents Marketplace

- **Description:** A catalog of installable Aurex agents — packaged LangGraph graphs with declared tool permissions, versioned prompts, and published eval suites. Examples: "SEO Audit Agent", "Proposal Closer", "Overdue Invoice Chaser", "Weekly Client Reporter". Third-party developers submit agents through a certification pipeline.
- **Value:** This is the "App Store moment" for the AI-OS positioning in [01_Project_Vision.md](./01_Project_Vision.md) — agencies buy *outcomes*, not features. It is differentiation no horizontal PM tool can copy quickly.
- **Monetization:** Paid agents (one-off or subscription); usage-metered pricing layered on the AI gateway's existing metering; 25–30% platform fee; certification fee for commercial publishers.
- **Prerequisites:** Hardened agent sandboxing and permission scoping — an installed agent must always be *less* privileged than the installing user; the R-AI rules extended to third-party code ([12_Project_Rules.md](./12_Project_Rules.md) §5); a public eval harness; an agent manifest specification; liability and ToS work.
- **Key risk:** one badly behaved third-party agent damaging a customer's client relationship taints the whole platform — certification must be genuinely strict, even at the cost of catalog size.
- **Earliest phase:** 5 + 2. **Effort:** L.

### 1.3 Integration Marketplace

- **Description:** Directory of first- and third-party connectors — accounting (Xero/QuickBooks), ad platforms, design tools, hosting providers — built on the public API + webhooks (§5), with OAuth-scoped per-workspace installs and n8n-powered recipes underneath.
- **Value:** Kills the "but we also use X" sales objection permanently; every integration is an acquisition channel from the partner's ecosystem.
- **Monetization:** Free core connectors; premium connectors gated by plan; revenue share for partner-built paid connectors.
- **Prerequisites:** Public API GA (§5); webhook delivery infrastructure with signing and retries; connector review process; per-integration least-privilege tokens (R-S6).
- **Key risk:** connector maintenance is a permanent tax — every first-party connector we ship is a support commitment forever; prefer partner-built where possible.
- **Earliest phase:** 5 + 1, hard-dependent on §5. **Effort:** M–L.

## 2. Password Manager module

- **Description:** Agency-grade credential vault: per-client credential collections (hosting, domains, CMS logins, ad accounts), role- and client-scoped sharing, browser-extension autofill, rotation reminders, and a full access audit trail — replacing the shared-spreadsheet horror show agencies actually use today.
- **Value:** Enormous. Credential chaos is a universal, painful, security-critical agency problem, and solving it deepens the "the entire business lives here" moat more than almost any feature.
- **Why it is deferred — explicitly:** a password manager is a different *security product class* from the rest of AurexOS:
  - It demands a **zero-knowledge, client-side encryption** architecture — we must be *unable* to read vault contents. That is a strictly higher bar than our RLS isolation model and cannot share its implementation.
  - It carries a **certification and audit burden**: independent cryptographic review, penetration testing, and security certifications that customers rightly demand before trusting a vault.
  - A **browser extension** is a large new attack surface with its own release and review pipeline.
  - The incident calculus is asymmetric: a single vault breach ends the credibility of the entire platform, not just the module.
  - Building it before the core platform has mature security operations (post-SOC 2 certification) would be reckless. Until then: integrate with 1Password/Bitwarden rather than compete with them.
- **Prerequisites:** SOC 2 achieved (certification, not just readiness); dedicated security engineering capacity; externally reviewed zero-knowledge design; pen-tested extension.
- **Key risk:** the module competes with mature, audited incumbents on their home turf; a "good enough" vault is a liability, not a feature. Ship excellent or not at all.
- **Earliest phase:** 5 + 3 at the earliest. **Effort:** L.

## 3. Mobile apps

- **Description:** Native iOS/Android apps — likely React Native/Expo to reuse types and design tokens — focused on: push notifications, **approvals** (approve an AI action or an invoice from your phone), task triage, quick capture, Aurex chat, and a client-portal mode. Explicitly *companion* scope: full workspace editing stays on desktop web.
- **Value:** Approvals and notifications are the real mobile jobs-to-be-done. An approval card sitting unanswered for six hours because the owner was at lunch undermines the human-in-the-loop AI model ([12_Project_Rules.md](./12_Project_Rules.md) R-AI3). Native apps are also table stakes for commercial credibility in Phase 5+ sales.
- **Staging:** a PWA with web push is the cheap validation step (S effort) and can land earlier; native apps follow if engagement proves out.
- **Prerequisites:** API maturity (§5, at least internally stable); notification infrastructure v1 (Phase 4); a mobile extension of the design tokens in [11_Design_Principles.md](./11_Design_Principles.md).
- **Key risk:** native apps double the release surface for a small team; the PWA validation step exists precisely to avoid committing to that before the mobile jobs-to-be-done are proven.
- **Earliest phase:** PWA late Phase 5; native 5 + 1. **Effort:** S (PWA) / L (native).

## 4. White-labeling for agencies

- **Description:** Agencies present AurexOS to *their* clients as their own platform: custom domain, logo, theme tokens, authenticated sender domains for email, white-labeled client portal and reports. Tiered: "branded portal" (light) → "full white-label" (deep, including login pages and PDF documents).
- **Value:** Agencies can sell client access as part of their retainer — AurexOS becomes revenue-*positive* for its customers, which is the strongest retention lever that exists. Natural anchor feature for the premium plan.
- **Prerequisites:** Token-driven theming (already structural — [11_Design_Principles.md](./11_Design_Principles.md) §2 makes this cheap); multi-domain routing with automated SSL; per-workspace email domain auth (SPF/DKIM/DMARC); brand rules for where "Powered by AurexOS" remains.
- **Key risk:** deep white-label trades away our own brand distribution — the "Powered by" placement rules are a commercial decision to make deliberately, not a theming detail.
- **Earliest phase:** Light portal branding is already in Phase 4 ([10_Roadmap.md](./10_Roadmap.md) §7); full white-label 5 + 1. **Effort:** M.

## 5. Public API, developer platform & webhooks

- **Description:** Versioned public REST API (OpenAPI-first) over every module; scoped API keys per workspace; signed webhooks for all domain events (the internal event core of R-A6 becomes an external contract); TypeScript SDK first; developer docs portal; sandbox workspaces; per-plan rate limits.
- **Value:** The prerequisite for the integration and agent marketplaces (§1.2, §1.3). Converts "AurexOS doesn't do X" into "someone built X on AurexOS". Also an enterprise-sales checkbox.
- **Prerequisites:** API stability discipline — deprecation policy and versioning recorded as ADRs (R-DOC2); per-token least privilege (R-S6); abuse and rate-limit infrastructure; sustained developer-docs investment.
- **Key risk:** premature GA freezes internal schemas mid-evolution; every endpoint published is a contract we maintain for years. Publish narrow, expand deliberately.
- **Earliest phase:** 5 + 1 for public GA. The internal API is implicitly built much earlier; *publishing* it is the commitment, because published contracts can never be casually broken. **Effort:** M–L.

## 6. AurexOS agents that do client work

- **Description:** Beyond operating the agency, Aurex agents perform billable *delivery* work:
  - automated **SEO audits** with prioritized, explained fixes;
  - **website-monitoring incidents** that don't just alert but open a task *with the proposed fix* (DNS records, SSL renewal, performance regressions);
  - content briefs generated from the client's knowledge-base context;
  - monthly client-facing performance reports, drafted end-to-end.
  - Human review gates everything outbound — R-AI3 applies to delivery work exactly as it does to operations.
- **Value:** This is the vision's endgame — "half the operational headcount, twice the throughput" ([01_Project_Vision.md](./01_Project_Vision.md)). Agencies stop paying for software and start paying for delivered work, letting pricing shift toward outcome- and usage-based models — a fundamentally better business than seats.
- **Prerequisites:** Phase 3 AI layer and Phase 4 monitoring in production long enough to trust; mature eval harness; per-agent-run cost accounting; clear liability framing for AI-produced deliverables.
- **Key risk:** delivery work is judged by the client's standards, not the software's — quality bars per agent family must be set from AurexDesigns' own billable-work standards and enforced by evals before any external agency relies on them.
- **Earliest phase:** First-party agents 5 + 1 — the SEO-audit and monitoring-fix agents are the natural firsts, dogfooded on AurexDesigns' own clients. Marketplace-delivered third-party agents follow §1.2. **Effort:** M per agent family; L for the underlying platform.

## 7. Voice interface

- **Description:** Talk to Aurex. Three distinct slices, in honesty-order:
  1. **Meeting transcription** → summarized notes → extracted action items as tasks (upgrading Phase 2's manual flow) — high value, well-trodden.
  2. **Voice capture** on mobile/desktop: "log a 30-minute call with Meridian; action items are…".
  3. **Conversational voice OS** — hands-free briefings ("what needs my attention today?") — differentiating but speculative.
- **Value:** Slice 1 alone is worth shipping; slices 2–3 ride on it once the pipeline exists.
- **Prerequisites:** AI gateway extended to speech models (R-AI1 still applies — through the gateway only); recording-consent compliance per jurisdiction; audio storage lifecycle on R2.
- **Key risk:** recording consent is jurisdictionally messy and reputationally sharp; the consent flow ships before the transcription feature, not with it.
- **Earliest phase:** Transcription 5 + 1 (S–M); conversational voice 5 + 2 (M).

## 8. Client-facing AI

- **Description:** A scoped Aurex inside the client portal. Clients ask: "what's the status of our website project?", "when is our next invoice due?", "resend the March report" — answered strictly from client-visible records, with the agency controlling tone, scope, and escalation-to-human rules, and full agency-side visibility of every conversation.
- **Value:** Cuts the status-update email tax — a real, daily cost in every agency — and makes the portal feel genuinely magical. A headline demo for Phase 5+ sales.
- **Why not sooner:** deliberately excluded from Phase 4 ([10_Roadmap.md](./10_Roadmap.md) §7 non-goals). A wrong answer here goes to *someone's customer*; the bar is different in kind:
  - client-role RLS battle-tested in production first (Phase 4 exit criteria);
  - retrieval scoping proven adversarially **at the client-role level** — stricter than R-AI4's workspace level;
  - hallucination rate near zero on the eval set, with "I don't know — I've asked the team" as the default failure mode.
- **Key risk:** agencies fear an AI speaking to their clients more than they value the time saved — agency-side controls, visibility, and a per-client kill switch are adoption requirements, not options.
- **Earliest phase:** 5 + 1. **Effort:** M.

## 9. Multi-workspace agency networks

- **Description:** Structures above the single workspace: agency groups (a parent org with subsidiary studios), white-label sub-workspaces per client, and **partner networks** — agencies subcontracting to each other through AurexOS with scoped project sharing, cross-workspace task handoff, and inter-agency invoicing.
- **Value:** Serves holding companies and the huge freelancer/subcontractor economy around agencies; cross-agency collaboration is a network effect competitors cannot bolt on.
- **Caution — this bends the data model:** this is the one idea on the page that touches tenancy itself. Cross-workspace sharing must be designed as explicit, auditable, revocable grants — probably a first-class "shared object" primitive — without weakening the RLS story (R-D1/R-D2) or the AI isolation guarantee (R-AI4). It requires its own ADR series and adversarial test expansion before a line of feature code. Do not attempt casually.
- **Prerequisites:** the ADR series above; mature audit tooling; real demand evidence from ≥ 3 customer pairs who want to collaborate.
- **Key risk:** a subtle grant bug here is a cross-tenant breach by construction — this idea has the highest security downside on the page relative to its demand evidence.
- **Earliest phase:** 5 + 2. **Effort:** L.

## 10. Benchmarking & insights across agencies

- **Description:** **Opt-in, privacy-first** anonymized benchmarks: "your average proposal close rate is 22% vs. 31% for similar-size agencies" — plus utilization, pricing, and project-margin norms — surfaced by Aurex as advisory insights and an annual industry report (§11).
- **Value:** Data agencies can get nowhere else; the compounding moat of a multi-tenant platform; a premium analytics tier.
- **Privacy stance (non-negotiable, designed before any code):**
  - Explicit per-workspace opt-in, default **off**, revocable — revocation removes the workspace from all future aggregates.
  - k-anonymity thresholds: no metric published from a cohort smaller than N=20 workspaces.
  - Aggregates only, computed in a separate, reviewed pipeline — never via tenant data crossing tenants in prompts. R-AI4 holds untouched.
  - Documented in the DPA and communicated plainly; no dark-pattern consent (per [11_Design_Principles.md](./11_Design_Principles.md) §12).
- **Prerequisites:** meaningful tenant base (50+ opted-in agencies for useful cohorts); legal review; privacy-reviewed aggregation pipeline.
- **Key risk:** a single privacy misstep here poisons trust in the entire multi-tenant promise; the privacy stance above is load-bearing, not marketing.
- **Earliest phase:** 5 + 2 at the earliest — the tenant base has to exist first. **Effort:** M.

## 11. Community & education

- **Description:** Aurex Academy (courses on AI-native agency operations), certification tracks for operators and for template/agent creators, a practitioner community space, an annual "State of Agency Operations" report (fed by §10 once it exists), and public playbooks drawn from AurexDesigns' own dogfooding.
- **Value:** Category creation. We are not selling a tool; we are selling a way of running an agency — and education is the cheapest durable acquisition channel. It also feeds marketplace creator supply (§1) and certification feeds trust in §1.2.
- **Prerequisites:** a product mature enough to teach (post-Phase 5); content and community capacity — this is headcount and consistency, not code.
- **Key risk:** community efforts die of inconsistency, not of bad ideas — do not start until someone owns it as a real part of their job.
- **Earliest phase:** Playbook content can start alongside the Phase 5 launch; structured academy 5 + 1. **Effort:** M, ongoing, mostly non-engineering.

## 12. Acquisition-ready metrics

Not a feature — an operating discipline. If AurexOS ever raises or is acquired, the diligence artifacts should already exist because we ran the company on them (inside AurexOS itself, via Analytics):

- **Growth:** MRR/ARR, net revenue retention, logo retention, expansion revenue, CAC and payback by channel.
- **Engagement:** DAU/WAU per workspace, module adoption depth, AI actions per active user, automation runs per workspace — the "OS-ness" metrics that prove AI is the interface, not a sidebar.
- **Marketplace (once live):** creator count, take-rate revenue, third-party attach rate.
- **Quality & trust:** uptime, security posture (SOC 2 status, incident history), audit-log completeness, and **gross margin including AI cost per user** — the metric that proves AI-native economics actually work.
- **Prerequisites:** PostHog + billing data unified into internal dashboards; a metrics-dictionary ADR so every number means exactly one thing.
- **Earliest phase:** instrumentation exists from Phase 0; the dashboard discipline formalizes in Phase 5. **Effort:** S, ongoing.

## 13. Summary table

| # | Idea | Value in one line | Earliest phase | Effort | Hard prerequisite |
|---|---|---|---|---|---|
| 1.1 | Template marketplace | Onboarding + ecosystem flywheel | 5 + 1 | M | Entity-graph export/import, payouts |
| 1.2 | AI agents marketplace | The "App Store" of the AI OS | 5 + 2 | L | Agent sandboxing, public evals |
| 1.3 | Integration marketplace | Kills integration objections | 5 + 1 | M–L | Public API GA (§5) |
| 2 | Password manager | Universal agency pain, huge trust bar | 5 + 3 | L | SOC 2 certified, zero-knowledge design |
| 3 | Mobile apps | Approvals & notifications anywhere | 5 (PWA) / 5 + 1 | S / L | Notification infra, API maturity |
| 4 | White-labeling | Customers resell us — retention | 4 (light) / 5 + 1 (full) | M | Token theming, multi-domain infra |
| 5 | Public API & webhooks | Platform prerequisite | 5 + 1 | M–L | Versioning discipline, rate limiting |
| 6 | Agents doing client work | The endgame economics | 5 + 1 | M–L | Phases 3–4 proven, evals |
| 7 | Voice interface | Transcription now, voice OS later | 5 + 1 / 5 + 2 | S–M / M | Speech via gateway, consent |
| 8 | Client-facing AI | Kills the status-update tax | 5 + 1 | M | Client-role RLS proven, near-zero hallucination |
| 9 | Agency networks | Cross-tenant network effects | 5 + 2 | L | Shared-object primitive ADRs |
| 10 | Benchmarking insights | Un-copyable data moat | 5 + 2 | M | 50+ opt-in tenants, privacy pipeline |
| 11 | Community & education | Category creation | 5 onward | M | Mature product, content capacity |
| 12 | Acquisition-ready metrics | Optionality & discipline | 0 onward | S | Metrics dictionary |

## 14. How ideas graduate

1. An idea gains an **advocate**, who writes a one-page brief: problem evidence (ideally from AurexDesigns dogfooding or explicit customer requests), a prerequisite audit against this document, and a proposed first slice small enough to validate cheaply.
2. The brief is reviewed at a **phase gate** ([10_Roadmap.md](./10_Roadmap.md) §11). Acceptance means it enters the next phase's deliverables with exit criteria — and this document is updated to mark the idea "graduated", with a link to its ADR.
3. Ideas that repeatedly fail to find evidence move to a **"parked"** section rather than being deleted — cheap to keep, honest about status.
4. Until graduation, per [12_Project_Rules.md](./12_Project_Rules.md): no speculative abstractions, no "future-proofing" code paths, no schema fields for features that live only on this page. The best preparation for these ideas is a clean, well-bounded core — which is what the rules already require.
