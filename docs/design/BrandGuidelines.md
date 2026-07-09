# Brand Guidelines — AurexOS

| | |
|---|---|
| **Document** | Brand Guidelines — AurexOS |
| **Status** | Approved — Living Document |
| **Version** | 1.0 |
| **Date** | 2026-07-08 |
| **Owner** | Chief Product Designer, AurexDesigns |
| **Related** | [ColorSystem.md](./ColorSystem.md) · [Typography.md](./Typography.md) · [Icons.md](./Icons.md) · [IllustrationStyle.md](./IllustrationStyle.md) · [../11_Design_Principles.md](../11_Design_Principles.md) · [../architecture/FutureArchitecture.md](../architecture/FutureArchitecture.md) |

This document is the binding brand specification for AurexOS. It codifies the personality defined in [11_Design_Principles.md §1 and §11](../11_Design_Principles.md) into rules anyone shipping a pixel or a sentence can apply.

---

## 1. Brand essence

**AurexOS is the calm, capable operating system for agencies.** The brand promise is relief: one system that holds the whole business and an AI that runs the boring parts, honestly attributed, with humans approving what matters ([01_Project_Vision.md](../01_Project_Vision.md) §1–2).

Each personality attribute is a constraint, not a mood board:

| Attribute | This means | This never means |
|---|---|---|
| **Professional** | The tool of a firm you'd trust with your books | Corporate stiffness, legalese, stock-photo suits |
| **Minimal** | Every element justifies itself; when in doubt, remove | Sparse-for-Instagram screens that hide the data people need |
| **Premium** | Restraint and finish — alignment, rhythm, one accent | Gold gradients, serif flourishes, "luxury" darkness for its own sake |
| **Modern** | Current craft: variable fonts, instant response, dark mode as first-class | Chasing the gradient-of-the-month or this year's landing-page trend |
| **Trustworthy** | Honest states, cited sources, visible AI attribution | Dark patterns, fake urgency, confidence without evidence |
| **AI-first** | Aurex has whole-business context and acts with approval | Sparkle-washing — ✨ on every button, "magic" as a feature name |
| **Fast** | Sub-100ms feedback; speed as personality | Frantic motion, countdowns, busy-ness theater |
| **Elegant** | One typeface, one accent, two shadows — composure | Ornament, decoration, novelty for novelty's sake |

The one-line brand: **quiet competence.** If a design choice makes AurexOS louder, it is off-brand, whatever else it achieves.

## 2. The name & wordmark

### 2.1 The name

- The product is **AurexOS** — one word, capital A, capital OS. Always.
- Never "Aurex OS", "AUREXOS", "aurexos", or "AurexOs" in prose. (Lowercase is permitted only where a technical namespace demands it: package names, domains, URLs.)
- "Aurex" alone refers to **the AI**, not the product. "Ask Aurex" is correct; "open Aurex" meaning the app is not.
- The company is **AurexDesigns** (one word, capital A, capital D) — https://aurexdesigns.com.

### 2.2 The wordmark

- The wordmark is **"AurexOS" set in Geist Sans 600**, sentence-set as written (capital A + OS), default letter-spacing at ≥18px per [Typography.md](./Typography.md). Where an asset is required (favicons, social cards), use the provided asset from `packages/ui/brand` — never a re-typeset approximation in another weight or family.
- **Clearspace:** empty space equal to the height of the capital A on all four sides. Nothing enters it — not the ✦, not a tagline, not a partner logo.
- **Minimum sizes:** 16px cap height on screen; 4mm cap height in print.
- **Ornament:** the ✦ mark is the brand's only ornament (§6). No swooshes, no underlines, no containing shapes.
- **Relationship to AurexDesigns:** AurexOS is a product **of** AurexDesigns. The "by AurexDesigns" lockup (wordmark + `caption`-scale credit) exists for **marketing surfaces only** — it never appears inside the product UI.

### 2.3 Do not

Do not stretch, recolor outside token values, outline, shadow, gradient-fill, rotate, or animate the wordmark. Do not set it in Title Case sentences ("The AurexOS Platform") — sentence case rules apply around it ([11 §11](../11_Design_Principles.md)).

## 3. Brand color

- The identity thread is **Aurex Indigo** — the accent family whose values are owned by [ColorSystem.md](./ColorSystem.md). This document never restates HSL values; if you are typing a hex code, you are in the wrong file.
- **In-product, the 10% restraint law holds** ([11 §2.4](../11_Design_Principles.md)): indigo appears only on primary actions, active nav, selection, focus, and Aurex identity moments. If a screen is more than ~10% accent, it's wrong.
- **In marketing, the brand may breathe more:** soft indigo washes, larger accent fields, indigo-dominant hero sections — but always the same hue family from the token layer. Marketing gets more accent, never *different* accent.
- **The graphite neutrals are the true brand canvas.** AurexOS is recognizably AurexOS mostly because of what isn't colored: the calm graphite ramp, in both themes, is the brand's texture. A competitor screenshot with our indigo would still not look like us; a neutral screen of ours already does.
- Module identity hues (finance teal, CRM sky, automation orange, analytics purple) are product wayfinding, **not brand colors**. They never appear in marketing, logos, or brand assets ([ColorSystem.md](./ColorSystem.md) subordination law).

