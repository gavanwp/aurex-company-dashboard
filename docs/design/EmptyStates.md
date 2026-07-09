# Empty States

| | |
|---|---|
| **Document** | Empty State Specification — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [Components.md](./Components.md) · [IllustrationStyle.md](./IllustrationStyle.md) · [LoadingStates.md](./LoadingStates.md) · [ErrorStates.md](./ErrorStates.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the **target specification**. The shipped `packages/ui/components/empty-state.tsx` (icon-in-circle + title + description + action slot) is the structural anchor; the target adds the illustration slot, the Aurex secondary action, and the four-class system below.

---

## 1. Doctrine

An empty state is two things at once: a **teaching moment** and a **trust moment**. It is the first screen every user sees in every module — the empty version of a screen is designed as deliberately as the full one ([../11_Design_Principles.md](../11_Design_Principles.md) §1.5, §8.5). A blank table says the product is unfinished. A designed empty state says: *this is what lives here, this is why you'll want it, and here is the one thing to do next.*

Three obligations, in order:

1. **Teach** — what this surface is, in one sentence.
2. **Motivate** — why it's worth filling, in the same sentence if possible.
3. **Direct** — exactly one primary action. Not three. One.

### 1.1 Anatomy

```
            ┌──────────────┐
            │  Spot illo   │   ≤160px, optional (IllustrationStyle.md)
            └──────────────┘
                 ·24px·
          Title — title-3, --text-primary
                  ·8px·
     Body — 1–2 sentences, body 14, --text-muted
                 ·24px·
        [ Primary CTA ]  [ ✦ Ask Aurex… ]
                 ·12px·
        Learn link — caption, --text-muted     (optional)
```

| Slot | Spec | Rules |
|---|---|---|
| Spot illustration | ≤160px, minimal geometric line style, neutral ramp + single accent per [IllustrationStyle.md](./IllustrationStyle.md) | Optional. First-use and permission classes may use it; filtered-zero never does (§2). Falls back to a 48px icon-in-circle (shipped component) in dense contexts |
| Title | `title-3` (15/22, 600), `--text-primary` | ≤6 words, sentence case, states the action or the fact — never the absence ("Create your first project", not "No projects yet" alone) |
| Body | `body` (14/22), `--text-muted` | 1–2 sentences, max ~2 lines at 360px width. What it is → why it matters |
| Primary CTA | Default primary button, verb-first | Exactly one. Never two primary buttons |
| Secondary action | Ghost/secondary button | Optional: "✦ Ask Aurex to…" (§4) or an import path ("Import from CSV") |
| Learn link | `caption`, `--text-muted`, underline on hover | Optional, links to KB article. Never a substitute for the body copy |

### 1.2 Placement

- **Center-aligned** — horizontally and vertically — in the content region it replaces. Never in a corner, never top-left-hugging.
- The app shell, page header, and toolbar remain fully rendered around it. An empty state replaces *content*, never chrome — the user can still navigate, search, and open the palette.
- Max copy width 360px. The empty state never stretches to full-bleed width.
- In sub-regions (a card, a panel section), a compact variant applies: icon 32px, title `body-strong`, body `small`, one CTA, vertical padding 32px.

### 1.3 Tone

Never sad, never apologetic, never cute. No "Nothing to see here 😢", no illustrated tumbleweeds, no empty-box metaphors. Empty is *before*, not *failure* — the copy is forward-looking and calm ([../11_Design_Principles.md](../11_Design_Principles.md) §11).

## 2. The four empty classes

Every empty surface belongs to exactly one class. Using the wrong class is a design defect — most commonly, showing a first-use state when filters simply excluded everything.

| Class | When | Job | Illustration | CTA |
|---|---|---|---|---|
| **First-use** | The workspace has never had this data | Teach + create | Yes (spot, ≤160px) | Create-first primary + optional Aurex/import secondary |
| **Cleared / inbox-zero** | Data existed; the user finished it | Acknowledge quietly | Optional, smaller (≤96px) | Usually none — a calm "All clear" needs no CTA |
| **Filtered-zero** | Data exists but the current filters/search exclude all of it | Explain the filter, offer the exit | **Never** | "Clear filters" / "Clear search" |
| **Permission / feature-off** | Data may exist but this user can't see it, or the module is disabled | Explain + name who can grant | Optional | "Request access" or "Ask an owner" — never a dead end |

Rules for choosing:

1. **Check filters first.** If any filter, search query, or date range is active, the surface is filtered-zero — even on first run. Rendering the first-use illustration under active filters tells the user their data is gone. This is the most common empty-state bug; it is a blocking review comment.
2. **Cleared states celebrate quietly.** No confetti, no fireworks, no streak counters. A check icon, "All clear", one line of context ("You're caught up — 0 tasks due today."). Restraint reads as premium; celebration UI reads as a to-do app for children.
3. **Permission states never pretend the feature doesn't exist.** Hiding a module entirely creates "where did Finance go?" support tickets. Show the surface, explain the gate, name the path ([ErrorStates.md](./ErrorStates.md) §3 owns the full-page 403; this class covers in-content gating).
4. First-use is the only class that teaches at length. Cleared and filtered-zero users already know what the surface is — don't re-explain it to them.

## 3. The canonical catalog

Binding copy for every core surface. Deviations require design review. All strings sentence case; CTAs are verbs.

| Surface | Class | Title | Body | Primary CTA | Secondary / Aurex | Illo |
|---|---|---|---|---|---|---|
| Projects list | First-use | Create your first project | Projects hold everything for a piece of client work — tasks, files, docs, and time, in one place. | Create project | ✦ Ask Aurex to set one up from a brief | Y |
| Clients list | First-use | Add your first client | Every project, invoice, and conversation connects back to a client record. | Add client | Import from CSV | Y |
| My Work (tasks) | First-use | Your work, in one list | Tasks assigned to you across every project land here, sorted by due date. | Go to a project | — | Y |
| My Work (tasks) | Cleared | All clear | Nothing due. New assignments will appear here. | — | — | N |
| Project board (tasks) | First-use | Add the first task | Break this project into tasks your team can pick up, assign, and track. | Add task | ✦ Ask Aurex to draft a task plan | Y |
| Finance dashboard | First-use | Send your first invoice | Once you invoice, revenue, outstanding balances, and payment status all live here. | Send your first invoice | ✦ Ask Aurex to draft one from a project | Y |
| Aurex panel (first open) | First-use | I work with what's on screen | Ask about this workspace, or hand me a task — I'll show you what I'll do before I do it. | *(prompt chips, §4.2)* | — | N |
| Leads / pipeline | First-use | Start your pipeline | Track every lead from first contact to signed — drag cards between stages as deals move. | Add lead | Import from CSV | Y |
| Documents | First-use | Write your first doc | Briefs, notes, and specs — linked to the projects and clients they belong to. | New doc | ✦ Ask Aurex to draft from a template | Y |
| Notifications | Cleared | You're all caught up | New mentions, approvals, and updates will land here. | — | Notification settings *(link)* | N |
| Search results | Filtered-zero | No results for "{query}" | Check the spelling, or try a shorter term. | Clear search | ✦ Ask Aurex instead | N |
| Any filtered list | Filtered-zero | No results match these filters | {n} items are hidden by the current filters. | Clear filters | — | N |
| Meetings | First-use | No meetings scheduled | Connect your calendar to see meetings alongside the projects they belong to. | Connect calendar | — | Y |
| Knowledge base | First-use | Build your team's memory | Answers written once, found forever — by your team and by Aurex. | New article | ✦ Ask Aurex to draft from existing docs | Y |
| Automations | First-use | Automate the repetitive parts | Trigger actions when things change — assign, notify, update, without lifting a finger. | Browse recipes | ✦ Ask Aurex to build one from a sentence | Y |
| Portal — projects | First-use (client-facing) | Your projects will appear here | {Agency} will share project progress with you as work begins. | — | — | Y |
| Portal — invoices | First-use (client-facing) | No invoices yet | Invoices from {Agency} will appear here, with payment in a click. | — | — | N |
| Portal — files | First-use (client-facing) | No files shared yet | Deliverables and documents {Agency} shares with you will live here. | — | — | N |

### 3.1 Spec notes on key surfaces

**Projects — first-use.** The primary CTA "Create project" opens the template gallery, not a blank form — first-time creation should show what a good project looks like (template cards: "Website build", "Brand identity", "Retainer"). The Aurex secondary opens the panel prefilled: *"Set up a project from this brief:"* with a paste target (§4).

**Tasks — two variants, never confused.** *My Work* is personal and cross-project: its first-use state routes the user toward projects (tasks are created in context, not in a personal void) and its cleared state is the calm inbox-zero. *Project board* first-use is creation-focused and offers the Aurex task-plan draft. The board's filtered-zero (assignee/label filters active) uses the generic filtered-zero row — never the board's first-use copy.

**Finance — pre-first-invoice.** The dashboard's stat tiles and chart do not render as zeros (a wall of "$0" reads as failure). The entire content region is the empty state; the chart area shows the illustration slot. After the first invoice, real tiles render even if sparse.

**Aurex panel — first open.** No illustration; the panel is already an identity moment (✦ mark in the header). Three example prompt chips render where the first message would appear (§4.2), sized as tappable buttons, each sending its prompt on click. This state teaches capability by *invitation*, not by a feature list.

**Notifications — inbox zero.** Cleared class. Check icon (24px, `--status-success-text`), no illustration, no CTA. The settings link is caption-level. This state will be seen thousands of times; it must be nearly invisible.

**Portal states — client-facing tone.** The client did not choose this software and cannot create anything here. Portal empty states are **reassuring and agency-branded**: they name the agency, they promise what will appear, and they never expose AurexOS mechanics ("workspace", "module") or show CTAs the client can't act on. No Aurex actions in the portal, ever.

## 4. Aurex in empty states

The "ask Aurex to set this up" pattern is the standard secondary action for creation-class empty states — never the primary. The user's first manual creation teaches the surface; Aurex is the accelerant, not the front door.

### 4.1 The pattern

1. **Affordance:** a secondary/ghost button prefixed with the ✦ mark: "✦ Ask Aurex to draft a task plan". The ✦ is the only emoji-class glyph permitted in UI ([../11_Design_Principles.md](../11_Design_Principles.md) §6.3).
2. **Activation:** clicking opens the right-panel Aurex conversation with the prompt **prefilled and editable** — never auto-sent. The user presses Enter to run it. Prefill text is visible, so the pattern also teaches promptcraft.
3. **Approval:** anything Aurex proposes with side effects renders as an approval card — what will happen, to which records, Approve / Edit / Dismiss ([../11_Design_Principles.md](../11_Design_Principles.md) §9). The L2 approval flow applies in full; empty states grant no shortcut around it.
4. **Attribution:** everything created this way carries the persistent ✦ Aurex marker with provenance detail.

### 4.2 Example prompt chips per module

| Module | Chip 1 | Chip 2 | Chip 3 |
|---|---|---|---|
| Aurex panel (first open) | Summarize this workspace | What's overdue across all projects? | Draft a status update for a client |
| Projects | Set up a project from this brief: … | Create a website-build project for {client} | What should this project's milestones be? |
| Tasks | Break this project into tasks | What should I work on first? | Assign these tasks by workload |
| Finance | Draft an invoice for {project} | Who hasn't paid yet? | Summarize revenue this quarter |
| Pipeline | Add a lead from this email: … | Which deals are going stale? | Draft a follow-up for {lead} |
| Knowledge base | Turn this doc into a KB article | Write our project kickoff checklist | What do we know about {topic}? |
| Automations | When a task is done, notify the client channel | Assign new bugs to {person} | Remind me when invoices go overdue |

Chips are real strings, not categories — a chip the user can read is a capability they now know exists.

## 5. First-run journeys

Two layers, two owners:

- **Module-level first-run (owned here).** The empty state itself, optionally extended with a **3-step inline checklist** below the CTA for modules with real setup sequences (Finance: add payment details → create invoice → send; Automations: pick recipe → connect trigger → enable). Checklist rules: max 3 steps, each a link to the action, checkmarks persist per workspace, and the whole checklist is **dismissible forever** via an "×" — a dismissed checklist never returns. No progress nagging, no "you're 66% set up!" banners.
- **Workspace onboarding (owned by product).** The cross-module welcome flow, workspace creation, and team invites are a product-owned journey specified outside the design system. Empty states must assume it may have been skipped entirely — every module teaches itself from zero.

An empty state never depends on onboarding having happened, and onboarding never replaces designed empty states.

## 6. Sample data policy

**Real workspaces are never auto-seeded with sample content.** No "Example project", no "Acme Corp" client, no demo invoice.

- **Why (trust):** users must always know that everything in their workspace is theirs. Fake records blur the line between the product's voice and the user's data — the same line the ✦ attribution system exists to keep sharp.
- **Why (hygiene):** seeded data leaks — into search, into Aurex answers, into exports, into portal views, into revenue charts. Deleting it is the user's first chore; a product whose first task is cleanup has failed its first impression.
- **The exception:** an explicit, clearly-labeled **demo mode** (sales demos, template previews) may present sample data — visually watermarked, never mixed with real records, and never persisted into a real workspace.
- Template galleries show *structure* (stages, sections, task shapes), not fake *content* — a "Website build" template contains task names, not a fictional client.

## 7. Writing rules

The formula, in order, no steps skipped:

> **What it is → why it matters → do this.**

| Rule | Bound |
|---|---|
| Title | ≤6 words, sentence case, no terminal period |
| Body | 1–2 sentences, ≤140 characters, ends with a period |
| CTA | 2–4 words, starts with a verb |
| Learn link | "Learn about {noun}" — 3–4 words |

Banned vocabulary (automatic review rejection): "Oops", "Whoops", "Uh oh", "It's empty here!", "Nothing to see here", "Looks like…", "Hmm…", exclamation marks in first-use titles, and any emoji other than ✦. Banned framing: apology ("Sorry, no projects"), blame ("You haven't created anything"), and absence-only statements with no next step ("No data").

Interpolations ({client}, {Agency}, {query}, {n}) render real values — never the literal braces, never a generic fallback like "your agency" when the real name is known.

## 8. Do / don't

| # | Do | Don't |
|---|---|---|
| 1 | Design the empty state in the same PR as the surface | Ship a blank table and backlog the empty state |
| 2 | One primary CTA, verb-first | Two primary buttons, or a CTA the user can't complete |
| 3 | Use filtered-zero whenever any filter/search is active | Show the first-use illustration under active filters |
| 4 | Keep cleared states nearly silent — "All clear" | Confetti, streaks, or celebration animations |
| 5 | Prefill Aurex prompts, let the user send | Auto-send AI actions from an empty-state click |
| 6 | Name the agency and reassure in portal states | Expose internal vocabulary or dead CTAs to clients |
| 7 | Explain permission gates and who can grant access | Hide gated modules and let users think data vanished |
| 8 | Keep real workspaces free of sample data | Auto-seed demo projects "to make it feel alive" |
| 9 | Render full shell + chrome around the empty region | Replace the whole page with a floating illustration |
| 10 | Reuse the shipped `EmptyState` component | Hand-roll per-module empty layouts |

## 9. Open questions

| # | Question | Leaning | Owner |
|---|---|---|---|
| 1 | Should the projects template gallery be the creation default forever, or only pre-first-project? | Gallery for first three projects, then blank-form default with gallery link | CPD |
| 2 | Do prompt chips rotate/personalize over time (e.g., based on workspace modules enabled)? | Static per module for v1; personalization is a Phase 4 Aurex question | CPD + AI lead |
| 3 | Compact empty-state variant tokens (icon 32px, padding 32px) — promote to `packages/ui` as `<EmptyState size="sm">`? | Yes, alongside the illustration slot | Design eng |
| 4 | Portal empty illustrations: agency-brand-tinted or neutral-only? | Neutral-only until the portal theming system ([IllustrationStyle.md](./IllustrationStyle.md)) defines safe recoloring | CPD |
| 5 | Should filtered-zero show *which* filters are hiding items ("2 filters active")? | Yes — pending filter-bar spec in [Components.md](./Components.md) | CPD |
