# Forms

| | |
|---|---|
| **Document** | Form & Input Specification — AurexOS Design System |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [Buttons.md](./Buttons.md) · [Components.md](./Components.md) · [DesignTokens.md](./DesignTokens.md) · [ColorSystem.md](./ColorSystem.md) · [../11_Design_Principles.md](../11_Design_Principles.md) |

This document is the **target specification**. The shipped `packages/ui/components/input.tsx` is stock shadcn (`h-9`, `shadow-sm`); the target is **32px md height, border-first with no shadow**, semantic tokens throughout. Deltas flagged where they matter.

---

## 1. Form doctrine

1. **Forms are conversations.** One question at a time, in order, in plain language. A form that reads like a database schema ("Entity name", "Record type") is a failed conversation ([../11_Design_Principles.md](../11_Design_Principles.md) §11).
2. **One column, always, by default.** Max content width ~640px. The eye travels down one line, not in a Z-pattern. Two-column exceptions are narrow and enumerated (§7).
3. **Progressive disclosure over long forms.** More than ~8 fields → group into titled sections; more than ~3 sections → consider a stepped flow or move rarely-used fields behind "Show advanced options". Never a 40-field wall.
4. **Autosave where draft/publish isn't real** ([../11_Design_Principles.md](../11_Design_Principles.md) §8.8). Settings, entity detail panels, and editors save as you go with visible state ("Saved just now"). Explicit submit buttons exist only where a real commit boundary exists: sending, publishing, money.
5. Every field must justify itself. If the product can infer it, don't ask. If it's optional and rarely used, disclose it progressively.

## 2. Field anatomy

```
 Label                       ← 13/500 small-strong, --text-primary
 ·8px·
┌───────────────────────────┐
│ Control (md 32px)         │
└───────────────────────────┘
 ·4px·
 Helper text                 ← caption 12, --text-muted
```

- **Label:** top-aligned above the control, **13px / 500** ("small-strong"), `--text-primary`, sentence case, no trailing colon. 8px from label baseline box to control. Labels are nouns or short noun phrases ("Client email", not "Please enter the client's email address").
- **Required marker policy (pinned): mark optional fields, not required ones.** Append "(optional)" in `--text-muted` to the label of optional fields. Rationale: in a professional tool most fields are required — asterisks on nearly every label are noise, the legend explaining the asterisk is clutter, and the rare optional field is the actual information. If a form is mostly optional fields, the form is over-asking — fix the form.
- **Helper text:** caption (12px), `--text-muted`, **4px below the control**, one sentence maximum. Persistent — helper text never disappears when an error appears; the error renders below it (§6).
- **Placeholder rules:** placeholders are **format examples only** ("acme.com", "DD/MM/YYYY", "name@company.com") — never instructions, never a substitute for the label, never required information. Placeholders vanish on input; anything the user must remember goes in the label or helper text. Placeholder color `--text-muted`, and it must not pass for filled text.

## 3. Inputs

### 3.1 Types

| Input | Spec |
|---|---|
| Text | md 32px default (28 compact / 36 large per control-height tokens), 12px h-padding, radius 6, body 14 text |
| Textarea | min-height 3 lines, vertical resize only, grows with content up to ~12 lines then scrolls; same tokens |
| Number | tabular figures; optional stepper (icon buttons 16px) on hover/focus only; right-aligned when in tables |
| Currency | **integer minor units** under the hood (never floats); currency select attached left (or fixed code label when the workspace is single-currency); amount right-aligned, `tabular-nums`, Geist Mono in tables and totals |
| Search | leading 16px search icon, `Esc` clears, optional `/` shortcut hint as trailing `kbd`; loading spinner replaces the icon during async search |

### 3.2 State matrix — tokens per theme

