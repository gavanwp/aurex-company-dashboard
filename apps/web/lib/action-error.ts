// Shared action primitives, extracted so both action-kit and the permission
// resolver can depend on them without a cycle (action-kit → permissions →
// action-error, never back to action-kit).

/**
 * Thrown by action-kit / permission guards; feature actions catch it (or let a
 * shared wrapper catch it) and surface `error.message` as an ActionResult.
 */
export class ActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActionError'
  }
}

/** The uniform return shape of every server action. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string }
