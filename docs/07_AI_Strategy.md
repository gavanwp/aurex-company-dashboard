# 07 — AI Strategy: The AI-Native Architecture

| | |
|---|---|
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO, AurexDesigns |
| **Related** | 08_Tech_Stack.md, 05_User_Roles.md, 06_Module_Breakdown.md, 08_Tech_Stack.md, 10_Roadmap.md, 05_User_Roles.md |

This is the architecture bible for everything AI in AurexOS. It is binding: any AI feature that cannot be expressed within this architecture either changes this document first or does not ship.

---

## 1. Philosophy: AI as Operating System, Not Feature

Most SaaS bolts a chatbot onto a database. AurexOS inverts this: **the AI layer is a first-class runtime of the platform**, on par with the database and the event bus. Concretely, this means five architectural commitments:

1. **One brain, many surfaces.** There is exactly one assistant — Aurex — reachable from chat, command palette, inline entity actions, automations, and proactive jobs. No per-module chatbot silos. All surfaces route through the same orchestrator, tool registry, context assembler, and audit trail.
2. **Modules are AI-legible by construction.** Every module ships three AI contracts alongside its features: (a) registered **tools** (typed actions Aurex can invoke), (b) **context providers** (how the module's data is summarized into AI context), (c) **event semantics** (what its events mean, so proactive AI can reason over the stream). A module without these contracts is not "done" — this is enforced in the definition-of-done (10_Roadmap.md).
3. **The event stream is the AI's sensory system.** The domain events table (06_Module_Breakdown.md, Appendix A) is not just for automations — it is how Aurex knows what is happening: digests, delay prediction, anomaly detection, and memory formation all consume the same stream humans' notifications do.
4. **Trust is the product.** An AI that acts on your CRM, money, and client relationships lives or dies on trust. Hence: permission inheritance with zero escalation (05_User_Roles.md §8), graduated autonomy with human gates, total auditability, and visible citations. We deliberately trade some "magic" for verifiability.
5. **Model-agnostic by contract, opinionated by default.** Claude is the primary brain (best-in-class agentic tool use and long-context reasoning); OpenAI is the hot fallback; the gateway abstraction (§4) means neither is load-bearing to the schema. We never let a vendor's SDK types leak past the gateway boundary.

**Non-goals (explicit):** we do not train or fine-tune foundation models on customer data (§8.6); we do not build a general-purpose agent platform before Phase 5's marketplace; we do not pursue full autonomy (L4 "unattended") for any action category that touches money, contracts, or outbound client communication.

---

## 2. Aurex Assistant Architecture

### 2.1 Component Overview

```
User surface (chat / palette / inline / automation step / scheduled job)
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (LangGraph)                               │
│                                                         │
│  Intake ─► Planner ─► Executor loop ─► Verifier ─► Respond
│               │            │               │            │
│               ▼            ▼               ▼            │
│        Context Assembler   Tool Registry   Approval Gate│
└───────┬───────────┬────────────┬───────────┬────────────┘
        ▼           ▼            ▼           ▼
   Memory layers  RAG (pgvector)  Module tools  AI Audit Trail
        │           │            │
        ▼           ▼            ▼
      AI GATEWAY (model routing, streaming, caching, budgets)
        │
        ├── Claude (primary)
        └── OpenAI (secondary/fallback)
```

### 2.2 Orchestrator: LangGraph, Planner/Executor

LangGraph gives us a **typed, inspectable state machine** rather than a free-running agent loop. The canonical graph:

| Node | Responsibility |
|---|---|
| **Intake** | Classify the request: simple Q&A / retrieval / single action / multi-step plan / refusal (out-of-scope, permission-blocked). Cheap model tier. Trivial requests skip planning entirely (fast path — most requests are fast-path). |
| **Planner** | For multi-step requests: produce an explicit, typed plan — ordered steps, each bound to a tool or retrieval, with expected outputs and risk classification per step. Plans for L2+ actions are surfaced to the user *before* execution ("here's what I'll do"). Strong model tier. |
| **Executor** | Runs steps: tool calls through the registry (each individually permission-checked and audited), retrievals through the context assembler. Bounded: max steps, max cost, max wall time per run; exceeding bounds pauses and asks the user. |
| **Approval Gate** | Any step classified L2 suspends the graph (LangGraph checkpointing to Postgres), emits an `ai.approval.requested` event → approval card (chat + Dashboard queue). Graph resumes on decision; expired approvals (72h default) cancel the run. |
| **Verifier** | Post-execution checks: did the action succeed, do outputs satisfy the plan, do stated facts match tool results (basic grounding check: every factual claim in the response must trace to a retrieval or tool output). Failures trigger one bounded repair loop, then honest error reporting. |
| **Respond** | Streamed answer with citations, action receipts (links to created/modified entities), and cost/trace ref for the audit trail. |

**State & durability:** run state checkpoints to Postgres after every node — approvals can be decided days later; crashes resume, not restart. Every run is an `AIRun` entity (06_Module_Breakdown.md §2) with the full trace.

**Sub-agents:** specialized sub-graphs (e.g., Proposal Drafter, Collections Assistant) are LangGraph subgraphs invoked as tools by the main orchestrator — same registry, same permissions, same audit. This is also the extension seam for the Phase 5 Agents Marketplace (§11).

### 2.3 Typed Tool Registry

Every module registers tools in a central, typed registry — this is the single most important contract in the AI architecture.

**Tool definition (conceptual):**

| Field | Meaning |
|---|---|
| `key` | `module.tool_name`, e.g. `crm.update_deal_stage`, `finance.draft_invoice` |
| `description` | Model-facing usage guidance (versioned, evaluated — see §10) |
| `input_schema` / `output_schema` | Zod-defined, validated at runtime on both sides; malformed tool calls are rejected, never "fixed up" silently |
| `required_permission` | The atomic permission from 05_User_Roles.md §3.1 checked against the invoker on every call |
| `risk_class` | `read` / `create` / `mutate` / `outbound` / `destructive` — drives the autonomy floor (§7): `outbound` and `destructive` can never run below L2 |
| `side_effects` | Declared events the tool emits; idempotency key support for safe retries |
| `cost_hint` | Cheap/expensive — planner uses it to order and prune steps |
| `surface_scope` | internal / portal / both — portal Aurex sees only `portal`-scoped tools (§8.7) |

**Rules:**
- Tools are the **only** way Aurex mutates anything. No raw SQL tool, no generic HTTP tool, no "execute code" tool in production surfaces.
- Tool handlers run under the invoking user's RLS context (05_User_Roles.md §8) — the permission check is defense-in-depth on top of RLS, not instead of it.
- Read tools return **shaped DTOs**, not raw rows — field-level permissions (comp data, margins) are applied in the DTO shaping, so the model never sees what the user couldn't.
- Registry snapshots are versioned; every AIRun records the registry version it ran against (reproducibility for evals and incident review).

### 2.4 Context Assembly

Context assembly is a **budgeted, ranked pipeline**, not "stuff everything in":

1. **System frame:** Aurex identity, workspace profile (name, industry, tone-of-voice profile), invoking user (role, specialization, timezone), current autonomy policy, today's date.
2. **Surface context:** what the user is looking at (entity anchor: this project, this deal, this thread) — always included, most trusted.
3. **Conversation memory:** current conversation, summarized beyond a token threshold (§2.5).
4. **Retrieved context:** RAG results (§5) + structured queries via read tools, ACL-filtered, each tagged with source and trust level.
5. **Event recency signals:** recent relevant events for the anchored entities ("invoice went overdue yesterday").
6. **User/workspace memory items:** curated preferences and standing instructions (§2.5).

Each layer has a token budget; the assembler ranks within budget (relevance × recency × trust). **Every context block carries provenance and a trust tier** — trust tiers feed the prompt-injection defenses in §8.3 (workspace-authored KB ≻ internal docs ≻ meeting transcripts ≻ inbound email ≻ web content).

### 2.5 Memory Layers

| Layer | Store | Scope & lifetime | Content |
|---|---|---|---|
| **Short-term** | Conversation messages + rolling summary | Per conversation | Dialogue state; summarization compresses beyond threshold, pinned facts survive compression |
| **Working** | LangGraph checkpointed state | Per run | Plan, intermediate tool results, pending approvals |
| **Long-term explicit** | `memory_items` table | Per user / per workspace; until edited or expired | Preferences ("keep my updates brief"), standing facts ("our default payment terms: net-15"), corrections. **User-visible and editable** — memory is a feature, not surveillance. Writes are L1 (Aurex proposes "should I remember this?") or explicit user commands |
| **Workspace knowledge (RAG)** | pgvector | Per workspace, per ACL | Documents, KB, transcripts, threads — §5 |
| **Structured truth** | Postgres via read tools | Live | Never memorized — always queried fresh. Aurex must not "remember" an invoice status; it must look it up |

The last rule is a core anti-hallucination stance: **facts that have a table are retrieved from the table**, never from memory or embeddings alone.

---

## 3. Where AI Runs

Three execution contexts, one architecture:

| Context | Trigger | Identity & permissions | Examples |
|---|---|---|---|
| **Interactive** | User chat/palette/inline | Invoking user (05_User_Roles.md §8) | Q&A, drafting, actions |
| **Automation step** | Automation Studio run | Automation creator, re-validated per run (06_Module_Breakdown.md §17) | Classify, summarize, draft inside flows |
| **Proactive/scheduled** | Cron / event patterns | Workspace AI service context — Owner-configured, default read-only; outputs filtered per recipient's permissions | Digests, delay prediction, anomaly alerts (§6) |

---

## 4. AI Gateway

The gateway is the **only** code path to model providers. Nothing above it knows or cares which vendor served a request.

### 4.1 Design

- **Model-agnostic contract:** internal request/response types (messages, tool specs, streaming deltas, usage) owned by us; provider adapters (Claude, OpenAI) translate. Adding a provider = adding an adapter, zero orchestrator changes.
- **Routing policy (task-based tiering):**

| Tier | Workloads | Primary → fallback |
|---|---|---|
| **Frontier** | Planning, multi-step agentic runs, proposal/contract drafting, complex analysis | Claude frontier model → OpenAI frontier |
| **Standard** | Single-step drafting, summarization, meeting extraction, NL→query | Claude mid-tier → OpenAI mid-tier |
| **Light** | Classification, triage, routing, extraction, embeddings-adjacent chores | Claude small → OpenAI small |
| **Embeddings** | RAG vectors | Dedicated embedding model; **provider pinned per workspace corpus** (mixing embedding models in one index breaks retrieval; migration = re-embed job) |

  Routing inputs: task type (declared per orchestrator node/tool), workspace tier preference (AI governance policy), current provider health, remaining budget (§9). Router decisions are logged per call.
- **Failover:** health-checked providers; on error/timeout/rate-limit → retry with backoff → cross-provider failover mid-conversation (state is ours, not the provider's, so failover is transparent). Degraded mode: if all providers are down, AI surfaces show honest unavailability; **no core OS workflow hard-depends on a live model** — AurexOS without AI degrades to an excellent conventional platform, never to a broken one.
- **Streaming:** first-class SSE end-to-end (gateway → orchestrator → UI); tool-call deltas surfaced as live "working" states ("querying CRM…"); approval cards can interrupt a stream.
- **Caching:**
  - Provider-side prompt caching for stable prefixes (system frame, tool registry, workspace profile) — the biggest single cost lever for agentic loops.
  - Gateway response cache for deterministic, low-temperature tasks (classification of identical inputs, repeated digest sub-queries), keyed by (model, prompt hash, tool state), short TTL, **never** cached across workspaces.
- **Uniform telemetry:** every call logs workspace, user/run ref, model, tokens in/out/cached, latency, cost, outcome — feeding budgets (§9), evals (§10), and the AI audit trail (§8.4).
- **Compliance posture:** zero-data-retention / no-training API agreements with both providers; regional routing options deferred to Phase 5 (see 05_User_Roles.md).

---

## 5. RAG Pipeline

### 5.1 Ingestion

Event-driven, not batch: content events (`documents.document.published`, `kb.page.verified`, `meetings.transcript.ingested`, `email.thread.linked`, `files.file.uploaded`→text-extracted) enqueue ingestion jobs (Postgres queue → Edge Function workers).

Per document: extract text → clean/normalize → chunk → embed → upsert vectors with metadata `{workspace_id, source_type, entity_ref, acl_digest, verification_state, updated_at, content_hash}`. Re-ingestion is hash-diffed (only changed chunks re-embed). Deletes/ACL changes propagate within minutes (queue priority) — a revoked document must promptly stop appearing in answers.

### 5.2 Chunking

- Structure-aware: block/heading-based for documents and KB (chunks align to semantic sections, headings retained as chunk context); speaker-turn windows for transcripts; thread-message units for email.
- Target 300–800 tokens per chunk with parent-context enrichment (each chunk stores a breadcrumb: doc title → section path) — retrieval returns the chunk, context assembly can widen to parent section when budget allows.
- Tables and pricing blocks are chunked whole with a generated natural-language caption (tables embed poorly raw).

### 5.3 Per-Tenant Isolation

- Vectors live in Postgres (pgvector) under the same RLS regime as everything else: **every vector row carries `workspace_id` and is RLS-scoped**. There is no cross-workspace index, query, or cache — isolation is structural, not a filter we hope holds.
- Within a workspace, ACL enforcement is two-stage: metadata pre-filter on the vector query (source ACL digest) + authoritative post-filter re-checking the invoker's effective permission on each hit before context inclusion (05_User_Roles.md §8.3). Post-filter is the guarantee; the pre-filter is an optimization.
- Scale path: pgvector with HNSW per-workspace partial indexes carries us through Phase 4; if a dedicated vector store is ever warranted, the gateway-style abstraction rule applies (adapter, same isolation contract). Decision trigger metrics in 08_Tech_Stack.md.

### 5.4 Hybrid Search & Retrieval Quality

- **Hybrid by default:** pgvector semantic + Postgres FTS (BM25-style ranking) fused with reciprocal rank fusion — semantic recall plus exact-match precision (invoice numbers, names, jargon).
- Re-ranking pass (light model tier) on the fused top-K for high-stakes queries (planner-flagged).
- **Source weighting:** verified KB pages ≻ published documents ≻ meeting summaries ≻ raw transcripts ≻ email. Stale-flagged KB content is down-weighted and answer citations disclose verification state (06_Module_Breakdown.md §13).
- Retrieval telemetry: per-query logged hits, used-in-answer flags, and user feedback ("wrong source") feed the retrieval eval set (§10).

---

## 6. Proactive AI

Proactive AI consumes the event stream and scheduled jobs — it never waits to be asked. All proactive output is **per-recipient permission-filtered** (§3) and delivered through the Notifications engine.

| Capability | Mechanism | Autonomy |
|---|---|---|
| **Daily/weekly digests** | Scheduled per-user job: events since last visit + due/at-risk items → narrated briefing (Dashboard + email) | L3 read-only |
| **Delay prediction** | Nightly per-project job: task velocity, blocked-age, critical-path, scope growth, capacity → risk score + plain-language reasoning to PM | L0 (surfaced insight) |
| **Anomaly detection** | Streaming/periodic checks over Analytics read models: expense outliers, funnel shifts, AR aging jumps, utilization cliffs | L0 → L1 (proposes investigation task) |
| **Deal & account risk** | Activity-cadence + sentiment models over CRM/email/meeting events | L0/L1 (drafts re-engagement) |
| **Pre-meeting briefs** | Calendar-triggered context assembly 30 min before meetings | L3 read-only |
| **Suggestions** | Pattern detection: repeated manual sequences → automation recipes; recurring unanswered questions → KB gap briefs; stale tasks → triage proposals | L1 |
| **Renewal/obligation radar** | Contract dates + account health → renewal posture briefs | L0/L1 |

**Noise discipline:** proactive AI is subject to the Notifications engine's preference/batching rules and its own precision bar — every proactive surface tracks acted-on rate, and any surface whose acted-on rate stays below threshold gets throttled automatically. An AI that cries wolf gets muted by architecture, not by annoyed users.

---

## 7. Autonomy Levels

The graduated-trust spine of the whole system:

| Level | Name | Behavior | Examples |
|---|---|---|---|
| **L0** | Suggest | Insight/recommendation only; user acts manually | Lead scores, delay risk, pricing guidance |
| **L1** | Draft | Produces an artifact a human explicitly applies/sends | Email drafts, proposal drafts, expense categorization proposals |
| **L2** | Act with approval | Prepares a concrete action; executes only on explicit approval (approval card) | Send invoice reminder, create project structure, bulk-close stale tasks |
| **L3** | Act and report | Executes autonomously, reports via notification, always reversible or read-only | Auto-linking email threads, digest generation, meeting auto-logging, notification ranking |

**Configuration model:**
- Workspace **autonomy ceiling** (Owner-set, Settings AI governance panel) caps everything.
- Per **action category** levels within the ceiling (categories: read/analyze, internal create, internal mutate, outbound communication, financial, destructive).
- **Hard floors that no configuration can lift:** outbound client communication ≤ L2 (human approval always); anything `destructive` ≤ L2 plus reversibility requirement; contract sending is permanently human-gated (06_Module_Breakdown.md §11); Settings/roles/permissions mutations are permanently human-only (06_Module_Breakdown.md §21); L4 (unattended goal pursuit) does not exist in this architecture.
- Effective level = min(workspace ceiling, category level, tool risk-class floor, invoker's own permission to do the thing manually) — per 05_User_Roles.md §8.
- **Trust ratchet:** workspaces earn recommendations to raise specific categories based on approval statistics ("you've approved 96% of invoice reminders for 3 months — raise to L3? [not available: financial category, capped at L2]"). Ratchet suggestions themselves are L0.

---

## 8. Safety & Governance

### 8.1 Human-in-the-Loop as Architecture

Approval is not a UI afterthought — it is a first-class orchestrator state (§2.2): typed proposed-action payloads, checkpointed runs, expiring approvals, batch-approval UX for repetitive low-risk actions (with per-item visibility), and approval statistics feeding the trust ratchet. Approvers must themselves hold the permission being exercised.

### 8.2 AI Audit Trail

Every AIRun records: trigger + surface, invoking identity, full context manifest (what was assembled, with provenance — stored as references + hashes, not full copies, for storage sanity), model calls (gateway telemetry), plan, every tool invocation with inputs/outputs digests, approval records, final output, cost, and registry/prompt versions. Mutations land in the platform audit log as `actor via aurex` with `ai_run_id` linkage (05_User_Roles.md §10). Retention: 12 months full trace, summarized thereafter (open question in 06_Module_Breakdown.md §2 — confirmed here as default pending data-volume review).

### 8.3 Prompt-Injection Defense

Aurex reads emails, uploaded documents, transcripts, and web content — all attacker-reachable channels. Layered defenses:

1. **Trust tiering:** every context block is provenance-tagged (§2.4). Untrusted content (inbound email, client uploads, external web) is wrapped in explicit data-boundary framing: *content to analyze, never instructions to follow*.
2. **Instruction/data separation:** system and planner instructions never interpolate untrusted content; untrusted content enters only as clearly delimited data blocks.
3. **Capability discipline:** the tool registry is the only action path; there is no "follow the instructions in this document" capability to hijack. Tool calls triggered while untrusted content is in context and classified `outbound`/`mutate`/`destructive` have their effective autonomy dropped one level (an email can never cause an unapproved outbound action — the approval gate catches the classic "forward this to attacker@" injection).
4. **Detection:** light-tier screening of untrusted content for injection patterns before context inclusion; hits are flagged in the run trace and surfaced to the user ("this email contains text that looks like instructions to an AI — treated as data").
5. **Egress checks:** responses and outbound drafts are screened against context-derived sensitive tokens (credentials-shaped strings, other-client identifiers) before delivery.
6. **Red-team suite:** injection scenarios are a permanent part of the eval regression suite (§10) — email-borne, document-borne, transcript-borne.

### 8.4 Tenant Isolation & Data Boundaries

- All AI reads/writes occur under workspace RLS (§2.3, §5.3). Cross-tenant context assembly is structurally impossible, not policy-forbidden.
- Gateway caches are workspace-keyed (§4); embeddings are workspace-scoped rows; conversation and memory stores are workspace-scoped.
- Portal Aurex (§8.7) is a second, stricter boundary within the tenant.

### 8.5 No Cross-Tenant Training

- Customer data is never used to train or fine-tune models — ours or providers'. Provider agreements: zero retention, no training (§4).
- Cross-tenant *product* learning (e.g., improving prompts from aggregate outcomes) uses only de-identified, aggregate telemetry (acceptance rates, latency, eval scores) — never content. This is a contractual commitment for Phase 5 SaaS, written into the DPA (05_User_Roles.md).

### 8.6 PII Handling

- Event payloads and RAG metadata carry PII classification (06_Module_Breakdown.md Appendix A); PII-classified fields are excluded from telemetry and eval-set harvesting by default.
- Eval datasets built from real workspace data require explicit scrubbing pipeline + internal-workspace-only sourcing until Phase 5 consent flows exist.
- Comp data, margins, and other field-restricted data follow DTO shaping (§2.3) — the model never receives what the invoker can't see; proactive jobs never include field-restricted data in per-recipient outputs unless the recipient holds the field permission.
- Right-to-erasure: hard-delete flows cascade to vectors, memory items, conversation logs, and cached artifacts (deletion propagation is part of the ingestion pipeline's contract, §5.1).

### 8.7 Portal Aurex (Client-Facing) — Stricter Profile

If/when enabled (Phase 4 opt-in decision, 05_User_Roles.md open questions): separate system frame; tool registry filtered to `portal`-scoped read tools only; RAG restricted to portal-visible corpus (client-facing KB, shared docs); no memory of internal context; every answer logged and sampled for boundary review; any question requiring internal data gets a graceful "I'll pass this to your project team" that opens a portal message thread. No mutating tools in v1 beyond message/booking creation.

---

## 9. Cost Management

- **Budgets:** per-workspace monthly token/cost budgets (Owner-set within plan limits at Phase 5; internal soft caps before). Enforcement at the gateway: 80% → notify Owner; 100% → interactive AI continues on Light tier only + proactive jobs pause; hard cap → graceful AI-unavailable state. Per-user daily soft caps prevent single-user runaway.
- **Model tiering as the primary lever (§4):** the router's default posture is "cheapest tier that meets the task's quality bar," with quality bars set by evals (§10), not vibes.
- **Prompt caching:** stable system frames and tool-registry prefixes are engineered for provider cache hits (ordering, stability discipline in prompt construction). Target: >60% cached input tokens on agentic runs.
- **Context frugality:** budgeted assembly (§2.4) beats long-context maximalism; retrieval precision work is cost work.
- **Run bounds:** step/cost/time ceilings per run (§2.2) make worst-case spend per interaction a known constant.
- **Observability:** cost per run / per capability / per workspace / per model on the internal Analytics surface; weekly cost regression review is an engineering ritual. Every new AI capability ships with a projected and then measured unit cost.
- **Phase 5:** AI usage becomes a metered plan dimension; budget UI graduates to customer-facing with usage analytics and tier controls.

---

## 10. Evaluation Strategy

AI behavior is tested like code — no prompt, tool description, routing rule, or agent graph changes without eval coverage.

- **Layers:**
  1. **Unit evals** — per prompt/tool description: golden input→expected behavior sets (classification accuracy, extraction fidelity, tool-selection correctness). Run in CI on every change to prompt assets (prompts are versioned files in the monorepo, not strings in code).
  2. **Retrieval evals** — query→expected-source sets per corpus type; measures recall@K, precision, and ACL-leak checks (a leak is a build-failing event, not a metric).
  3. **Agent/scenario evals** — scripted multi-step scenarios against a seeded fixture workspace ("convert this won deal into a project with template X"): asserts plan quality, correct tool sequence, approval-gate triggering, final state. LLM-judge scoring for narrative quality (digest readability, draft tone) with periodic human calibration.
  4. **Safety regression suite** — prompt-injection corpus (§8.3), permission-boundary probes (every role attempting above-permission asks), cross-tenant probes, autonomy-floor probes. **Blocking:** any safety regression blocks deploy.
- **Live quality signals:** acceptance rate of drafts, approval rate of proposed actions, edit distance on accepted drafts, citation-click and "wrong source" feedback, proactive acted-on rates (§6) — dashboarded per capability, feeding both the trust ratchet and eval-set growth (failures become test cases).
- **Model migration protocol:** new model versions/tiers run the full eval suite in shadow before routing traffic; cost/quality deltas reviewed; staged rollout by workspace cohort with rollback via router config (no deploy needed).
- **Ownership:** each module team owns its tools' unit evals; platform team owns retrieval, agent, and safety suites. Eval health is on the engineering scorecard from Phase 3 day one.

---

## 11. Per-Module AI Capability Catalog

Authoritative summary (full context per module in 06_Module_Breakdown.md; autonomy per §7):

| Module | Capabilities (autonomy) |
|---|---|
| Dashboard | Daily digest (L3-read); NL widget creation (L1); anomaly callouts (L0) |
| CRM | Lead qualification & scoring (L0/L1); deal-risk signals (L0); auto-logged activities (L3-read); follow-up drafting (L1, send L2); NL pipeline queries (L0) |
| Projects | Delay prediction (L0); status-update drafting internal + client-safe (L1); scope-creep detection (L0); setup-from-brief (L1/L2); health suggestion (L0) |
| Tasks | NL task creation (L2); task breakdown & estimates (L1); assignment suggestions (L0); stale/blocked triage (L1); estimate calibration (L0) |
| Calendar | NL scheduling (L2); focus-time protection (L1); meeting-load hygiene (L0) |
| Meetings | Summaries + client-safe variants (L1); action-item extraction (L1→Tasks on accept); pre-meeting briefs (L3-read); cross-meeting recall (L0) |
| Email Center | Reply drafting (L1, send L2 — hard floor); triage & thread summaries (L3-read); commitment extraction (L1); sentiment→CRM signals (L0) |
| Finance | Expense auto-categorization (L1/L2-capped); invoice drafting from context (L1); collections drafting (L1, send L2 — never L3); cash-flow forecast (L0); expense/margin anomalies (L0) |
| Proposals | Full first-draft generation (L1); case-study selection (L0); pricing guidance (L0); win/loss insights (L0) |
| Contracts | Template drafting (L1, send permanently human-gated); clause-deviation analysis (L0); obligation extraction (L1); plain-language summaries (L0); renewal posture (L0) |
| Documents | Inline AI blocks — draft/rewrite/summarize (L1); doc Q&A (L0); event-triggered auto-drafts (L1); consistency checks (L0) |
| Knowledge Base | Cited answers (core RAG); gap detection (L1); SOP drafting from observed practice (L1); staleness prediction (L0) |
| Clients | Account health scoring (L0); churn alerts + outreach drafts (L0/L1); on-demand account briefs (L3-read); upsell detection (L1) |
| Client Portal | Client-safe update drafts (L1, PM-approved); optional Portal Aurex (§8.7); team nudges from client behavior (L0) |
| Team & HR | Capacity/hiring signals (L0); skills-aware staffing (L0); onboarding copilot (RAG); self-review skeletons (L1, scoped) |
| Automation Studio | NL automation building (L1 — never auto-activated); AI steps in flows (inherit §7 rules); repetition→recipe suggestions (L0); failure diagnosis (L1) |
| Notifications | Priority ranking (L3-read); digest narration (L3-read); noise reports (L1) |
| Analytics | NL analytics with lineage (L0); anomaly detection + explanations (L0); narrated business reviews (L1); labeled forecasts (L0) |
| Website Monitoring | Incident triage & first-action drafts (L0/L1); narrated client health reports (L1); renewal/upsell signals (L1) |
| Settings & Permissions | Explain-only — no mutation at any level (hard floor) |

---

## 12. Future: AI Agents Marketplace (Phase 5)

The architecture above is deliberately the substrate for a marketplace of installable agents:

- **An agent =** a packaged LangGraph subgraph + tool-permission manifest + prompt assets + eval set + metadata (author, pricing, category). Examples: "SEO Audit Agent", "Ad-Spend Optimizer", "Bookkeeping Reconciler".
- **Installation contract:** the manifest declares every tool and permission the agent needs; install shows the diff (like mobile app permissions); the agent runs strictly within the installing workspace's autonomy policy and the invoking user's permissions — marketplace agents get **no** new primitive capabilities, only compositions of registered tools. Third-party tools (external API calls) run through vetted n8n-style connectors with credential vaulting, never arbitrary egress.
- **Review & safety:** submission pipeline runs our safety regression suite against the agent's graph; agents ship with their eval sets and minimum score bars; runtime sandboxing (bounded steps/cost, no registry mutation); kill-switch per agent version; full AIRun auditing identical to first-party Aurex.
- **Commercials:** revenue share, per-run or subscription pricing metered through the same gateway telemetry; AurexDesigns' own vertical agents seed the catalog.
- **Prerequisite gates (must be true before building):** tool registry stable ≥ 2 phases; eval infrastructure mature (§10); tenant isolation independently audited (05_User_Roles.md); public API + webhooks shipped (events table as the integration spine, 06_Module_Breakdown.md Appendix A).

---

## 13. Open Questions

1. **Portal Aurex timing** — Phase 4 opt-in vs. Phase 5, pending the safety review in §8.7 passing red-team gates. (Shared with 05_User_Roles.md.)
2. **Embedding model pinning vs. re-embed cadence** — how aggressively to chase embedding-model improvements given re-embed cost per workspace (§4 routing table). Propose: annual review, migration only on measured retrieval-eval gains > 10%.
3. **On-device/edge inference for Light-tier tasks** at Phase 5 scale (cost lever) — revisit when Light-tier volume data exists.
4. **LLM-judge calibration cadence** for narrative-quality evals — monthly human calibration sample size to be set after first quarter of Phase 3 data.
5. **AIRun trace retention** — 12-month full-trace default confirmed here; storage-cost review at 6 months of Phase 3 usage may shorten full-trace window for L0/read-only runs.