| State | Background (light / dark) | Border (light / dark) | Text | Extras |
|---|---|---|---|---|
| default | `--bg-surface` / `--bg-surface` | `--border-subtle` | `--text-primary` | placeholder `--text-muted` |
| hover | unchanged | `--border-strong` | — | 150 ms transition |
| focus | unchanged | `--border-focus` | — | + 2px `--focus-ring`, 2px offset |
| filled | unchanged | `--border-subtle` | `--text-primary` | indistinguishable from default except content |
| disabled | `--bg-raised` | `--border-subtle` | `--text-disabled` | 0.5 opacity, `not-allowed`, tooltip-why when non-obvious |
| readonly | `--bg-app` / `--bg-app` | none (flush) | `--text-primary` | selectable text; visually "data", not "field" |
| error | unchanged | `--status-danger-solid` | — | + error text & icon per §6; focus ring stays the standard ring |
| success | unchanged | `--status-success-solid`, transient | — | only after async validation (§6.4), fades after ~2s |

No default `shadow-sm` (delta from shipped input): depth is borders and background steps, not shadows ([../11_Design_Principles.md](../11_Design_Principles.md) §4.4).

## 4. Selection controls

### 4.1 Select / combobox

- ≤ 7 options: plain select popover. **> 7 options: searchable combobox** — a type-to-filter input at the top of the popover, arrow-key navigable, `Enter` selects, `Esc` closes.
- Trigger looks like an input (same 32px anatomy) with a trailing 16px chevron. Popover: radius 12, overlay shadow (the menu shadow level), max-height ~320px with internal scroll.
- Selected option shows a leading 16px check. Empty-result state says "No matches for '…'" and, where valid, offers "Create '…'".

### 4.2 Checkbox

- **16px box**, radius 4, 8px gap to its label (label is clickable). Checked: `--accent-solid` fill, white 12px check. **Indeterminate:** accent fill with a 8px horizontal dash — used only for parent checkboxes over partially-selected children.
- Groups stack vertically, 8px between rows; never grids of checkboxes.

### 4.3 Radio

- Use only for **≤ 5 mutually exclusive options that should all be visible** (plan tiers, visibility levels). 6+ options or non-critical comparisons → select. 16px circle, accent dot when selected, 8px to label; arrow keys move selection within the group.
- Radios always render with a default selected where a sane default exists; a zero-selection radio group is a smell.

### 4.4 Switch

- **Switches are for immediate-effect settings only** — the change applies the instant you flip it ("Email notifications", "Compact density"). **Never inside a submit form:** a switch promises immediacy; parking it behind a "Save" button breaks that promise and users cannot tell whether it has taken effect. Inside forms, use a checkbox — a checkbox reads as "a value I'm setting", a switch reads as "a thing I'm doing".
- 32×18px track, 14px thumb, accent track when on, 150 ms thumb slide. Pair with a visible saved-state cue when the setting persists async ("Saved").

## 5. Complex fields

### 5.1 Date & date-range picker

- Trigger = input anatomy with leading 16px calendar icon; typed input accepted and parsed (locale-aware).
- Popover calendar: full keyboard grid — arrows move by day, PageUp/Down by month, Home/End to week edges, `Enter` selects. Range mode: first click sets start, hover previews the span in `--accent-soft`, second click sets end.
- **Presets column** ("Today", "Tomorrow", "Next Friday", "In 30 days", "This quarter") beside the grid — agencies think in deadlines, not dates.
- **Timezone note:** when a datetime crosses users (meetings, portal deadlines), the field shows the workspace timezone as caption text ("17:00 — Europe/Berlin") and stores UTC. Date-only values (due dates, invoice dates) are timezone-naive and never shift.

### 5.2 File upload

