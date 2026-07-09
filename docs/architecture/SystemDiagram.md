# System Diagram — The Visual Atlas of AurexOS

| | |
|---|---|
| **Document** | System Diagram — Visual Atlas |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO, AurexDesigns |
| **Related** | `./Architecture.md`, `../08_Tech_Stack.md`, `../07_AI_Strategy.md`, `../09_Scaling_Strategy.md`, `../13_Folder_Structure.md`, `../06_Module_Breakdown.md`, `../adr/0001_Multi_Tenant_Modular_Monolith.md` |

This document is the diagram companion to `./Architecture.md`. Every picture here visualizes a decision that is already binding elsewhere in the planning suite — nothing in this atlas introduces new architecture. When a diagram and a prose document disagree, the prose document wins and this file gets fixed. Each section states the phase in which the depicted machinery exists; mechanisms that only appear when a scaling trigger fires are drawn as such and labeled with their trigger (`../09_Scaling_Strategy.md`).

---

## 1. Overall System

```mermaid
flowchart TB
    subgraph devices["Client devices — untrusted zone"]
        agencyBrowser["Agency user browser — (os) shell"]
        portalBrowser["Client browser — (portal) views"]
    end

    subgraph vercel["Vercel — application trust zone"]
        nextapp["Next.js App Router: RSC pages + Server Actions + middleware"]
    end

    subgraph supabase["Supabase — data trust zone"]
        pgdb[("Postgres: RLS + pgvector + domain_events + jobs")]
        sbauth["Supabase Auth — JWT issuer"]
        edgefn["Edge Functions: webhooks, jobs, AI pipelines"]
        realtime["Realtime — workspace-scoped channels"]
        sbstorage[("Supabase Storage — standard files")]
    end

    subgraph aizone["AI boundary — packages/ai gateway is the only door"]
        gateway["AI Gateway: tiering, metering, failover"]
        claude["Anthropic Claude — primary"]
        openai["OpenAI — secondary"]
    end

    subgraph externals["External services — vendor trust zone"]
        r2[("Cloudflare R2 — large/CDN assets")]
        n8n["n8n on Docker VM — external automation"]
        vendors["Stripe / Google / Resend / e-sign / transcription"]
        telemetry["Sentry + PostHog"]
    end

    agencyBrowser -->|HTTPS| nextapp
    portalBrowser -->|"HTTPS — portal allowlist middleware"| nextapp
    nextapp -->|"Supavisor pooler, transaction mode"| pgdb
    nextapp --> sbauth
    agencyBrowser -.->|"websocket, RLS-authorized"| realtime
    realtime -.->|CDC| pgdb
    nextapp --> gateway
    edgefn --> gateway
    gateway --> claude
    gateway --> openai
    edgefn -->|"service_role, allowlisted ops"| pgdb
    vendors -->|"webhooks in"| edgefn
    n8n -->|"authenticated internal APIs only — never the DB"| nextapp
    edgefn -->|"webhooks out"| n8n
    nextapp -->|"presigned URLs"| sbstorage
    nextapp -->|"presigned URLs"| r2
    nextapp -.-> telemetry
```

The system is four trust zones around one database. Browsers are untrusted and reach only the Next.js application on Vercel, which is the sole request-time compute (`../08_Tech_Stack.md` §2.1). All application connections to Postgres go through Supavisor in transaction mode from day one (`../09_Scaling_Strategy.md` §3.4), and every row the app can touch is guarded by deny-by-default RLS keyed on `workspace_id` (`../adr/0001_Multi_Tenant_Modular_Monolith.md`). Supabase Edge Functions form the second compute surface — webhook receivers, scheduled jobs, and AI background pipelines — and are the only place the RLS-bypassing `service_role` key may exist, under a documented operation allowlist (`../09_Scaling_Strategy.md` §2.3).

Two boundaries deserve emphasis because they are enforced structurally, not by convention. First, the AI boundary: no code path reaches a model provider except through the gateway in `packages/ai` (`../07_AI_Strategy.md` §4) — provider SDK types never leak past it. Second, the n8n boundary: n8n handles external SaaS glue only and calls authenticated internal API endpoints, never the database, so RLS, RBAC, and audit remain the single enforcement path (`../08_Tech_Stack.md` §5.1). Everything in this diagram exists by Phase 2 except the AI zone (Phase 1 scaffold, Phase 3 full) and R2 (Phase 2).

