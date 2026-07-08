# 01 — Project Vision

| | |
|---|---|
| **Document** | Project Vision — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Founding CTO, AurexDesigns |
| **Related** | [02_Product_Requirements_Document.md](./02_Product_Requirements_Document.md) · [03_System_Goals.md](./03_System_Goals.md) · [04_Feature_List.md](./04_Feature_List.md) |

---

## 1. Vision Statement

**AurexOS is the AI Operating System for Digital Agencies.**

One workspace where an agency's entire business lives — clients, projects, tasks, finances, proposals, contracts, meetings, email, documents, knowledge, automations — governed by an AI that has context over all of it and can act on it. Not a suite of integrated apps. Not a project tool with an AI sidebar. An operating system whose kernel is AI.

Our vision: in five years, an agency running on AurexOS operates with **half the operational headcount and twice the client throughput** of a comparable agency running on the fragmented stack of Notion + ClickUp + HubSpot + Slack + Zapier + QuickBooks. The AI doesn't just answer questions about the business — it runs the boring 60% of it, with humans approving the parts that matter.

## 2. Mission

Build the operating system we wish we had. **AurexDesigns** (https://aurexdesigns.com) is an AI-first digital agency delivering web development, branding, UI/UX, SEO, AI agents, AI automation, chatbots, workflow automation, APIs & integrations, and social media. We feel agency operational pain daily and at full fidelity. Our mission is to:

1. **Run AurexDesigns entirely on AurexOS** — retire every third-party operational tool.
2. **Productize what works** into a multi-tenant SaaS that any digital agency can adopt in an afternoon.
3. **Make AI-native operations the default** for the agency industry, not a premium add-on.

## 3. The Problem

### 3.1 Agency tool fragmentation

A typical 10–30 person digital agency runs on 12–18 disconnected tools:

| Job to be done | Typical tool | Typical cost/user/mo |
|---|---|---|
| Docs & wiki | Notion | $10–15 |
| Project & task management | ClickUp / Asana / Linear | $10–19 |
| CRM & sales pipeline | HubSpot | $20–100+ |
| Chat | Slack | $8–15 |
| Email | Gmail / Outlook | $6–12 |
| Automation | Zapier / n8n | $20–60 (per account) |
| Invoicing | FreshBooks / QuickBooks | $15–30 |
| Expenses | Expensify / spreadsheets | $5–10 |
| Proposals | PandaDoc / Qwilr | $19–35 |
| Contracts / e-sign | DocuSign | $10–25 |
| Meeting notes | Fireflies / Otter | $10–20 |
| Scheduling | Google Calendar + Calendly | $0–12 |
| Client reporting | Google Sheets / AgencyAnalytics | $0–15 |

That's **$1,500–$4,000+/month for a 15-person agency**, and the money is the smallest cost. The real costs:

- **The data is shredded.** The client record lives in HubSpot, their project in ClickUp, their invoices in QuickBooks, their contract in DocuSign, the strategy doc in Notion, the decision history in Slack. No tool can answer "is the Meridian account healthy?" because no tool holds the whole picture.
- **Sync is a job.** Someone (usually a PM or ops person) spends hours per week copying statuses between tools, or maintaining brittle Zapier chains that silently break.
- **Onboarding is a maze.** New hires learn 12 tools, 12 permission models, 12 search boxes.

### 3.2 The cost of context switching

Research on task switching consistently shows knowledge workers lose meaningful time re-establishing context after each switch, and agency work is switch-dense by nature: a PM touches CRM, tasks, email, calendar, invoices, and docs before lunch. Conservatively, tool fragmentation costs each operational employee **45–90 minutes per day** — at agency billing rates, that's tens of thousands of dollars per person per year in unbillable friction. Fragmentation also destroys *trust*: when three tools disagree about a project's status, people stop believing any of them and fall back to asking in Slack, which shreds the data further.

### 3.3 AI bolted on vs. AI-native

Every incumbent now ships "AI features": Notion AI writes paragraphs, ClickUp Brain summarizes tasks, HubSpot drafts emails. These are all structurally identical — **an LLM bolted onto one silo, blind to the other eleven**. Notion AI cannot know the invoice is overdue. HubSpot's AI cannot know the project is behind schedule. The AI's usefulness is capped by the fragmentation of the underlying data.

An AI-native system inverts this. When *one* system holds the CRM record, the project, the tasks, the invoices, the meeting transcripts, the emails, and the contract, an AI with workspace-wide context can do things no bolted-on AI can:

> "Draft a status email to the Meridian client: reference the two milestones we shipped this week, flag that invoice #142 is 10 days overdue, and propose Thursday 2–4pm for the review call based on both calendars."

That sentence spans six modules. In the fragmented stack it's 30 minutes of human assembly. In AurexOS it's one approval click.

## 4. The Opportunity

- **Market**: hundreds of thousands of digital/creative/marketing agencies globally, overwhelmingly 2–50 people — big enough to feel the pain, too small to build internal tooling. The "agency management software" category (vertical players like Productive, Scoro, Teamwork) is growing but **none of the incumbents are AI-native**; all are pre-AI architectures adding AI features.
- **Wedge**: we are our own design partner. AurexDesigns dogfoods every feature under real revenue pressure before any customer touches it. This kills the classic B2B trap of building for imagined users.
- **Timing arbitrage**: incumbents carry a decade of pre-AI architecture and pricing models built on per-seat silos. A greenfield system can put the event log, permission model, and AI context layer at the core, which is impossible to retrofit.
- **Business model**: consolidation pricing. AurexOS at $30–50/user/month replaces $100–250/user/month of stacked subscriptions and eliminates the sync labor. The ROI story is arithmetic, not persuasion.

## 5. Why Now

1. **Model capability crossed the threshold.** Frontier models (Claude-class) reliably perform multi-step tool use, long-context reasoning over heterogeneous business data, and structured output. Agentic workflows with human-in-the-loop approval are production-viable in 2026 in a way they were not in 2023.
2. **The infrastructure is commodity.** Supabase gives us Postgres + Auth + Realtime + Storage with Row-Level Security; pgvector gives us per-tenant RAG in the same database as the business data — the AI context layer and the source of truth are literally the same Postgres instance. This stack was a multi-year platform build five years ago.
3. **Agencies are under margin pressure.** AI is deflating prices for agency deliverables; agencies must cut operational cost to protect margin. The buyers are actively looking for exactly this consolidation.
4. **Tool fatigue is peaking.** "We pay for 14 tools and still run the business in spreadsheets" is the most common sentence in agency-owner communities. The appetite to consolidate is provably high; what's been missing is a consolidated product good enough to switch to.

## 6. Product Principles

These are decision-making tiebreakers, in priority order. When principles conflict, the lower number wins.

1. **AI is the operating system, not a feature.** Every module is designed AI-first: typed tools, event emission, and RAG indexing are part of a module's definition of done, not follow-up work. If Aurex can't see it and act on it, the module isn't finished.
2. **One source of truth.** Every entity (client, project, invoice, document) exists exactly once. Other modules reference it; they never copy it. Denormalization is a caching strategy, never a data model.
3. **Trust through control.** Aurex proposes; humans approve anything outbound (email, invoices, client-visible changes) or destructive. Every AI action lands in an immutable audit trail. Autonomy is earned per-workflow, per-workspace — never assumed.
4. **Apple-quality, Linear-inspired craft.** Minimal, fast, keyboard-first, dark and light mode, WCAG 2.1 AA. Speed is a feature: an OS you live in all day must feel instant. We ship fewer things at higher polish.
5. **Multi-tenant from the first migration.** Workspace isolation via Postgres RLS from day one. There is no "single-tenant internal version" to painfully retrofit later — AurexDesigns is simply tenant #1.
6. **Opinionated defaults, escape hatches everywhere.** We encode how a great agency runs (pipelines, project templates, approval flows) as defaults, and make everything configurable rather than forcing our workflow.
7. **Boring technology, exciting product.** Modular monolith over microservices, Postgres over exotic stores, one repo (Turborepo) over many. Innovation budget is spent on the AI layer and the UX, nowhere else.
8. **Events are the nervous system.** Every meaningful state change emits a domain event. Automations, notifications, analytics, and AI context all consume the same event stream — build once, power four subsystems.

## 7. What AurexOS Is / Is Not

| AurexOS **is** | AurexOS **is not** |
|---|---|
| A single operating system for the entire agency business | A bundle of loosely integrated point tools |
| AI-native: Aurex has workspace-wide context and typed tools to act | A chat widget bolted onto a project tracker |
| Multi-tenant SaaS architecture from day one (internal = tenant #1) | An internal tool we hope to commercialize "someday" |
| Opinionated about how agencies should run, with configuration | A blank-canvas no-code builder for arbitrary businesses |
| A replacement for Notion, ClickUp, Asana, HubSpot, Slack, Zapier/n8n dashboards, invoicing, proposals, CRMs, meeting notes, knowledge bases | A replacement for Figma, GitHub, ad platforms, or accounting *ledgers* (we integrate; accountants keep their GL) |
| Human-in-the-loop agentic: propose → approve → act → audit | A fully autonomous "fire and forget" agent platform |
| Built for digital/creative agencies (2–50 seats first) | A horizontal "work OS" competing head-on with Notion for every vertical |

## 8. Dual-Track Strategy: Internal OS → Commercial SaaS

**Track 1 — Internal (Phases 0–4).** AurexOS runs AurexDesigns. Success is measured in tools retired and hours saved. Every feature must earn its place by removing a real subscription or a real weekly chore. Dogfooding is enforced: if AurexDesigns staff route around a module back to an old tool, the module is treated as a failing test.

**Track 2 — Commercial (Phase 5, designed-for from Phase 0).** The same codebase, same tenancy model, same permission system opens to external agencies: Stripe billing, self-serve onboarding, workspace templates, and the marketplace layer (templates, AI agents, integrations).

**The discipline that makes dual-track work:** we never take an internal shortcut that violates tenancy, RBAC, or the event model. Internal-only conveniences are feature-flagged, not hardcoded. The commercial launch should be a pricing page and an onboarding flow — not a rewrite.

**Sequencing rationale:** internal-first de-risks product (real usage before real customers), funds development (agency revenue), and produces the sales asset that matters most to agency buyers: *"we run our own agency on this — here are our numbers."*

## 9. Success Definition

### Year 1 (mid-2027) — "We run on it"
- AurexDesigns operates 100% on AurexOS through Phase 4: all core modules live, legacy tools cancelled (target: ≥ 10 subscriptions retired).
- Aurex AI handles ≥ 30% of routine operational actions (status updates, drafts, scheduling, reminders) via approved suggestions.
- ≥ 3 external design-partner agencies in private beta on the multi-tenant infrastructure.
- Measured internal ops time savings ≥ 30% vs. the pre-AurexOS baseline (time-tracked).

### Year 3 (mid-2029) — "Agencies run on it"
- Commercial SaaS live ≥ 18 months; **250+ paying agency workspaces**, net revenue retention ≥ 110%.
- $1.5M+ ARR; AurexOS revenue meaningfully diversifies AurexDesigns beyond services.
- Template and integration marketplaces live with third-party contributors.
- Aurex AI executes ≥ 60% of routine operations per active workspace; AI action approval rate ≥ 85% (proposals are good enough that humans rarely reject them).

### Year 5 (mid-2031) — "Category default"
- **2,000+ paying workspaces**; AurexOS is a recognized top-3 name in AI-native agency operations.
- Marketplace ecosystem is a real economy: third-party AI agents and templates generate meaningful GMV.
- The median AurexOS agency demonstrably operates with materially lower ops overhead than industry benchmarks — the vision metric, published as an annual benchmark report.
- SaaS ARR exceeds AurexDesigns services revenue.

## 10. North-Star Metrics

**Primary north star: Weekly AI-Completed Operations per Active Workspace (WACO)** — the number of operational actions per workspace per week that Aurex executed (post-approval or autonomously where trusted). This is the purest expression of "AI as operating system": it only grows if data is consolidated, context is rich, proposals are trustworthy, and users keep approving. A rising WACO means the OS is genuinely running the agency.

**Supporting metrics:**

| Metric | Definition | Guards against |
|---|---|---|
| Consolidation Score | Avg. number of module categories actively used per workspace (of ~20) | Being used as "just another task tool" |
| AI Approval Rate | Approved ÷ proposed AI actions | Spammy, low-quality AI suggestions inflating WACO |
| Time-to-Answer | p50 latency for Aurex to correctly answer a cross-module business question | Shallow RAG / stale context |
| Weekly Active Seats % | WAU ÷ licensed seats per workspace | Shelfware revenue |
| Net Revenue Retention | Standard NRR (Phase 5+) | Growth masking churn |
| Tools Retired per Workspace | Self-reported + onboarding survey | Failing the consolidation promise |

Vanity metrics we explicitly do **not** steer by: total registered users, raw AI message volume, feature count.

---

*Changes to this document require CTO sign-off. Material changes to vision or north-star metrics require founder consensus and must be propagated to [02_Product_Requirements_Document.md](./02_Product_Requirements_Document.md) and [03_System_Goals.md](./03_System_Goals.md).*