- **Drop zone:** dashed `--border-strong` border, radius 8, 24px padding, 16px upload icon + "Drop files or **browse**" (browse = link variant). Drag-over: `--accent-soft` bg + accent border. Clicking anywhere opens the picker.
- **Multi-file rows** below the zone, one per file: 16px type icon, name (truncated middle), size, then per state — progress bar (determinate) while uploading; **"Scanning…" badge while AV-scan is pending** (file is not linkable until clean); success check when done; on failure an inline danger caption ("Upload failed — network error") + a **Retry** ghost button per row. Row remove = icon button (X) with tooltip.
- **Size/MIME messaging:** constraints stated up front as helper text ("PDF, PNG or ZIP · up to 25 MB each"), and rejections are specific: "invoice.mov is 212 MB — the limit is 25 MB", never "Invalid file".

### 5.3 Tag / multi-select input

- Selected values render as removable chips (radius 4, `--bg-raised`, 12px text, X icon 12px) inside the control, which grows to max 3 rows then scrolls. Typing filters the option popover; `Enter` adds, `Backspace` on empty input removes the last chip. Free-text creation ("Create 'fintech'") only where the vocabulary is user-owned.

### 5.4 Mention input (@)

- Typing `@` in comments/descriptions opens an inline popover filtered as you type: avatar 16px + name + muted role. Arrow keys + `Enter` insert a mention chip; `Esc` dismisses and leaves the literal text. Mentions are entity links ([../11_Design_Principles.md](../11_Design_Principles.md) §8.7) and respect permissions — you can't mention someone outside the resource's access scope.

### 5.5 Duration input

- Accepts natural shorthand ("1h 30m", "90m", "2d") and normalizes on blur to the canonical display; helper text shows the parsed value while typing when ambiguous. Stored as minutes (integer).

## 6. Validation architecture

1. **Inline, on blur.** Fields validate when the user leaves them — never keystroke-by-keystroke on first entry (nobody wants "invalid email" after typing one character). **After a field has erred once, it revalidates on change**, so the error clears the moment the input becomes valid.
2. **Error presentation:** caption-size `--status-danger-text` message below the field (below helper text, replacing nothing), 16px danger icon inline with the message, plus danger border on the control. **Never color alone** — text + icon always ([../11_Design_Principles.md](../11_Design_Principles.md) §5). Message says what's wrong and how to fix it: "This email is missing an @ — check for a typo", never "Invalid input".
3. **Error summary for long forms:** on failed submit of a form taller than one viewport, render a summary card above the actions row listing each error as a link; **focus moves to the first errored field** and the summary links focus their targets. Submit is never silently ignored.
4. **Async validation** (slug/email availability, duplicate detection): inline 16px spinner at the trailing edge of the control while checking, transient success state on pass (§3.2), specific error on fail. Debounced ≥ 400 ms; the form cannot submit while checks are in flight.
5. **Client validation is UX; server validation is the contract.** Both run from the **same shared Zod schema** — one source of truth for shape and rules, so client and server can never disagree (see [../architecture/Architecture.md](../architecture/Architecture.md) §3.2). Server-rejected fields render exactly like client errors, mapped back to their fields — never a toast ([../11_Design_Principles.md](../11_Design_Principles.md) §12.8).
6. Money and destructive submissions are never optimistic; everything else follows the standard optimistic mutation pattern (§8 of the bible).

## 7. Layout & rhythm

| Relationship | Spacing |
|---|---|
| Label → control | 8px |
| Control → helper/error text | 4px |
| Field → field | 16px |
| Group → group | 24px, with **title-3 (15/600)** group header, 16px header-to-first-field |
| Last field → actions row | 24px |

- **Two-column exceptions:** only intrinsic pairs of the city/zip class — city + postal code, first + last name, currency + amount, start + end date. The pair shares one visual row with a 16px gutter and reads as one question. Never two unrelated fields side by side, never a general two-column grid.
- **Full-width controls law:** controls fill the form column width. Exceptions sized to their content are allowed only for inherently short values (postal code, CVC, quantity) — a 640px-wide "Age" field looks broken. Inputs never exceed the ~640px column.
- Vertical rhythm sits on the 4px grid throughout; no field ever "optically adjusted" off-grid.

## 8. Form actions