---

## 2. Frontend Architecture

```mermaid
flowchart TB
    subgraph approuter["apps/web/app — routes only, thin"]
        authgroup["(auth) — login, signup, invite, workspace switch"]
        osgroup["(os) — authenticated OS shell: 20+ module routes"]
        portalgroup["(portal) — client portal, Phase 4, allowlist guard"]
    end

    subgraph modules["apps/web/modules — where the product lives"]
        rsc["RSC components — server-fetched, zero client JS"]
        islands["Client islands — Kanban, pipeline, chat, palette"]
    end

    subgraph clientstate["Client state — two stores, one rule"]
        tsq["TanStack Query v5 — server state, keyed workspaceId/module/entity"]
        zustand["Zustand — UI-only state: palette, panels, drafts, selections"]
    end

    subgraph serverside["Server side"]
        queries["modules/*/queries — RSC data access"]
        actions["modules/*/actions — Server Action mutation spine"]
        rtchan["Realtime channel ws:workspace:module"]
    end

    osgroup --> rsc
    osgroup --> islands
    authgroup --> rsc
    portalgroup -->|"portal-safe public surfaces only"| rsc
    rsc --> queries
    islands --> tsq
    islands --> zustand
    tsq -->|mutations| actions
    actions -->|"revalidate + event"| rtchan
    rtchan -.->|"invalidation hint — never source of truth"| tsq
```

Route groups carry URL structure and layout nesting; all real code lives in `apps/web/modules/{module}/`, imported only through each module's public surface (`../13_Folder_Structure.md` §2–3, §5). Server Components are the default: first paint for read-heavy views is fetched server-side inside the RLS-authenticated client, shipping no data-fetching JavaScript. Client islands are opt-in and justified per file — interactivity, browser APIs, animation (`../08_Tech_Stack.md` §2.1).

After first paint, the division of state is a single rule: if the server knows about it, it belongs in TanStack Query; if only this browser tab cares, Zustand (`../08_Tech_Stack.md` §2.6). Supabase Realtime closes the loop — every realtime payload is treated as an invalidation hint that triggers a workspace-keyed TanStack Query refetch, never as data to render directly, which keeps correctness in Postgres (`../08_Tech_Stack.md` §3.5). The `(portal)` group is the same app behind an allowlist middleware guard and a restricted import surface, with extraction to `apps/portal` pre-registered as a Phase 5 escape hatch (`../13_Folder_Structure.md` §4). Phases: `(auth)` and `(os)` from Phase 0–1; `(portal)` at Phase 4.

---

## 3. Backend Request Paths

```mermaid
flowchart TB
    subgraph readpath["Read path — RSC (Phase 0)"]
        page["page.tsx — under 30 lines"] --> mq["module queries layer"]
        mq --> dbpkg["packages/db typed client"]
        dbpkg --> pgr[("Postgres — RLS evaluates JWT claims")]
    end

    subgraph mutpath["Mutation spine — Server Action (Phase 0, normative)"]
        sa["Server Action"] --> validate["1 — validate: Zod schema from packages/core"]
        validate --> authorize["2 — authorize: can() from core/permissions"]
        authorize --> execute["3 — execute: packages/db, RLS as backstop"]
        execute --> emit["4 — emit domain_event, same transaction"]
        emit --> auditw["5 — audit_log write"]
        auditw --> invalidate["6 — revalidate / realtime invalidation"]
    end

    subgraph edgepath["Edge Function paths (Phase 1)"]
        webhook["Webhook receiver — Stripe, email inbound, n8n callback"] --> verify["verify signature + Zod-parse payload"]
        verify --> enqueue["enqueue() → jobs table, transactional"]
        cron["pg_cron schedule"] --> worker["job worker — FOR UPDATE SKIP LOCKED"]
        enqueue --> worker
        worker --> pgw[("Postgres — service_role with explicit workspace_id")]
        worker --> emitw["emit events + audit"]
    end
```

