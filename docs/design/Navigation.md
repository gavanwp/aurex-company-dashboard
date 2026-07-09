# Navigation — AurexOS Design System

| | |
|---|---|
| **Document** | Navigation — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [GridSystem.md](./GridSystem.md) · [Components.md](./Components.md) · [ColorSystem.md](./ColorSystem.md) · [Tables.md](./Tables.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the binding specification for how users move through AurexOS. It elaborates [11_Design_Principles.md](../11_Design_Principles.md) §4.2 (app shell), §4.3 (command palette), and §8 (interaction). Where this file and the Design Principles disagree, the Design Principles win and this file gets fixed. Shell geometry (exact breakpoints, column math) is owned by [GridSystem.md](./GridSystem.md); this file owns navigation behavior.

---

## 1. Navigation doctrine

1. **The shell is the product's skeleton.** Sidebar, top bar, and context panel are the only permanent chrome. Everything else is content. If a navigation need cannot be met by these three surfaces plus the palette, the information architecture is wrong — fix the IA, don't add chrome.
2. **⌘K is the fastest path anywhere.** The command palette reaches every module, entity, and action in two keystrokes and a few characters. All other navigation exists for people who don't yet know that.
3. **Nav shows place; the palette provides motion.** The sidebar's primary job is orientation — telling you where you are and what exists — not being the fastest route. It is a map, not a vehicle. Design it for glanceability, not click optimization.
4. **Everything is a link** ([11 §8.7](../11_Design_Principles.md)). Every navigable state has a canonical URL. Cmd-click opens a new tab from any nav element, breadcrumb segment, tab, or row. Back always means back.
5. **Navigation is instant.** Route transitions render the destination's skeleton within 100 ms. Navigation never shows a full-page spinner ([11 §12.5](../11_Design_Principles.md)).

## 2. Sidebar

### 2.1 Anatomy (top to bottom)

```
┌──────────────────────────┐
│ ▣ Workspace switcher   ⌄ │  ← workspace avatar + name + chevron
│ ⌕ Search…            ⌘K │  ← palette trigger (looks like search)
├──────────────────────────┤
│ ◆ Dashboard              │
│ ◆ Projects            12 │  ← module nav, Lucide 20px, badge count
│ ◆ Tasks                3 │
│ ◆ CRM                    │
│ ◆ Finance                │
│   ── WORKSPACE ──        │  ← section group label (caption, muted)
│ ◆ Documents              │
│ ◆ Analytics              │
│          ⋮               │
├──────────────────────────┤
│ ✦ Aurex                  │  ← pinned bottom, above user menu
│ ◉ User menu              │
└──────────────────────────┘
```

| Zone | Spec |
|---|---|
| Workspace switcher | Top slot, always first. See §3. |
| Palette trigger | Renders as a search input affordance with `⌘K` kbd hint; clicking opens the palette, never an inline search field. |
| Module nav | One row per module: Lucide icon 20px, label `body` 14px, optional badge count. Row height 32px, on the 4px grid. |
| Section groups | Caption 12px / 500, muted text, 24px top separation. Groups collapse; collapsed state persists per user. |
| Aurex entry | Pinned to the bottom of the nav, ✦ mark + "Aurex". Never mixed into the module list — it is a system surface, not a module. |
| User menu | Bottom-most: avatar, name, status; opens preferences, theme, sign out. |

### 2.2 States

| State | Width | Behavior |
|---|---|---|
| Expanded | 240px | Default at `xl+` (≥1280). Icons + labels + badges. |
| Icon rail | 64px | Default at `lg` (1024–1279); user-collapsible anywhere ≥lg. Icons only; label appears as a tooltip on hover/focus (200 ms delay, instant for subsequent items). Badges render as a dot on the icon. |
| Overlay drawer | 240px overlay | `<lg` (below 1024). Hidden by default; opens over content with scrim, closes on selection, Esc, or scrim click. Never pushes content. |

Collapse state (expanded ↔ rail) persists per user per device. The overlay drawer is a viewport response, not a preference — it is never persisted.

### 2.3 Active state — the one treatment

The active module row gets exactly this, nothing more:

- **2px accent left indicator** flush to the sidebar's left edge, full row height;
- **accent-soft background** on the row;
- **accent-text label and icon**.

Hover on inactive rows: one neutral background step (`bg-raised`), no color change. No pill shapes, no filled icons for active, no bold-weight switching (weight changes cause layout shift). One treatment across sidebar, portal, and settings nav — no per-module invention.

### 2.4 Badge counts

- Badges show **actionable counts only** (assigned to me, needs my approval) — never vanity totals like "all tasks in workspace".
- Caption 12px, tabular-nums, neutral treatment; danger-soft only for genuinely overdue/blocking counts.
- Cap display at `99+`. A module with nothing actionable shows no badge — zero is silence.
- On the icon rail, badges collapse to a 6px dot (neutral or danger); the exact count lives in the tooltip.

### 2.5 Module order, pinning, and toggles

- Module order is **fixed by the design system** in v1: Dashboard first, work modules (Projects, Tasks, CRM, Finance), then workspace modules (Documents, Analytics), then admin. Consistent order builds spatial memory; user reordering is deferred.
- **Phase 5** introduces per-workspace module toggles (admins hide modules a workspace doesn't use). Hiding is the only customization — order stays canonical among visible modules.
- Aurex, Dashboard, and Settings can never be hidden.

## 3. Workspace switcher

### 3.1 Anatomy

Trigger: workspace avatar (20px, radius 6) + workspace name (`body-strong`, truncated at ~18ch) + chevron. Opens a menu listing workspaces (avatar, name, member count), a divider, then "Create workspace" and "Workspace settings". Current workspace carries a check, `aria-current`.

### 3.2 Keyboard

| Shortcut | Action |
|---|---|
| `⌘⇧O` | Open the workspace switcher menu (mnemonic: **O**rganization) |
| `⌘1…⌘9` | **Not** workspace switching — reserved (see §14). Workspace switching is deliberate, not accidental; a mistyped ⌘2 that silently changes tenant context is a data-safety hazard. |

Within the open switcher: arrow keys + Enter, type-to-filter.

### 3.3 Multi-workspace rules

- Switching workspaces is a **full context switch**: navigation resets to that workspace's Dashboard, palette scope changes, open panels close. Nothing from workspace A ever renders inside workspace B's frame.
- The current workspace is always identifiable from the top of the sidebar and from the URL (`/w/{workspace}/…`). No ambiguous states.
- Cross-workspace search does not exist in v1; the palette is always workspace-scoped.

### 3.4 Portal absence

The Client Portal has **no workspace switcher**. Clients belong to exactly one context; the slot shows the agency's brand mark instead (§9).

## 4. Top bar

The top bar is **per-surface**, not global chrome — each content surface owns its header. Composition, left to right:

| Slot | Spec | Rules |
|---|---|---|
| Breadcrumb | See §5 | Only when depth ≥ 2; top-level modules show no breadcrumb. |
| Page title | `title-1` 24px/600 | One per surface. Entity pages may make it inline-editable (rename). |
| View controls | View switcher (segmented, §6), filter button, density toggle | Only controls that act on the view below. Grouped right of the title. |
| Primary action | **Exactly one** solid-accent button (e.g., "Create invoice") | Secondary actions go in an overflow kebab. Two primary buttons on one header is a design review failure. |
| Presence avatars | Up to 3 avatars 24px + `+n` | Live viewers of this surface. Real-time surfaces only (boards, docs). |

**Sticky behavior:** on scroll, the header collapses to a 48px sticky band — breadcrumb-with-title condensed to one line, view controls and primary action retained, presence hidden. Collapse animates 150 ms; content never jumps.

## 5. Breadcrumb

- Segments: entity icon (Lucide 16) + label, separated by muted `/`. Every segment is a real link; cmd-click works.
- **Truncation is middle-collapse:** first segment + `…` menu + final two segments. The `…` opens a menu of the hidden ancestors. Never truncate the current entity's name first — truncate ancestors.
- Individual segment labels truncate at ~24ch with a title tooltip.
- The final segment is the current page: `aria-current="page"`, rendered as text, not a link.
- **Mobile (<md):** breadcrumb collapses to a single "← Parent name" back affordance. Full ancestry lives in the palette and URL, not in mobile chrome.

## 6. Tabs

Two components, two jobs — never interchanged:

| | Line tabs | Segmented control |
|---|---|---|
| Job | Sub-navigation *within* an entity (Overview / Tasks / Files / Activity) | Switching *presentations* of the same data (List / Board / Calendar) |
| Look | Text row with 2px accent underline indicator on active; muted → primary text on hover | Enclosed control (`packages/ui/components/tabs.tsx` anchor): muted track, active segment raised with `bg-surface` |
| Default | **This is the default tab pattern** | View switchers only |

Shared rules:

- **URL-bound always.** Active tab lives in the route (`…/tasks`) or a query param (`?view=board`). Refresh restores it; cmd-click a tab opens it in a new tab.
- **Overflow:** tabs never wrap and never scroll horizontally. Beyond available width, trailing tabs collapse into a "More ⌄" menu; an active hidden tab is promoted into the visible row.
- **Keyboard:** arrow keys move focus between tabs (roving tabindex), Enter/Space activates; automatic activation is acceptable only when tab content is cheap to render.
- Tab labels: `body-strong` when active, `body` muted when not; optional count suffix in tabular-nums. Max ~7 tabs before the IA is questioned.

## 7. Right context panel

- **360px fixed width**, full content height, slides in from the right (200 ms ease-out). Content area reflows; the panel never overlays content at `xl+`. Below `xl` it overlays with a scrim.
- **Replace, never stack** ([11 §4.2](../11_Design_Principles.md)). Opening a second panel (e.g., Aurex while a task detail is open) replaces the first. There is no panel history UI — the URL is the history.
- Contents: entity details, comments, activity, or the Aurex conversation. One panel type at a time.
- **Close = Esc**, or the panel's × button. Esc closes the panel before anything else in the shell; focus returns to the triggering element.
- **Deep-link state:** panel identity is URL state (`?panel=task_123`). Sharing the URL reproduces the panel; refresh restores it; back closes it.

## 8. Command palette as navigation

The palette component — layout, sections, ranking, AI routing — is owned by [Components.md](./Components.md) §3. This file binds one thing:

- **Nav registration is definition-of-done** ([11 §4.3](../11_Design_Principles.md)). Every feature ships with (a) its nav target registered in the palette ("Go to Invoices"), (b) its primary actions registered ("Create invoice"), and (c) its entities searchable. A feature reachable only by pointer is not shipped.
- Palette navigation and sidebar navigation must land on identical canonical URLs. Two paths, one destination.

## 9. Portal navigation

The Client Portal uses the same shell, subtractively:

- **Client-scoped nav only:** Overview, Projects, Approvals, Invoices, Files, Messages — flat list, no section groups, no module sprawl. If a portal nav list exceeds ~7 items, remove items.
- No workspace switcher (§3.4), no density toggle, no Aurex entry in v1, no palette-as-AI. `⌘K` still opens quick navigation scoped to the client's entities.
- **Agency branding slot:** the top sidebar slot renders the agency's logo and name (their brand, our layout). Accent color remains the agency-configured portal accent per [ColorSystem.md](./ColorSystem.md); the shell structure is not brandable.
- Portal breadcrumbs, tabs, and the top bar follow this document exactly. One design system, two audiences.

## 10. Mobile navigation

**There is no bottom tab bar in v1.** Justification: AurexOS is a responsive web tool, not a native app; mobile jobs are triage and approvals — check a notification, approve a proposal, comment, mark done — not full-module workdays. A bottom bar would spend 56px of permanent chrome on a vehicle nobody drives far.

Mobile pattern set:

| Element | Behavior <md |
|---|---|
| Sidebar | Overlay drawer, opened by a top-left menu button (44px target on touch) |
| Breadcrumb | Back-only (§5) |
| Top bar | Title + back + one primary action; view controls collapse into a filter sheet |
| Palette | Full-screen sheet, same registry, search-first |
| Context panel | Full-screen sheet, Esc/swipe-down to close |

If post-v1 analytics show sustained multi-module mobile sessions, a bottom bar is the amendment to propose — with evidence.

## 11. Keyboard map — global shortcuts

Global shell shortcuts (surface-local keys like `a` assign live with their surfaces, per [11 §8.1](../11_Design_Principles.md)):

| Shortcut | Action |
|---|---|
| `⌘K` | Command palette |
| `⌘J` | Toggle Aurex panel |
| `⌘\` | Toggle sidebar (expanded ↔ rail) |
| `⌘⇧O` | Workspace switcher |
| `Esc` | Close topmost layer: menu → dialog → panel → drawer |
| `?` | Shortcut overlay (when focus is not in a text input) |
| `g` then `d` | Go to Dashboard |
| `g` then `p` | Go to Projects |
| `g` then `t` | Go to Tasks |
| `g` then `c` | Go to CRM |
| `g` then `f` | Go to Finance |
| `g` then `a` | Go to Analytics |
| `g` then `s` | Go to Settings |
| `[` / `]` | Back / forward in navigation history |

Rules: `g`-chords time out after 1.5 s with a subtle HUD showing the pending chord. `⌘1…⌘9` remains **reserved and unbound** in v1 (browser tab conflicts; candidate for pinned-view switching later — §14). Every shortcut here is registered in the shortcut registry and appears in the `?` overlay. New global shortcuts require amending this table.

## 12. Accessibility

- **Landmarks:** sidebar = `<nav aria-label="Primary">`, top bar within `<header>`, content = `<main>`, context panel = `<aside aria-label>`, portal nav = `<nav aria-label="Client navigation">`. Exactly one `<main>` per document.
- **Skip link:** "Skip to content" is the first focusable element in the shell, visually revealed on focus, targeting `<main>`.
- **`aria-current`:** `page` on the active sidebar item, breadcrumb terminal, and active tab. The 2px indicator is never the only signal — accent text + `aria-current` always accompany it (color is not the sole carrier, [11 §5](../11_Design_Principles.md)).
- **Focus order:** shell → content. Skip link → sidebar top-to-bottom → top bar left-to-right → main content → context panel. Opening a panel moves focus into it; closing restores focus to the trigger. The overlay drawer and all sheets trap focus.
- Icon rail items expose their labels as accessible names; tooltips are supplementary, not the accessible name mechanism.
- Route changes announce the new page title via a polite live region; the document `<title>` updates to `Page — Workspace — AurexOS`.

## 13. Do / Don't

| Do | Don't |
|---|---|
| Keep the sidebar to one level of visual hierarchy (groups + items) | Nest expandable trees inside the sidebar — depth lives in content, not chrome |
| Give every navigable state a canonical URL before building its UI | Ship pointer-only navigation of any kind |
| Use exactly one active treatment (§2.3) everywhere | Invent per-module active styles, pills, or filled-icon variants |
| Show badge counts only for actionable items | Badge vanity totals or unread-everything counts |
| Collapse breadcrumbs from the middle | Truncate the current entity's name while ancestors stay full-width |
| Bind tabs and panels to the URL | Hold view state in memory that dies on refresh |
| Replace the context panel when a new one opens | Stack panels or add panel-history chrome |
| Reserve the sidebar's accent for the single active item | Let hover states or badges borrow the accent |
| Let Esc close exactly one layer per press, topmost first | Make Esc ambiguous or close multiple layers at once |
| Design the icon rail as a first-class state with tooltips and dots | Treat collapsed as "the sidebar, but broken" |

## 14. Open questions

| # | Question | Leaning | Owner |
|---|---|---|---|
| 1 | Bind `⌘1…⌘9` to user-pinned views once saved views ship? | Yes, pinned views over workspaces — views are intra-tenant and safe to mis-hit | CPD, with Tables.md saved-views work |
| 2 | Favorites/pinned-entities section in the sidebar (Linear-style)? | Probably Phase 4+, capped at ~8 pins, above module nav | CPD |
| 3 | Per-workspace nav badges muted during focus/quiet hours? | Follow notification quiet hours automatically | CPD + notifications owner |
| 4 | Aurex entry on the portal (client-facing AI) — nav implications? | Out of v1; requires its own trust/attribution review first | CPD + AI lead |
| 5 | Horizontal secondary nav for Settings (many leaf pages) vs. nested list? | 880px reading column + left mini-nav within content, not shell chrome | CPD |
