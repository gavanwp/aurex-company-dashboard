# Dark Mode

| | |
|---|---|
| **Document** | Dark Mode — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [11_Design_Principles.md](../11_Design_Principles.md) · [ColorSystem.md](./ColorSystem.md) · [DesignTokens.md](./DesignTokens.md) · [Accessibility.md](./Accessibility.md) · [Charts.md](./Charts.md) · [README.md](./README.md) |

---

## 1. Dark as first-class

Dark mode is not a filter applied to the light theme — it is a co-equal theme with its own primitive ramp, shipped with every component from day one ([11_Design_Principles.md](../11_Design_Principles.md) §2.3):

1. **Every component ships both themes simultaneously.** A component that looks wrong in one theme is a **bug**, not a backlog item. There is no "dark pass later" in any plan.
2. **Both themes are AA-verified before merge.** The dark contrast matrix in [ColorSystem.md](./ColorSystem.md) §10 is enforced by the same CI token-pair checks as light.
3. **The component gallery renders every state in both themes.** A state documented only in light does not exist.
4. **Design happens in both.** Agency teams run AurexOS for eight-hour days, and many of them run it dark the entire time. Dark is not the edge case — for a large fraction of our users, it is the product.

We do this because theme parity is only cheap when it is structural: since components consume semantic tokens exclusively, dark correctness is a property of the token map, not of per-component effort.

## 2. The dark surface ramp philosophy

Dark has its **own ramp** (D1–D12, [ColorSystem.md](./ColorSystem.md) §4) rather than an inversion of light, for three reasons:

1. **Inverted light produces mud.** Inverting N1–N12 would put the sidebar *above* the canvas, make hover states darker than rest states, and land text at lightness values tuned for light-adapted eyes. Every relationship would be subtly wrong.
2. **Elevation is lightness in dark.** With shadows nearly invisible on dark canvases, surfaces communicate height by getting *lighter* as they rise: app background `240 6% 7%` (D2) < card `240 6% 9%` (D3) < popover/raised `240 6% 10%` (D4). This is the reverse of light theme, where everything floats on white and depth comes from borders and shadow.
3. **The sidebar sits *below* the canvas, Linear-style.** `--sidebar` is `240 6% 5%` (D1) — a step darker than the app background. The chrome recedes; the work area reads as the lit stage. (In light theme the sidebar is *tinted* instead: N2 against white.)

The full interactive stack, bottom to top: sidebar D1 → app D2 → card D3 → popover D4 → hover fill D5 → secondary/muted fill D6. Each step is 1–3 lightness points; the ramp stays within `240 5–6%` saturation so dark surfaces feel like the same cool Graphite material as light, never brown or blue-black.

## 3. Color behavior in dark

Chromatic color must be re-tuned for dark canvases, not reused:

- **Status colors desaturate and lighten — the anti neon-on-black rule.** Saturated light-theme solids on near-black glow like signage. The shipped dark solids reduce saturation and raise lightness: success `142 72% 29%` → `142 55% 45%`, danger `0 72% 45%` → `0 62% 52%`, warning `38 92% 50%` → `38 90% 55%`, info `217 85% 46%` → `217 75% 62%`. Softs drop to 15–18% L (tinted wells, not glowing panels); text variants rise to 68–72% L to pass AA on D2 (7.29:1–11.66:1, [ColorSystem.md](./ColorSystem.md) §10).
- **The accent nudges up, the ring jumps up.** Aurex Indigo lightens two points to `231 48% 56%` so white labels hold 4.94:1. The focus ring brightens dramatically to `231 60% 68%` — the light-theme ring value would measure only 3.82:1 against D2, so the dark ring gets its own stop at 5.93:1. Focus must be unmissable in both themes.
- **Accent-soft becomes a deep well, not a pale tint.** `231 48% 17%` — same hue, inverted role. Selected rows read as "lit from within" rather than "washed over".
- **Imagery and illustration.** Full-color imagery (avatars, client logos, embedded previews) renders untouched but sits inside a D3 card with a D7 border so white-background logos don't burn a hole in the canvas. Illustrations and empty-state art ship theme-aware variants drawn from the token layer; we never auto-invert raster assets.
- **Charts re-map, not re-color.** Categorical series keep their identity hues (same series = same hue in both themes) while gridlines, axes, and labels re-map to dark neutrals. All six categorical hues pass 3:1 on dark cards (3.34:1–6.52:1).

## 4. Elevation in dark

Cross-reference: [Elevation.md](./Elevation.md) owns the shadow tokens; this section defines the dark strategy.