Three request shapes cover the entire backend. Reads flow through RSC pages into the module's `queries/` layer and `packages/db`; RLS is evaluated on every query from the caller's JWT claims, so a forgotten `WHERE` clause returns nothing rather than everything. Mutations follow the six-step spine verbatim — reviewers reject actions that skip a step (`../13_Folder_Structure.md` §3) — and the domain event is written in the same transaction as the mutation, which is what makes every downstream consumer (automations, notifications, analytics, AI context) drift-free by construction (`../08_Tech_Stack.md` §5.2).

Event-driven and scheduled work lives in Edge Functions, deliberately off the Vercel request path: untrusted inbound payloads are isolated there, and background load never couples to the web deployment (`../08_Tech_Stack.md` §3.4). Jobs are Postgres rows claimed with `FOR UPDATE SKIP LOCKED`, idempotent by deterministic job key, carrying `workspace_id`; a durable queue platform arrives only behind the existing `enqueue()` interface when the named trigger fires — sustained >10–20 jobs/sec or >15-minute executions (`../09_Scaling_Strategy.md` §4.3).

---

## 4. Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant MW as Next.js middleware
    participant SA as Supabase Auth
    participant PG as Postgres with RLS

    Note over B,PG: Login (Phase 0)
    B->>SA: credentials / OAuth / magic link
    SA-->>B: JWT — auth.uid + workspace memberships + active role claims
    B->>MW: request with session
    MW->>MW: resolve active workspace, rate limit
    MW->>PG: query via Supavisor, JWT attached
    PG->>PG: RLS policies evaluate auth_workspace_ids() + role helpers
    PG-->>B: only rows where workspace_id is permitted

    Note over B,PG: Workspace switch
    B->>MW: switch to workspace W2
    MW->>SA: re-mint session claims for W2
    SA-->>B: fresh JWT — old workspace context unreachable
    B->>PG: subsequent queries evaluate against W2 only

    Note over B,PG: Client portal magic link (Phase 4)
    B->>SA: magic link from portal invite email
    SA-->>B: JWT with Client role claim
    B->>MW: portal session
    MW->>MW: allowlist guard — portal sessions reach (portal) routes only
    MW->>PG: RLS + Client role predicates + PortalShare checks
    PG-->>B: portal-visible rows only
```

Identity is Supabase Auth; authorization is ours. The JWT carries `auth.uid()`, workspace memberships, and the active role, and RLS policies evaluate those claims through stable helper functions so the planner can cache them (`../09_Scaling_Strategy.md` §2.1). RBAC itself — the Owner-to-Guest role model of `../05_User_Roles.md` — lives in our `workspace_members` table, not in the vendor's system (`../08_Tech_Stack.md` §3.3). Because RLS context arrives via JWT claims per request, the model is fully compatible with transaction-mode pooling, which forbids session state.

A workspace switch is a claims change, not an application-state change: the fresh JWT makes the previous workspace structurally unreachable at the database layer. Portal authentication is the same machinery with two extra fences — the Client role's RLS predicates and the middleware allowlist that confines portal sessions to `(portal)` routes (`../13_Folder_Structure.md` §4). Defense-in-depth ordering is deliberate: middleware and `can()` checks fail fast and shape UX; RLS is the guarantee.

---

## 5. AI Layer

```mermaid
flowchart TB
    surfaces["Surfaces: chat, palette, inline actions, automation steps, scheduled jobs"] --> intake

    subgraph orchestrator["LangGraph orchestrator — checkpointed to Postgres (Phase 3)"]
        intake["Intake — classify, fast-path trivial requests"]
        planner["Planner — typed plan, risk class per step"]
        executor["Executor — bounded: max steps, cost, wall time"]
        gate{"Approval Gate — any L2 step suspends the run"}
        verifier["Verifier — grounding check, one repair loop"]
        respond["Respond — citations, action receipts, trace ref"]
        intake --> planner --> executor --> gate
        gate -->|approved| verifier
        gate -->|"rejected / expired 72h"| respond
        verifier --> respond
    end

    subgraph contextside["Context assembly — budgeted, ranked, provenance-tagged"]
        assembler["Context assembler"]
        rag["Hybrid RAG: pgvector + Postgres FTS, reciprocal rank fusion"]
        aclfilter["Authoritative ACL post-filter — the guarantee"]
        memory["Memory layers — structured truth always queried fresh"]
        rag --> aclfilter --> assembler
        memory --> assembler
    end

    subgraph toolside["Typed tool registry — the ONLY mutation path"]
        registry["Zod-defined tools: required_permission + risk_class"]
        permcheck["Per-call permission check — invoker's identity, never escalated"]
        rls[("Postgres under invoker's RLS context")]
        registry --> permcheck --> rls
    end

    assembler --> executor
    executor --> registry
    executor --> gw["AI Gateway — packages/ai"]
    gw --> tiers["Tiers: Light / Standard / Frontier + pinned Embeddings"]
    tiers --> claudeP["Claude — primary"]
    tiers --> openaiF["OpenAI — fallback"]
    rls --> auditai["audit_log: actor via aurex + ai_run_id"]
    respond --> airun["AIRun trace: context manifest, plan, tool I/O digests, cost"]
