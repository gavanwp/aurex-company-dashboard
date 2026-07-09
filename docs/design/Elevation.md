# Elevation — Depth, Surfaces & Layering

| | |
|---|---|
| **Document** | Elevation System — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [../11_Design_Principles.md](../11_Design_Principles.md) · [DesignTokens.md](./DesignTokens.md) · [ColorSystem.md](./ColorSystem.md) · [AnimationSystem.md](./AnimationSystem.md) |

How AurexOS expresses depth. Token values are registered in [DesignTokens.md](./DesignTokens.md) (§2.1 surfaces, §4 shadows, §11 z-index); this document owns the policy for using them.

---

## 1. Depth philosophy

**Borders and surface steps first; shadows last.** AurexOS is flat-but-layered — the premium register of Linear, Vercel, and Stripe, not the drop-shadowed card stacks of 2016 Material dashboards.

1. **Depth order of preference:** (1) a 1px `border-subtle` hairline, (2) a surface lightness step, (3) — only for layers that genuinely float above the page — a shadow. Most UI never reaches step 3.
2. **Why heavy shadows read as dated:** big soft shadows simulate physical stacking, which is a skeuomorphic metaphor a keyboard-first tool doesn't need. They add visual noise to dense screens, blur the crisp hairline geometry that makes tables and boards legible, and fall apart in dark themes where there's nothing bright for a shadow to sit on. Restraint reads as premium ([11 §1.4](../11_Design_Principles.md)).
3. **Shadows are reserved for real floating.** A shadow is an honest statement: "this layer is temporarily above the page and will leave." Cards, panels, and rows are *part of* the page — they get borders and surface steps, never shadows.
4. Exactly **two shadow levels exist; there is no third** ([11 §4.4](../11_Design_Principles.md)). A component that seems to need a third shadow is mis-designed — it either floats (use the two) or it doesn't (use borders).

---

## 2. The surface ladder

Depth within the page is carried by background lightness. The ladder, using registry tokens ([DesignTokens.md §2.1](./DesignTokens.md)):

| Step | Token | Light | Dark | What lives here |
|---|---|---|---|---|
| −1 | `bg-sidebar` (`--sidebar`) | `240 5% 98%` | `240 6% 5%` | App shell sidebar |
| 0 | `bg-app` (`--background`) | `0 0% 100%` | `240 6% 7%` | The canvas — content area |
| +1 | `bg-surface` (`--card`) | `0 0% 100%` | `240 6% 9%` | Cards, panels-in-content, table containers |
| +2 | `bg-raised` (`--popover`) | `0 0% 100%` | `240 6% 10%` | Menus, popovers, dropdowns, tooltips |
| +2 | `bg-overlay` (`--overlay`) | `0 0% 100%` | `240 6% 10%` | Dialogs, palette, drawers — same lightness as raised; scrim + `shadow-2` do the separating |

Rules:

- **The sidebar sits BELOW the canvas in dark** (5% < 7%), Linear-style: the workspace glows slightly above the chrome, keeping attention on content. In light, the sidebar is a step *darker* than the white canvas (98% vs 100%) — same hierarchy, inverted mechanics.
- In **light theme** the ladder above the canvas is flat (white on white): separation comes from `border-subtle` hairlines, and from shadows only at the floating steps. Do not invent off-white card fills to fake elevation in light.
- In **dark theme** lightness does the work: each step up is visibly lighter. Never lighten a dark surface beyond its registered step to make it "pop".
- Interaction fills (`bg-hover` 13%, `bg-muted` 15% in dark) sit *within* a surface, not above it — they are washes, not elevation steps.

---

## 3. The two shadow levels