## 4. Brand typography

- **Geist is the brand voice in product and marketing.** One family everywhere — Geist Sans for text, Geist Mono for code, IDs, and figures ([Typography.md](./Typography.md)). Marketing does not get a "display serif for warmth"; contrast comes from **weight and scale, not family**.
- Marketing surfaces may exceed the app's eight-token scale (a hero headline is not a page title), but stay within Geist, weights 400–600, with the same −0.01em tightening at large sizes. The app's scale is untouched by marketing needs.
- **Numerals are a brand signature.** Confident, tabular figures — the stat tile with a 700-weight tabular numeral over a quiet caption is the most AurexOS composition there is. Marketing claims are numbers, set the same way: "14 tools replaced", "38 hours saved" — tabular, specific, sourced.

## 5. Voice & tone

The [11 §11](../11_Design_Principles.md) voice, codified as brand: **a competent colleague.** Concise, human, calm, direct. Sentence case everywhere. No jargon — users read "workspace", "client", "invoice"; never "tenant", "entity", "record".

### 5.1 Tone map

| Context | Tone | Sounds like |
|---|---|---|
| Product UI | Direct | "Couldn't send — the client's email bounced. Fix the address and retry." |
| Portal & client-facing | Reassuring professional | "Your proposal is ready to review. Questions go straight to your team." |
| Marketing | Confident, specific | "Aurex drafts the status email from this week's actual milestones. You approve it." |
| Errors & incidents | Honest, factual | "Some dashboards are loading slowly. We're on it — data is safe." |
| Legal & billing | Plain, unhedged | "Your plan renews on 1 August. Cancel any time before then." |

### 5.2 Banned words

Marketing and product copy never use: **revolutionary, supercharge, unleash, magic** — plus their cousins: game-changing, 10x, blazingly, effortless, delightful, superpowers. AI claims are **specific and verifiable**: name the task, the input, the output, and the approval step. "AI-powered magic" is a claim we can't defend; "drafts the invoice email and waits for your approval" is one we can demo.

### 5.3 Aurex's voice

Aurex speaks **first person, brief, concrete**. It cites its sources as links to actual records, states uncertainty plainly ("I couldn't find that" — never a guess), and describes its actions honestly: "I drafted this — review before sending." No theatrical apologies, no over-hedging, no exclamation-point enthusiasm. **Trust is the brand**; Aurex sounding sure when it isn't is the one unforgivable behavior ([11 §9](../11_Design_Principles.md)).

## 6. The ✦ mark

The four-pointed star is the brand's signature moment — the visible seam between human and AI work. Full product spec lives in [Icons.md §5](./Icons.md); the brand-level rules:

- **✦ means "Aurex did this." Nothing else, ever.** It is an attribution glyph with a provenance contract, not a logo particle.
- **Never decorative.** Not a bullet, not a divider, not a hero-section garnish, not a loading spinner.
- **Never plural sparkles.** ✨ is banned everywhere — product, marketing, docs, social. One still mark, not a shower of magic.
- **Never animated.** No pulse, shimmer, or twinkle, in product or marketing. Stillness is the point: the mark is a record, not an advertisement.
- In marketing it may appear **once** per composition, at rest, doing its real job (marking an AI-drafted artifact in a screenshot). A marketing page strewn with ✦ has misunderstood the brand.

## 7. Photography & imagery

- **Product-first imagery.** The product is the brand photo. Marketing, docs, and social lead with real UI screenshots — accurate, current, and from the shipping version. Mockups that show features we don't have are banned.
- **No stock photography culture.** No handshakes, no laptop-in-café, no diverse-team-laughing-at-whiteboard. If a human context is genuinely needed (Phase 5), it is commissioned, candid, and rare — but the default answer is a screenshot.
- **Screenshot standards (binding):**
  - Theme: dark theme for marketing hero contexts, light for documentation — chosen per context and consistent within a page. Never a mixed grid.
  - Data: realistic demo workspace — plausible agency names, projects, and amounts. **No lorem ipsum, no "Test test", no obviously fake `$999,999` figures.** Real-looking data is a trust signal.
  - Privacy: never a real client's workspace without written consent; demo data only by default.
  - Frame: screenshots sit in a rounded container (card radius per [11 §4.4](../11_Design_Principles.md)) with the system's **shadow-2** — the highest elevation we own ([Elevation.md](./Elevation.md)). No fake browser chrome, no perspective tilts, no device mockups.
- Illustration in imagery follows [IllustrationStyle.md](./IllustrationStyle.md) — structural line, one accent, no characters.

## 8. Application — where the brand shows