```

This is `../07_AI_Strategy.md` §2 in one picture: a single assistant, Aurex, whose every surface routes through the same six-node LangGraph — Intake, Planner, Executor, Approval Gate, Verifier, Respond — with run state checkpointed to Postgres after every node, so approvals can be decided days later and crashes resume rather than restart. The tool registry is the load-bearing contract: tools are the only way Aurex mutates anything, each tool declares its required permission and risk class, and handlers run under the invoking user's RLS context — Aurex inherits permissions and never escalates (`../07_AI_Strategy.md` §2.3).

Autonomy is graduated (L0 Suggest / L1 Draft / L2 Act-with-approval / L3 Act-and-report) with hard floors no configuration can lift: outbound and destructive actions cap at L2, contract sending and Settings mutations are permanently human-gated (`../07_AI_Strategy.md` §7). Retrieval is hybrid — pgvector semantic plus Postgres FTS fused with reciprocal rank fusion — and tenant isolation of vectors is the same RLS policy as everything else, with the ACL post-filter as the authoritative check on every hit (`../07_AI_Strategy.md` §5). Every run produces an AIRun trace, and every mutation lands in `audit_log` as `actor via aurex` with `ai_run_id` linkage. The gateway scaffold exists from Phase 1 (metering from the first call); the full layer is Phase 3.

---

## 6. Database Architecture

```mermaid
erDiagram
    workspaces ||--o{ workspace_members : "has"
    users ||--o{ workspace_members : "joins via"
    workspaces ||--o{ clients : "scopes"
    clients |o--o{ crm_deals : "may originate"
    clients ||--o{ projects : "commissions"
    projects ||--o{ tasks : "contains"
    clients ||--o{ invoices : "billed via"
    projects |o--o{ invoices : "may bill against"
    workspaces ||--o{ domain_events : "emits"
    workspaces ||--o{ audit_log : "accounts via"
    workspaces ||--o{ embeddings : "owns vectors in"
    workspaces ||--o{ ai_runs : "traces AI in"

    workspaces {
        uuid id PK "UUIDv7"
        text name
        jsonb settings
    }
    workspace_members {
        uuid workspace_id FK
        uuid user_id FK
        text role "Owner to Guest"
    }
    clients {
        uuid workspace_id FK
        text name
        text health_state
    }
    crm_deals {
        uuid workspace_id FK
        text stage
        bigint value_minor "integer minor units"
    }
    projects {
        uuid workspace_id FK
        uuid client_id FK
        text status
    }
    tasks {
        uuid workspace_id FK
        uuid project_id FK
        text status
    }
    invoices {
        uuid workspace_id FK
        uuid client_id FK
        bigint amount_minor "integer minor units"
        text status
    }
    domain_events {
        uuid workspace_id FK
        text event_type "module.entity.verb v-suffixed"
        jsonb payload "versioned registry"
        boolean via_ai
    }
    audit_log {
        uuid workspace_id FK
        text actor "user, system, aurex-via-user"
        uuid ai_run_id "nullable"
    }
    embeddings {
        uuid workspace_id FK
        vector embedding "pgvector HNSW"
        text acl_digest
    }
    ai_runs {
        uuid workspace_id FK
        jsonb trace "context manifest + tool IO digests"
        bigint cost_minor
    }
```

The diagram shows the tenancy spine, not the full schema — the real system has 20+ modules' tables, all following the same conventions (`../08_Tech_Stack.md` §3.2): UUIDv7 primary keys, trigger-maintained `created_at`/`updated_at`, `deleted_at` soft deletes baked into RLS policies, `workspace_id uuid NOT NULL` on every tenant table with composite indexes leading on it, and money as integer minor units. Implicit columns are omitted per the convention in `../06_Module_Breakdown.md`.

Two tables are architecturally special. `domain_events` is the append-only event spine — written transactionally with each mutation, consumed by automations, notifications, analytics read models, AI context, and the Phase 5 webhook surface; it doubles as the outbox if a service is ever extracted (`../08_Tech_Stack.md` §10.8). `audit_log` is its accountability twin: insert-only at the Postgres privilege level, distinct from events because events power features while audit powers accountability (`../06_Module_Breakdown.md` §24). Both, along with `notifications` and `ai_usage`, are the unbounded-growth tables pre-designed for range partitioning at the ~100M-row trigger (`../09_Scaling_Strategy.md` §3.2).

---

## 7. Automation Layer

```mermaid
flowchart TB
    devents[("domain_events — append-only spine")] --> matcher["Trigger matcher: event type + filter"]

    subgraph studio["Automation Studio (Phase 3; hardcoded system automations Phase 1-2)"]
        matcher --> permrecheck["Re-validate creator's permissions per run — pause + notify on loss"]
        permrecheck --> conditions["Condition graph — branches, AI-step outputs may gate"]
        conditions --> actionsx["Action executor — typed ActionDefinition registry, idempotency keys"]
        actionsx --> runlog["AutomationRun log — replay, failure alerting"]
    end

    subgraph guards["Loop and blast-radius guards"]
        depth["Event-chain depth limit — no triggering on automation.* beyond depth 3"]
        throttle["Same-entity throttle"]
        breaker["Circuit breaker — auto-pause after N consecutive failures"]
    end

    actionsx --> native["Native module actions — same permission model as human actions"]
    actionsx --> aistep["AI steps — inherit autonomy rules of 07_AI_Strategy"]
    actionsx --> n8nbridge["n8n handoff — webhook out"]
    n8nbridge --> n8nvm["n8n VM: external SaaS connectors"]
    n8nvm -->|"authenticated internal API — never the DB"| callback["Edge Function callback receiver"]
    native --> devents
    matcher -.-> depth
    actionsx -.-> throttle
    runlog -.-> breaker
```

Automation Studio is the primary internal consumer of the event spine (`../06_Module_Breakdown.md` §17). Its permission model mirrors the AI layer's: an automation runs with its creator's permissions, re-validated on every run — if the creator loses the permission, the automation pauses and notifies rather than executing with orphaned privilege. Actions come from the same typed ActionDefinition registry that feeds the command palette and Aurex's tools, so there is exactly one catalog of "things that can be done" across humans, automations, and AI.

Because automations emit events and consume events, loops are a structural hazard handled by architecture: automations cannot trigger on `automation.*` events beyond chain depth 3, same-entity throttles damp ping-pong patterns, and a circuit breaker auto-pauses any automation after N consecutive failures. The external leg is one-way in each direction — Studio hands off to n8n via webhook, and n8n reports back through authenticated internal APIs received by Edge Functions, never by touching Postgres (`../08_Tech_Stack.md` §5.1). AI steps inside flows inherit the autonomy floors of `../07_AI_Strategy.md` §7 regardless of automation ownership: an automation cannot launder an unapproved outbound send.

---

## 8. Notification Layer

```mermaid
flowchart LR
    devents[("domain_events")] --> sub["Subscription matcher: type rules + entity watchers + mentions + policy"]
    sub --> recip["Recipient resolution"]
    recip --> permchk{"Permission check — recipient can view source entity?"}
    permchk -->|no| drop["Drop — invisible entities never leak titles"]
    permchk -->|yes| render["Template render — i18n-ready"]
    render --> prefs["Preference router: channel matrix, quiet hours, mandatory types"]
    prefs --> coalesce["Coalescing — 10 min folding window, digest threshold"]
    coalesce --> inapp["In-app inbox via Realtime"]
    coalesce --> email["Email via Resend + React Email"]
    coalesce --> push["Browser push (Phase 2-3)"]
    coalesce --> digest["Digest queue — Aurex-narrated daily/weekly (Phase 3)"]
    inapp --> record["Delivery records — at-least-once, idempotent"]
    email --> record
    push --> record
    digest --> record
    email -.->|"bounce/complaint webhooks"| record
```

One respectful engine serves the whole OS — no module ships ad-hoc notifications (`../06_Module_Breakdown.md` §18, §23). The pipeline's most important stage is the permission check: a notification is only rendered for a recipient who can view the source entity, so notifications can never leak even the title of an invisible record. Mandatory categories (security alerts, approval requests) cannot be muted; everything else obeys the per-user channel matrix, quiet hours, and digest folding.

Delivery is at-least-once with idempotent delivery records; channel adapter failures retry with backoff, and email provider webhooks feed deliverability state back in. The AI layer sits on top without altering content: L3 read-only priority ranking orders and folds, Aurex narrates the daily digest per recipient with their permissions applied, and proactive surfaces whose acted-on rate stays below threshold are throttled automatically (`../07_AI_Strategy.md` §6). Phase 1 ships in-app + email with preferences; Phase 2 adds batching, digests, and push; Phase 3 adds ranking and narration.

---

## 9. Storage Layer

```mermaid
flowchart TB
    uploader["Browser"] -->|"1 — request upload"| presign["Edge Function: permission + size + MIME policy check, then presign"]
    presign -->|"2 — short-lived presigned URL"| uploader

    subgraph routing["storage interface in packages/core — routes by asset class"]
        stdclass["Standard: avatars, invoice PDFs, contracts, KB attachments"]
        heavyclass["Large / CDN-heavy: deliverables, video, monitoring screenshots"]
    end

    uploader -->|"3 — direct upload"| sbst[("Supabase Storage")]
    uploader -->|"3 — direct upload"| r2st[("Cloudflare R2 — keys prefixed workspace_id/...")]
    stdclass -.-> sbst
    heavyclass -.-> r2st

    sbst --> meta["Postgres metadata row under RLS — file visibility = row visibility"]
    r2st --> meta
    meta --> fevent["files.file.uploaded event"]

    subgraph pipeline["Async processing pipeline — Edge Function workers (Phase 2)"]
        av{"Antivirus scan"}
        quarantine["Quarantine on hit"]
        thumbs["Thumbnail / preview generation"]
        extract["Text extraction — PDF, docx, image OCR"]
    end

    fevent --> av
    av -->|clean| thumbs
    av -->|clean| extract
    av -->|hit| quarantine
    extract -->|"ACL-tagged"| ragq["RAG ingestion queue → chunk → embed → pgvector (Phase 3)"]
    meta --> download["Short-lived signed download URLs — no public buckets, ever"]
```

Application code never talks to a bucket SDK: the single `storage` interface in `packages/core` routes by asset class — Supabase Storage for the RLS-integrated 95% case, R2 for large and client-facing assets where zero egress is decisive (`../08_Tech_Stack.md` §6). Uploads go direct-to-storage via presigned URLs minted only after an Edge Function has enforced permission, size, and MIME policy; downloads are short-lived signed URLs after an RBAC check, and portal file access flows through the same signing path with PortalShare checks (`../06_Module_Breakdown.md` §25).

A file's visibility *is* its Postgres metadata row's visibility — tenancy and ACLs live in one place, with object keys prefixed by `workspace_id` as belt-and-braces. The processing pipeline is event-driven off `files.file.uploaded`: antivirus (quarantine on hit), previews, and text extraction, whose output feeds the RAG ingestion queue ACL-tagged so a revoked document promptly stops appearing in Aurex answers (`../07_AI_Strategy.md` §5.1). Contract and invoice PDFs are immutable and content-hash verified.

---

## 10. External Integrations

```mermaid
flowchart TB
    subgraph aurexos["AurexOS — three defined seams, no ad-hoc integrations"]
        oauthseam["Seam 1: per-user OAuth token vault — server-side only"]
        webhookseam["Seam 2: inbound webhooks → Edge Functions — verify, parse, enqueue"]
        n8nseam["Seam 3: n8n connectors — long-tail SaaS glue"]
    end

    google["Google: Calendar + Gmail"] ---|"OAuth per user"| oauthseam
    stripe["Stripe: payments (Phase 2), billing (Phase 5)"] ---|"signed webhooks"| webhookseam
    esign["E-sign vendor — contract execution"] ---|"envelope webhooks"| webhookseam
    transcribe["Transcription vendor — meeting audio"] ---|"job-complete webhooks"| webhookseam
    resendx["Resend — email out + bounce webhooks"] --- webhookseam
    accounting["Accounting sync: Xero / QuickBooks"] ---|connectors| n8nseam
    longtail["Slack, ads platforms, enrichment"] ---|connectors| n8nseam

    oauthseam --> sync["Sync jobs — jobs table, idempotent, workspace-scoped"]
    webhookseam --> sync
    n8nseam -->|"authenticated internal APIs"| sync
    sync --> events2[("domain_events — email.thread.linked, finance.payment.received, contracts.contract.signed")]
```

Every external system enters through one of three seams, and nothing enters any other way. Per-user OAuth (Google Calendar, Gmail) keeps tokens server-side in a vault and scopes every sync to the connecting user's own account and workspace. Inbound webhooks land exclusively on Edge Functions — signature-verified, Zod-parsed, then enqueued as idempotent jobs — keeping untrusted payloads off the Vercel app entirely (`../08_Tech_Stack.md` §3.4). The long tail rides n8n's connector catalog, which we should never hand-write, under the standing rule that n8n calls authenticated internal APIs and never the database.

The payoff of the discipline: every integration's effect on the system is expressed as domain events, so an inbound Stripe payment, a signed contract envelope, and a linked email thread are all first-class, automatable, notifiable, AI-visible facts with the same governance as internal mutations. Contract *sending* remains permanently human-gated regardless of vendor capability (`../07_AI_Strategy.md` §7). A public API and outbound webhooks for customers are Phase 5, riding the same event registry (`../06_Module_Breakdown.md` Appendix A).

---

## 11. Deployment Topology

```mermaid
flowchart LR
    dev["Developer: local stack — supabase start + pnpm dev"] -->|PR| github["GitHub"]

    subgraph actions["GitHub Actions CI/CD"]
        ci["ci.yml: typecheck, lint, unit, Playwright smoke, RLS pgTAP suite, schema lint, migration dry-run vs shadow DB"]
        deployweb["deploy-web.yml"]
        deploysb["deploy-supabase.yml — gated job: migrations + Edge Functions via CLI"]
    end

    github --> ci
    ci -->|green| deployweb
    ci -->|green| deploysb

    subgraph envs["Environments"]
        preview["Preview: Vercel deploy per PR + branch database"]
        staging["Staging: production-shaped, seeded fixtures"]
        prod["Production: Vercel + Supabase project + PITR"]
    end

    deployweb --> preview
    deployweb --> staging
    deployweb --> prod
    deploysb --> staging
    deploysb --> prod

    subgraph vm["n8n VM — Docker Compose from infra/n8n"]
        n8nprod["n8n + its own Postgres — workflow JSON versioned in repo"]
    end
    github -->|"exported workflows"| vm
    prod -.->|"flags decouple release from deploy"| posthog["PostHog feature flags"]
    prod -.-> sentryx["Sentry — release-tagged"]
```

Four environments, one pipeline. Every PR gets a Vercel preview deploy — the review workflow — with branch databases for schema-affecting work; CI runs the full gauntlet including the two-tenant RLS smoke suite and pgTAP policy tests on every PR, and a migration dry-run against a production-shaped shadow DB (`../08_Tech_Stack.md` §7–8). Supabase migrations and Edge Functions deploy through a gated Actions job, never by hand. Migrations follow expand → migrate → contract without exception, and PITR with a quarterly-tested restore runbook is the data rollback story (`../09_Scaling_Strategy.md` §7).

The application itself is not containerized while on Vercel; Docker exists only for the n8n VM (with its own Postgres, deliberately separate from tenant data) and local dev parity. Feature flags in PostHog decouple release from deploy, which — combined with stateless compute and immutable Vercel deploys with instant rollback — is the zero-downtime story (`../09_Scaling_Strategy.md` §4.1, §7).

---

## 12. Future Scaling

```mermaid
flowchart TB
    step0["Baseline through Phase 4: one well-indexed Postgres primary + Supavisor"]
    step1["1 — Pooler tuning / split pools per workload — trigger: pool utilization > 80%"]
    step2["2 — Read replicas for analytics + RAG reads — trigger: primary CPU > 50% sustained"]
    step3["3 — Partition append-only tables — trigger: ~100M rows or indexes exceed memory"]
    step4["4 — Separate AI datastore: embeddings + ai_usage — trigger: vector p95 > 300ms or vectors > 30% of storage"]
    step5["5 — Redis (Upstash) for named hot paths only"]
    step6["6 — Durable queue behind enqueue() — trigger: > 10-20 jobs/sec or > 15 min runs"]
    step7["7 — Worker extraction: AI pipelines, monitoring probes, email ingestion"]
    step8["8 — Cells / dedicated instances — trigger: > 60% primary CPU after offload, or ~2TB hot data"]
    step0 --> step1 --> step2 --> step3 --> step4 --> step5 --> step6 --> step7 --> step8
```

The ladder is `../09_Scaling_Strategy.md` §10 drawn as a picture: each rung is roughly 10× the operational cost of the previous one, each has a named quantitative trigger with a dashboard panel, and we take them strictly in order — nothing is built speculatively. The rungs are pre-designed but not pre-built: replicas already have their `dbRead('analytics')` handle, the queue hides behind `enqueue()`, the AI datastore is a second connection string in `packages/db`, and worker extraction follows the module seams with `domain_events` as the outbox. The likely first extractions are all workers, not user-facing services — the user-facing monolith survives to very large scale (`../09_Scaling_Strategy.md` §5).

```mermaid
flowchart TB
    subgraph global["Global control plane (Phase 5+ blueprint)"]
        router["Routing layer: workspace → cell map"]
        cpdb[("Control-plane DB: accounts, billing, cell map")]
        router --- cpdb
    end

    subgraph cellA["Cell A — full stack"]
        dbA[("Postgres + pgvector")]
        rtA["Realtime"]
        wkA["Workers"]
    end

    subgraph cellB["Cell B — full stack"]
        dbB[("Postgres + pgvector")]
        rtB["Realtime"]
        wkB["Workers"]
    end

    subgraph dedicated["Dedicated instance tier"]
        entdb[("Single enterprise workspace — own Supabase project")]
    end

    req["Request: workspace W"] --> router
    router -->|"W in cell A"| cellA
    router -->|"W in cell B"| cellB
    router -->|"W is enterprise"| dedicated
```

Cell-based sharding is the endgame blueprint, documented now so Phases 0–4 never accidentally create cross-workspace joins in product features (`../09_Scaling_Strategy.md` §2.5). Each cell is a complete stack hosting a set of workspaces; workspaces never span cells, preserving the everything-joins-locally property; the global layer holds only accounts, billing, and the workspace-to-cell map. The dedicated-instance tier is the same idea for one tenant — a filtered dump-and-restore onto its own Supabase project, sold as a premium isolation tier and built only when the first enterprise contract demands it. Both moves are cheap later precisely because every row, vector, file key, channel, and job already carries `workspace_id`: the tenancy model is the scaling model.

---

## 13. Revisit Triggers

This atlas is redrawn — not merely annotated — when any of the following occurs:

| Trigger | Diagrams affected |
|---|---|
| Any rung of the §12 ladder fires (replicas, partitioning, AI datastore, Redis, queue, extraction, cells) | 1, 3, 6, 12 |
| First worker service extracted per `../09_Scaling_Strategy.md` §5 | 1, 3, 11 |
| Portal Aurex enabled (Phase 4 opt-in decision, `../07_AI_Strategy.md` §8.7) | 5, 2 |
| `apps/portal` extraction escape hatch exercised (`../13_Folder_Structure.md` §4) | 2, 11 |
| Phase 5 public API + webhooks ship | 1, 10 |
| Stripe billing / `packages/billing` lands (Phase 5) | 10, 11 |
| Retrieval backend swap behind the `retrieval` interface (`../08_Tech_Stack.md` §4.4) | 5, 6 |
| Any ADR that changes a component drawn here | as scoped by the ADR |

Diagram changes follow the same review path as prose: a PR touching this file must cite the planning document or ADR that made the picture stale.