| Token | Light | Dark | May be used by |
|---|---|---|---|
| `shadow-1` | `0 4px 12px rgb(0 0 0 / 0.08)` | `0 4px 12px rgb(0 0 0 / 0.4)` | Menus, popovers, dropdowns, tooltips, select/combobox lists — transient anchored layers |
| `shadow-2` | `0 12px 32px rgb(0 0 0 / 0.12)` | `0 16px 48px rgb(0 0 0 / 0.5)` | Dialogs, command palette, drawers — modal layers over a scrim |

**What uses NO shadow — cards.** Cards are `bg-surface` + `border-subtle`, full stop. On hover, an interactive card may do nothing, or upgrade to `border-strong`; it **never** gains a shadow, never lifts, never scales. The same applies to the sidebar, the right context panel, sticky headers, toolbars, stat tiles, table rows, and toasts docked in the toast region (toasts are surface + border; they announce, they don't float theatrically).

Every floating layer also carries a `border-subtle` hairline — in dark theme the shadow alone is nearly invisible against dark backgrounds, and the hairline keeps the edge crisp in both themes.

---

## 4. Elevation × dark mode

- **Lightness does the work in dark.** The surface ladder (§2) is the primary depth signal; shadows are a supporting cue only.
- Shadow **opacity increases in dark** (0.4 / 0.5 vs 0.08 / 0.12) because a soft black shadow needs more strength to register against near-black surfaces — and `shadow-2` also grows (`16px/48px` blur) to hold the dialog's silhouette.
- Never compensate for weak dark shadows by lightening a surface beyond its registered step, adding glows, or coloring shadows. If a floating layer feels edgeless in dark, the fix is the hairline border (§3), which it should already have.
- Both themes ship with every component from day one; an elevation treatment that looks wrong in one theme is a bug, not a backlog item ([11 §2.3](../11_Design_Principles.md)).

---

## 5. Scrims & overlays

- **Scrim token:** neutral black at `opacity-scrim-light` **0.6** (light) / `opacity-scrim-dark` **0.7** (dark) — [DesignTokens.md §6](./DesignTokens.md). One scrim; it sits at `z-overlay-scrim` (50) beneath every modal layer.
- Dark needs the heavier scrim because the canvas is already dark — 0.6 there fails to establish figure/ground.
- **Blur policy:** `backdrop-blur` is permitted **only** on the command palette and dialog scrims, and only subtle (≤ 8px). Nowhere else — not on sticky headers, not on the sidebar, not on cards. Glassmorphism for its own sake is banned ([11 §1.4](../11_Design_Principles.md)).
- **Performance note:** backdrop blur forces continuous compositing of everything beneath it; on low-end GPUs and large monitors it costs frames. Keep radii small, apply it to the scrim only (never to scrolling content), and drop it entirely under `prefers-reduced-transparency` or when frame budget is contested.
- Clicking the scrim dismisses dismissible overlays; `Esc` dismisses every overlay, always ([11 §10](../11_Design_Principles.md)).

---

## 6. Z-index scale

The full scale is registered in [DesignTokens.md §11](./DesignTokens.md): `base 0 · sticky 10 · sidebar 20 · panel 30 · dropdown 40 · overlay-scrim 50 · dialog 60 · palette 70 · toast 80 · tooltip 90`.

Rules:

1. Only these ten values exist. Arbitrary z-indexes (`z-[45]`, `z-index: 9999`) are lint failures.
2. **One overlay layer maximum.** Modals-on-modals are banned ([11 §12.1](../11_Design_Principles.md)). A flow that wants a second modal becomes a panel step, a page, or a multi-step dialog *within* the one layer.
3. A dropdown opened from inside a dialog still uses `z-dropdown` semantics but renders in the dialog's portal stacking context — it is part of the dialog layer, not a second overlay.
4. The palette (70) outranks dialogs (60): Cmd+K is always reachable. Opening the palette closes or covers any open dialog — it never stacks a scrim on a scrim.
5. Toasts (80) and tooltips (90) are non-blocking annotations; they never trap focus and never carry their own scrim.

---

## 7. Component elevation map

Binding assignment for every raised or floating component. A component not listed here defaults to **surface + border-subtle, no shadow, z-base** — and being added here is a design review decision.

| Component | Surface token | Border | Shadow | Z token |
|---|---|---|---|---|
| Card / stat tile | `bg-surface` | `border-subtle` (hover: `border-strong` allowed) | none | `z-base` |
| Table container / board column | `bg-surface` | `border-subtle` | none | `z-base` |
| Sticky table header / toolbar | `bg-app` (opaque) | `border-subtle` bottom | none | `z-sticky` |
| Sidebar | `bg-sidebar` | `border-subtle` edge (`--sidebar-border`) | none | `z-sidebar` |
| Right context panel (incl. Aurex thread) | `bg-surface` | `border-subtle` edge | none | `z-panel` |
| Dropdown / context menu | `bg-raised` | `border-subtle` | `shadow-1` | `z-dropdown` |
| Popover / select list / combobox | `bg-raised` | `border-subtle` | `shadow-1` | `z-dropdown` |
| Tooltip | `bg-raised` | `border-subtle` | `shadow-1` | `z-tooltip` |
| Dialog | `bg-overlay` | `border-subtle` | `shadow-2` | `z-dialog` (scrim at 50) |
| Drawer | `bg-overlay` | `border-subtle` edge | `shadow-2` | `z-dialog` (scrim at 50) |
| Command palette | `bg-overlay` | `border-subtle` | `shadow-2` | `z-palette` (scrim at 50, subtle blur allowed) |
| Toast | `bg-raised` | `border-subtle` | `shadow-1` | `z-toast` |
| AI approval card (inline) | `bg-surface` | `border-subtle` | none | `z-base` |
| Drag ghost (board card in flight) | `bg-surface` | `border-strong` | `shadow-1` | within board context |

The drag ghost is the single sanctioned case of a card carrying a shadow — it is genuinely airborne, and the shadow drops the instant it lands.

---

## 8. Do / Don't

| Do | Don't |
|---|---|
| Separate in-page regions with `border-subtle` and surface steps | Never put shadows on cards, panels, rows, or anything that is part of the page |
| Give every floating layer a hairline border alongside its shadow | Never rely on shadow alone for edges in dark theme |
| Use exactly `shadow-1` or `shadow-2` from the registry | Never compose custom `box-shadow` values or use Tailwind's default shadow scale |
| Signal card hover with `border-strong` or nothing | Never lift, scale, or add shadow on card hover |
| Keep one overlay layer; route deeper flows to panels or pages | Never stack a modal on a modal, or a scrim on a scrim |
| Use the registered scrim opacities (0.6 / 0.7) | Never invent per-surface scrim strengths or tinted scrims |
| Confine backdrop-blur to palette and dialog scrims, subtle | Never blur sticky headers, sidebars, cards, or scrolling content |
| Take z-values only from the ten-token scale | Never write `z-[9999]` or nudge z-indexes to win a stacking fight — fix the stacking context |

---

## 9. Open questions

1. **Drawer direction & width.** Drawers share dialog elevation; whether a right-edge drawer replaces or coexists with the right context panel (both at 360px) needs a shell-level ruling — panels replace, never stack ([11 §4.2](../11_Design_Principles.md)) suggests replace.
2. **Toast elevation in dark.** `shadow-1` on toasts over dark canvases is nearly invisible; if the docked toast region proves under-differentiated, the fix candidate is `bg-raised` → a registered step, not a new shadow.
3. **`prefers-reduced-transparency`.** Formalize dropping backdrop-blur (and possibly raising scrim opacity) under this media feature once browser support data justifies the token.
4. **React Native mapping.** Native has elevation, not box-shadow; `shadow-1`/`shadow-2` need platform equivalents (Android elevation steps, iOS shadow params) registered in [DesignTokens.md §13](./DesignTokens.md) before native work starts.