| Surface | Brand expression |
|---|---|
| **App** | Favicon (✦-derived asset from `packages/ui/brand`), the loading mark on cold start, and the auth pages — sign-in is the app's one marketing-grade moment (wordmark, generous space, quiet indigo). Past auth, brand recedes to the sidebar wordmark and the ✦ doing its job. |
| **Client portal** | **The agency's brand leads.** Their logo, their accent, their name. AurexOS recedes to a "Powered by AurexOS" credit in the portal footer — `caption` scale, muted, one line, linking to the marketing site. Never in the header, never above the agency's own identity. Phase 5 white-label removes even that credit for qualifying plans ([../architecture/FutureArchitecture.md](../architecture/FutureArchitecture.md) §4). |
| **Email templates** | React Email, minimal header. Product notifications carry the AurexOS wordmark, small. **Client-facing sends (invoices, proposals, portal invites) carry the agency's branding** — we are infrastructure there, not sender. |
| **PDF documents** | Invoice and proposal branding = **the workspace's brand**, not ours: their logo, their details. AurexOS appears at most as a generation credit in document metadata, never on the page a client signs. |
| **Marketing site** | Phase 5. Same tokens, same Geist, same restraint law with the marketing allowances of §3–4. A separate marketing addendum will extend — never override — this document. |

## 9. Co-branding & white-label

- **Precedence rule: workspace brand > AurexOS in every client-facing surface.** The agency's client must feel they are dealing with their agency. Our brand's job in those rooms is to be quietly reliable, then invisible.
- Co-branded lockups (agency logo + "Powered by AurexOS") follow §2.2 clearspace on both marks; the agency mark is never smaller than ours.
- **What never rebrands, even fully white-labeled:** security pages, legal terms, privacy policy, and status/incident communications. Accountability must trace to the actual operator; renaming who is responsible for data is a trust violation, not a branding feature.
- Architecture, tiers, and the white-label mechanism: [../architecture/FutureArchitecture.md](../architecture/FutureArchitecture.md) §4.

## 10. Brand governance

- **Assets** (wordmark files, ✦ mark, favicon set, social templates) live in `packages/ui/brand` — the single source. Assets found in Slack threads, Figma drafts, or old decks are not assets.
- **Approval:** any new brand-surface usage (partnerships, co-marketing, press, template marketplaces) is approved by the Chief Product Designer; disputes escalate to the Founding CTO. Internal product use needs no approval if it follows this document exactly — that is what the document is for.
- **The litmus test,** applied to every brand artifact before it ships: *would this hold up beside Linear and Stripe?* Not "is it fine" — would it hold up. If the honest answer is no, it doesn't ship.
- Changes to this document follow the rule-change process in [../12_Project_Rules.md](../12_Project_Rules.md) §10.

## 11. Do / don't

| # | Do | Don't |
|---|---|---|
| 1 | Write "AurexOS", one word, capital A + OS | "Aurex OS", "AUREXOS", "aurexos" in prose |
| 2 | Use "Aurex" for the AI only | Call the whole product "Aurex" |
| 3 | Set the wordmark in Geist Sans 600 or use the asset | Re-typeset it in another weight, family, or Title Case |
| 4 | Keep clearspace = cap-A height around the wordmark | Crowd it with taglines, logos, or the ✦ |
| 5 | Hold the 10% accent law in product; let marketing breathe in the same hue | Introduce a second brand color or module hues in marketing |
| 6 | Lead with real screenshots and realistic demo data | Lorem ipsum, fake features, stock handshakes |
| 7 | Make AI claims specific and verifiable | "Revolutionary AI magic that supercharges your agency" |
| 8 | Use ✦ once, still, meaning "Aurex did this" | Sparkle showers, ✨, animated twinkles, ✦ as decoration |
| 9 | Let the agency's brand lead in the portal and client PDFs | Put our logo above theirs on anything a client signs |
| 10 | Keep security and legal pages under our name in white-label | Let a reseller rebrand accountability |
| 11 | Frame screenshots with system radius + shadow-2 | Perspective tilts, device mockups, fake browser chrome |
| 12 | Apply the Linear/Stripe litmus test before shipping | Ship "good enough for a small company" |

## 12. Open questions

| # | Question | Owner | Target |
|---|---|---|---|
| 1 | Does the wordmark need a drawn logotype (custom letterforms) before Phase 5 marketing, or does typeset Geist 600 remain the mark? Current position: typeset — revisit with the marketing site. | CPD | Phase 5 |
| 2 | ✦ trademark search and registration before public marketing use. | Founding CTO | Phase 5 |
| 3 | Dark-vs-light default for documentation screenshots once docs ship — one rule, applied everywhere. | CPD | Phase 3 |
| 4 | Whether "Powered by AurexOS" in the portal footer links to a portal-specific landing page rather than the general marketing site. | CPD | Phase 5 |
| 5 | Naming convention for Aurex sub-capabilities (digest, briefing) — features get plain names, never "AurexBrain"-style sub-brands. Confirm and codify when features land. | CPD | Phase 2 |
