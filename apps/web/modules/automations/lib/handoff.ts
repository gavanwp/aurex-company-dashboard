// sessionStorage key for handing an AI-drafted automation to the builder. Kept
// client-side and one-shot: the builder reads it once on mount, then clears it.
export const DRAFT_HANDOFF_KEY = 'aurex-automation-draft'
