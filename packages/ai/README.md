# @aurexos/ai

The AurexOS AI layer: the **owned AI gateway** (ADR-0006) and the contracts everything above it builds on. Headless by construction — the same code serves the web app, Edge Function pipelines, and future workers; it never imports UI (13_Folder_Structure.md iron law 2).

**This package is the only place provider SDKs may be imported (R-AI1).** `@anthropic-ai/sdk`, `openai`, and `@google/generative-ai` appear here and nowhere else; lint enforces it. Nothing above the gateway sees a vendor type.

## What this is (Phase 1 foundation)

Per `docs/architecture/AIArchitecture.md` and `docs/07_AI_Strategy.md` §4:

| Piece | Where | Status |
|---|---|---|
| Gateway contracts (messages, tool specs, stream deltas, error taxonomy) | `src/gateway/types.ts` | ✅ built |
| `AiGateway` — validate → budget → route → retry/failover → meter → redact-log | `src/gateway/gateway.ts` | ✅ built |
| Tier → model config, env-overridable (R-S4); provider data-policy register | `src/gateway/config.ts` | ✅ built |
| Provider adapters: Anthropic (primary), OpenAI (secondary + embeddings), Gemini (future), OpenAI-compatible (OSS seam) | `src/gateway/providers/` | ✅ built |
| `ModelRouter` — health/preference ordering + budget degradation ladder | `src/router/router.ts` | ✅ built |
| Prompt manager (R-AI5): `definePrompt`, registry, `aurex.system_frame` v1 anchor | `src/prompts/` | ✅ built |
| Usage metering: `AiUsageEvent` schema, `ConsoleUsageSink`, `SupabaseUsageSink` stub | `src/usage/usage.ts` | ✅ built |
| Budget guard contract + `NoopBudgetGuard` | `src/budget/budget.ts` | ✅ built |
| Memory / conversation contracts (ai_conversations / ai_messages alignment) | `src/memory/types.ts` | contracts only |
| Retrieval contract (pgvector impl deferred; interface pinned per 08 §4.4) | `src/retrieval/types.ts` | contracts only |
| SSE (de)serialization for `StreamDelta` | `src/streaming/sse.ts` | ✅ built |

## Layout

```
packages/ai/
├── src/index.ts                     # curated public surface — import from here
├── src/gateway/
│   ├── types.ts                     # provider-agnostic contracts + GatewayError taxonomy
│   ├── gateway.ts                   # AiGateway class + buildGateway() factory (no singletons)
│   ├── config.ts                    # tier → [provider, modelId][] map, AI_TIER_* env overrides
│   └── providers/
│       ├── anthropic.ts             # messages.create + stream; cache-read token mapping
│       ├── openai.ts                # chat.completions + stream; embeddings.create
│       ├── gemini.ts                # generateContent + stream; tool-mapping caveats documented
│       └── openai-compatible.ts     # baseURL+apiKey parameterization (vLLM/Ollama-class, Phase 5)
├── src/router/router.ts             # ModelRouter: ordered attempts + degradation ladder
├── src/prompts/                     # R-AI5: prompts are code — versioned, validated, registered
├── src/usage/usage.ts               # UsageSink + AiUsageEvent (→ ai_usage table)
├── src/budget/budget.ts             # BudgetGuard: allow | degrade(tier) | deny(reason)
├── src/memory/types.ts              # MemoryItem / ConversationRef / MessageRecord + store contracts
├── src/retrieval/types.ts           # Retrieval interface (swappable vector store seam)
└── src/streaming/sse.ts             # StreamDelta ⇄ SSE frames for route handlers
```

Tests are colocated (`*.test.ts`, Vitest): `pnpm --filter @aurexos/ai test`.

## Usage sketch