- **Primary label = verb + object** ([Buttons.md](./Buttons.md) §1): "Create client", "Send invoice", "Save changes" (settings only). Never "Submit".
- **Cancel = ghost variant**, labeled "Cancel" (dialogs) or omitted entirely in autosaving surfaces — an autosaving form has nothing to cancel.
- Alignment: page-level forms left-align actions, primary first; dialog forms right-align, primary rightmost ([Buttons.md](./Buttons.md) §6.2).
- **Destructive placement isolated:** a destructive action within a form surface ("Delete this project") is never in the main actions row. It lives in a separated danger zone at the bottom of the page (settings) or isolated at the far left of a dialog footer, with dead space between it and the primary — mis-clicks must be geometrically implausible.
- **Unsaved-changes guard:** if a surface autosaves, there is nothing to guard — navigation is always safe. Show a blocking "Discard changes?" dialog **only when work is genuinely non-recoverable** (an unsent composed email). Where possible, prefer saving a draft silently and offering "Resume draft" on return over interrupting exit.
- Submitting shows the loading-button anatomy ([Buttons.md](./Buttons.md) §4); the form's fields become readonly (not grayed) during submit.

## 9. Accessibility

1. **Every control has a programmatic label** — `<label for>` or the Radix equivalent. Placeholder-as-label is banned.
2. **`aria-describedby`** links each control to its helper text and, when present, its error message — screen readers hear both.
3. **`fieldset`/`legend`** (or ARIA group + label) for every titled group, radio group, and checkbox group.
4. **Error announcements:** on-blur errors are announced via the described-by association; the submit-time error summary is an assertive live region ("3 fields need attention"). Async validation results announce politely.
5. Focus management: failed submit focuses the first error; popovers (select, date, mentions) trap arrow-key navigation but keep Tab moving through the form; `Esc` always closes the popover without clearing the field.
6. **Definition of done: keyboard-only completion test.** Every form ships only after being completed start-to-submit with no pointer — including date pickers, comboboxes, file upload (browse via Enter), and mentions.
7. Autocomplete attributes set on identity/address/payment fields (`autocomplete="email"`, etc.) — browser autofill is an accessibility feature.

## 10. Do / don't

| # | Do | Don't |
|---|---|---|
| 1 | One column, ~640px max | Never multi-column grids of unrelated fields |
| 2 | Labels above controls, 13/500 | Never floating labels or placeholder-as-label |
| 3 | Mark optional fields "(optional)" | Never asterisk forests + legend |
| 4 | Placeholders as format examples | Never instructions or data in placeholders |
| 5 | Validate on blur, revalidate on change | Never keystroke errors on first entry |
| 6 | Error = text + icon + border | Never color alone, never toast-borne field errors |
| 7 | Focus the first error on failed submit | Never a silently ignored submit |
| 8 | Shared Zod schema client + server | Never divergent validation rules |
| 9 | Switch = immediate effect only | Never a switch inside a submit form |
| 10 | Searchable combobox above 7 options | Never a 40-option native scroll select |
| 11 | Autosave with visible state | Never "are you sure you want to leave" on recoverable drafts |
| 12 | Isolate destructive actions with dead space | Never "Delete" adjacent to "Save" |
| 13 | State file limits up front, name the offending file | Never "Invalid file" |
| 14 | Store money as integer minor units | Never floats for currency |

## 11. Open questions

1. **Inline edit pattern** (click-to-edit fields on detail panels) — needs its own spec: display/edit swap animation, Esc-to-revert semantics. Target: Components.md or a v1.1 section here.
2. **Address autocomplete** (provider-backed) — do we ship a composite address field or discrete fields with autofill? Blocked on data-provider decision.
3. **Multi-step form pattern** (wizard) — threshold and progress UI not yet specced; currently we avoid wizards outside onboarding.
4. Whether the transient success border (§3.2) is worth the motion budget on non-async fields — currently restricted to async checks only; revisit with usage data.
