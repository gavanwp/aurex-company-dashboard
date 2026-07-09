# AurexOS Design System — /docs/design

| | |
|---|---|
| **Document** | Design System Index & Orientation |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [../11_Design_Principles.md](../11_Design_Principles.md) · [./DesignSystem.md](./DesignSystem.md) · [../architecture/Architecture.md](../architecture/Architecture.md) |

This folder is the **permanent design foundation of AurexOS**. Every future screen — internal app, Client Portal, emails, PDFs, marketing — follows this system. The authority chain:

1. **[../11_Design_Principles.md](../11_Design_Principles.md)** — the binding UI bible (philosophy, laws, anti-patterns). Nothing here may contradict it.
2. **[DesignSystem.md](./DesignSystem.md)** — the master document: pillars, the citable design rules (DR-1…DR-25), Figma organization, governance.
3. **The 26 specialized documents below** — the complete specification each domain builds from.
4. **`packages/ui` + `packages/config/tailwind`** — the implementation. Shipped token values are truth; these docs specify the full target system and mark deltas.

## Reading order

**New designer or engineer?** Read in this order: [DesignSystem.md](./DesignSystem.md) → [DesignTokens.md](./DesignTokens.md) → [ColorSystem.md](./ColorSystem.md) → [Typography.md](./Typography.md) → [SpacingSystem.md](./SpacingSystem.md) → then the component/pattern docs as you need them.

**Building a feature?** Check [ComponentInventory.md](./ComponentInventory.md) first (does the component exist?), then the owning spec doc, then [DesignSystem.md](./DesignSystem.md) §3 rules before review.

## Document map

### Foundations

| Document | Contents |
|---|---|
| [DesignTokens.md](./DesignTokens.md) | The master token registry — color, radius, shadow, border, opacity, spacing, type, motion, icon, z-index, size tokens; naming grammar; platform mapping; shipped-vs-specified delta |
| [ColorSystem.md](./ColorSystem.md) | Graphite neutral ramps (N1–N12 / D1–D12), the Aurex Indigo accent, status colors with solid/soft/text variants, module identity hues, the chart ramp, contrast matrices |
| [Typography.md](./Typography.md) | Geist Sans/Mono, the eight-token type scale, H1–H6 mapping, numbers & data typography, responsive behavior |
| [SpacingSystem.md](./SpacingSystem.md) | The 4px-grid / 8-point-rhythm scale, component and layout spacing standards, the 24px law, density system |
| [GridSystem.md](./GridSystem.md) | App shell geometry, breakpoints (mobile → ultra-wide), the 12-column content grid, card grids, page templates |
| [Elevation.md](./Elevation.md) | Borders-first depth, the surface ladder, the two shadow levels, scrims, z-index rules |

### Language

| Document | Contents |
|---|---|
| [BrandGuidelines.md](./BrandGuidelines.md) | Brand essence, wordmark, voice & tone, the ✦ mark, co-branding & white-label precedence |
| [Icons.md](./Icons.md) | Lucide decision & alternatives, usage grammar, the semantic icon registry, the ✦ Aurex mark spec |
| [IllustrationStyle.md](./IllustrationStyle.md) | Structural-line illustration style, sizes, token-driven theming, subject-matter guide |
| [AnimationSystem.md](./AnimationSystem.md) | Motion tokens, the shared variant library, interaction/navigation/AI/loading motion, reduced motion, performance rules |

### Components

| Document | Contents |
|---|---|
| [Components.md](./Components.md) | Specs for all primitives, overlays, data display, domain cards, and the **AI component suite** (chat, approval cards, streaming, memory viewer, agent status…) |
| [ComponentInventory.md](./ComponentInventory.md) | The master ledger — every component, tier, shipped/specified/planned status, owning doc, phase |
| [Buttons.md](./Buttons.md) | Variants, sizes, states, placement, alignment rules |
| [Forms.md](./Forms.md) | Field anatomy, inputs, selection controls, validation architecture, layout rhythm |
| [Cards.md](./Cards.md) | Card doctrine, anatomy, variants, grid behavior, content rules |
| [Navigation.md](./Navigation.md) | Sidebar, workspace switcher, top bar, breadcrumbs, tabs, context panel, keyboard map, portal & mobile nav |
| [Tables.md](./Tables.md) | Anatomy, column types, interaction (selection, bulk, inline edit, saved views), density, responsive collapse |
| [Charts.md](./Charts.md) | Chart doctrine, the categorical ramp, type-selection guide, formatting, dashboards vs reports, AI-generated charts |

### Patterns

| Document | Contents |
|---|---|
| [DashboardRules.md](./DashboardRules.md) | Dashboard philosophy, the widget size grammar, role default layouts, statistics rules, AI on the dashboard |
| [Notifications.md](./Notifications.md) | Notification taxonomy, inbox/center, toasts, badges, digests, push, preference center |
| [EmptyStates.md](./EmptyStates.md) | The four empty classes, the canonical catalog with copy (projects, clients, tasks, revenue, AI, leads, documents, notifications…), Aurex-assisted empty states |
| [LoadingStates.md](./LoadingStates.md) | The decision ladder, skeleton system, progress indicators, optimistic UI, AI loading |
| [ErrorStates.md](./ErrorStates.md) | Error taxonomy, full-page specs (404/403/500), offline, validation, AI failures, payment errors, copy rules |

### Contracts

| Document | Contents |
|---|---|
| [Accessibility.md](./Accessibility.md) | WCAG 2.1 AA conformance mapping, keyboard architecture, focus management, screen readers, AI surface a11y, testing |
| [ResponsiveRules.md](./ResponsiveRules.md) | Breakpoint contract, shell adaptation, per-surface adaptation (tables, kanban, charts, forms…), touch, PWA |
| [DarkMode.md](./DarkMode.md) | The dark surface ramp, color behavior, elevation in dark, switching mechanics, dark contrast rules |

## Conventions used in every document

- Standard metadata header (Status / Version / Date / Owner / Related) — same as the planning and architecture suites.
- Numbered sections; tables for values and rules; each doc ends with do/don't rules and open questions.
- **Both themes always**: every value table carries light and dark.
- Cross-references are relative links; sibling docs own their domain — a value appears authoritatively in exactly one document (usually [DesignTokens.md](./DesignTokens.md) or [ColorSystem.md](./ColorSystem.md)) and is referenced elsewhere.
- No application code — these documents are specifications; implementation lives in `packages/ui`.

## Changing the system

Follow [DesignSystem.md](./DesignSystem.md) §5: amendments ship as PRs against the owning document plus the token registry, Figma Variables, and `packages/ui` in one change set. Silent divergence between docs, Figma, and code is treated as a bug, not a preference.