```ts
import { buildGateway } from '@aurexos/ai'

// env comes from packages/config/env.ts — raw process.env stays there (R-S3).
const gateway = buildGateway({ env })

// Non-streaming
const response = await gateway.complete({
  tier: 'light',                      // never a model id in feature code (R-S4)
  workspaceId,
  userId,
  feature: 'crm.lead_triage',         // per-capability cost attribution
  messages: [
    { role: 'system', content: aurexSystemFrameV1.render(frameVars) },
    { role: 'user', content: 'Classify this inbound lead…' },
  ],
})

// Streaming → SSE route handler
import { toSseStream } from '@aurexos/ai'
for await (const frame of toSseStream(gateway.stream(request))) {
  controller.enqueue(encoder.encode(frame))
}

// Embeddings (pinned tier — no degradation ladder)
const { embeddings } = await gateway.embed({ workspaceId, feature: 'kb.ingest', inputs: chunks })
```

Every call flows: **Zod validation (R-T3) → budget check → route decision (logged) → bounded jittered retry → cross-provider failover on retryable errors → `ai_usage` event written by the gateway itself (R-AI2 — callers cannot skip it) → redaction hook on all logged payloads.**

### Configuration (all env-overridable; defaults in `config.ts` only — R-S4)

| Env var | Meaning | Example |
|---|---|---|
| `AI_TIER_LIGHT` / `AI_TIER_STANDARD` / `AI_TIER_FRONTIER` / `AI_TIER_EMBEDDINGS` | Ordered failover routes | `anthropic:claude-haiku-4-5,openai:gpt-4o-mini` |
| `AI_MAX_OUTPUT_TOKENS`, `AI_TIMEOUT_MS` | Request defaults | `4096`, `60000` |
| `AI_RETRY_MAX_ATTEMPTS`, `AI_RETRY_BASE_DELAY_MS`, `AI_RETRY_MAX_DELAY_MS`, `AI_PROVIDER_COOLDOWN_MS` | Retry/backoff + passive health | |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` | Adapters wired only when present | |
| `AI_OPENAI_COMPATIBLE_BASE_URL`, `AI_OPENAI_COMPATIBLE_API_KEY` | Optional OSS/self-hosted endpoint | |

Model migrations are config changes (router config), not deploys (AIArchitecture.md §3.1). Provider zero-retention/no-training posture is tracked in `PROVIDER_DATA_POLICIES`; `buildGateway` warns loudly when wiring an unconfirmed provider (ADR-0006).

## Deliberately deferred to Phase 3

Absence below is a decision, not an omission (mirrors 13_Folder_Structure.md §8):

- **`agents/`** — LangGraph orchestrator, Postgres-checkpointed graphs, approval gates, sub-agent subgraphs.
- **`tools/`** — the typed tool registry derived from `packages/core` schemas; until it exists, `ToolSpec.inputSchema` is treated as opaque JSON Schema.
- **`evals/`** — golden sets + eval harness; prompt changes become eval-gated then (R-AI5 CI gate).
- **Retrieval implementation** — pgvector hybrid search, two-stage ACL enforcement, ingestion pipeline. The interface is pinned in `src/retrieval/types.ts`.
- **Memory/conversation stores** — implementations over the `ai_conversations` / `ai_messages` / memory tables land with the ai migrations; contracts are pinned in `src/memory/types.ts`.
- **Real `BudgetGuard`** — per-workspace monthly ceilings + per-user daily caps from Postgres (AIArchitecture.md §12); `NoopBudgetGuard` holds the seam.
- **`SupabaseUsageSink` wiring** — the `ai_usage` migration + injected server client; the insert shape is already correct.
- **Mid-stream cross-provider failover** — requires checkpointed conversation state; today a mid-stream failure surfaces an honest `error` delta (R-AI6).
- **Gateway response cache** — workspace-keyed, short-TTL cache for deterministic low-temperature tasks; TTLs to be set from Phase 3 hit-rate data (AIArchitecture.md §15 Q1).
- **Active provider health checks + cost estimation** — passive cooldown health and token metering exist now; pricing tables fill `costEstimateMinorUnits` later (integer minor units, R-D8).