- **Lightness steps do the work.** The D2→D3→D4 surface progression *is* the elevation system. A dark surface's height is read from its lightness before anything else.
- **Shadows are nearly invisible on dark — treat them as a whisper, not the message.** Dark shadow tokens are distinct from light (deeper offsets would just vanish; we do not reuse light's shadow values). Shadows in dark exist only on genuinely floating layers — menus, dialogs, the command palette — as soft edge-definition, never as the primary depth cue.
- **Border + surface-step first.** Every raised dark surface pairs its lighter fill with a `--border` (D7) hairline. The border does in dark what the shadow does in light: it separates the layer from what's beneath. A popover is D4 fill + D7 border + the (faint) overlay shadow, in that order of importance.
- **No glow hacks.** We never simulate elevation with outer glows, colored halos, or brightened "rim light" strokes. Two shadow levels exist in the whole system ([11_Design_Principles.md](../11_Design_Principles.md) §4.4); dark uses the same two levels with dark-tuned values.

## 5. Theme switching mechanics

- **Class strategy.** Tailwind runs `darkMode: 'class'` (`packages/config/tailwind/preset.ts`); the `.dark` class on the document root swaps the entire semantic token map in `packages/ui/styles/globals.css`. One class, every token, no component participation.
- **System preference is the default.** New users get `prefers-color-scheme`. The first impression matches the OS the user already configured.
- **Explicit override persists per user, across devices.** The three-way choice — System / Light / Dark — is stored on the user profile (server-side), not merely in `localStorage`, so a laptop choice follows the user to their desktop ([11_Design_Principles.md](../11_Design_Principles.md) §2.3).
- **No flash of wrong theme — a hard requirement.** The resolved theme class must be on `<html>` before first paint: an inline bootstrap script (or server-rendered class from the session) applies the stored preference synchronously, falling back to the media query. A white flash before dark paints is a ship-blocking bug, as is the reverse.
- **Charts** re-render on theme change from the token layer — axes, gridlines, and tooltips re-map; series hues persist (§3). No cached light-theme chart images in a dark UI.
- **Email is theme-independent.** Transactional email renders on the light token map with dark-mode-safe markup (no pure-white text traps for clients that force-invert); we do not attempt full dark email templates.
- **PDF and print exports always render light.** Documents, invoices, and reports export on the light theme regardless of the viewer's UI theme — paper is light, and client-facing artifacts must look identical no matter which theme the sender ran.

## 6. Contrast & accessibility in dark

Dark AA is verified by the same CI token-pair matrix as light. The dark legal pairs ([ColorSystem.md](./ColorSystem.md) §10, abbreviated):

| Pair | Ratio | Requirement |
|---|---|---|
| `--foreground` (D12) on D2 / D3 / D4 / D6 | 18.07 / 17.31 / 16.97 / 14.82 | 4.5:1 ✓ |
| `--sidebar-foreground` (D11) on D1 / D2 | 11.26 / 10.86 | 4.5:1 ✓ |
| `--muted-foreground` (D10) on D2 / D3 / D4 / D6 | 7.36 / 7.05 / 6.91 / 6.03 | 4.5:1 ✓ |
| `--accent-text` on `--accent-soft` / D2 | 6.84 / 7.90 | 4.5:1 ✓ |
| white on `--primary` (dark) | 4.94 | 4.5:1 ✓ |
| `--ring` (dark) on D2 | 5.93 | 3:1 ✓ |
| status `-text` on own `-soft` | 6.05–7.21 | 4.5:1 ✓ |
| status solids on D2 (large/UI) | 3.89–9.41 | 3:1 ✓ |

- **Glare management.** Primary dark text is `0 0% 98%`, never `#FFFFFF` — pure white on near-black produces halation for astigmatic users (a large population). Large text blocks in reading surfaces may step down to D11 where 10:1+ still holds. We cap dark contrast by design: maximal contrast is not maximal readability.
- **Scrims and overlays.** The modal scrim in dark is `240 10% 3.9% / 0.7` (black-graphite at 70% opacity) — heavier than light's `0.5` because dark surfaces separate less from a translucent veil. The scrim must bring any covered text below reading prominence while the dialog holds full AA internally.
- **Disabled** text uses D9 (`240 5% 28%`, 1.95:1 on D2) — intentionally below AA, exempt as inactive UI, and always paired with `not-allowed` cursor + explanatory tooltip per [11_Design_Principles.md](../11_Design_Principles.md) §6.2.

## 7. Do / don't rules

1. **Never pure black.** No `#000000` surfaces anywhere — the ramp floor is D1 (`240 6% 5%`). Pure black kills the surface-step elevation model and maximizes halation.
2. **Never pure white text.** `--foreground` is `0 0% 98%`; `#FFFFFF` text on dark surfaces is a lint-level violation.
3. **Never reuse light shadow tokens in dark.** Dark uses its own shadow values; elevation is carried by lightness steps + borders first (§4).
4. **Never desaturate or darken the brand accent below AA.** The dark accent floor is the shipped `231 48% 56%` solid and `231 60% 68%` ring; "muted dark branding" that fails 4.5:1 white-on-solid or 3:1 ring-on-canvas does not ship.
5. **Never carry light-theme status solids into dark.** Dark status colors are their own reduced-saturation stops (§3); reusing light solids is the neon-on-black failure.
6. **Never invert images, screenshots, or logos.** Contain them on a D3 card with a D7 border instead.
7. **Never hand-pick a "dark version" of a color in a component.** If a component needs a dark adjustment, the token map is wrong — fix it in `packages/ui`, once, for everyone.
8. **Never make hover darker than rest in dark.** Interaction always moves up the ramp (D3 → D5): surfaces lighten toward the user, in both themes' logic.
9. **Never ship a feature verified in only one theme.** The definition of done includes the gallery render and CI contrast pass in both.
10. **Never use opacity-on-white to fake dark surfaces.** Every dark surface is an opaque ramp stop; translucent whites produce unpredictable composites under scrolling content.

## 8. Open questions

1. **Dimmed dark variant.** Power users may ask for an even-darker "midnight" map (OLED-black adjacent). Our current position: no — it breaks the D1-floor rule and the elevation ramp. Revisit only with evidence of real demand and a full second AA matrix.
2. **Auto theme scheduling.** Should "System" gain an optional sunset/sunrise schedule independent of OS support? Deferred until requested; the OS-level setting covers most users.
3. **Client Portal default.** Does the portal follow the *client's* system preference or the agency's chosen brand presentation? Current lean: system preference, same as the app — one design system, two audiences. Needs product sign-off.
4. **Dark email.** We currently ship light-only email (§5). If client feedback shows heavy dark-mode mail-client usage, revisit with a properly tested dark template set rather than trusting client auto-inversion.
