import 'server-only'

import { GatewayError } from '@aurexos/ai'

// GatewayError → a short, user-safe message for AI surfaces (R-AI6: degrade
// honestly). The provider's out-of-credit billing failure comes back as a 400
// (mapped to `invalid_request`), which the generic copy hid behind "could not be
// processed" — a fixable account issue disguised as a bad request. Detect it from
// the passed-through provider message and say so plainly.

const BILLING_HINT =
  /credit balance|purchase credit|plans ?& ?billing|insufficient (?:funds|credit|balance)/i

export function friendlyGatewayError(err: GatewayError): string {
  if (BILLING_HINT.test(err.message)) {
    return 'Aurex is out of AI credits — top up the Anthropic account (console.anthropic.com → Billing) to re-enable it.'
  }
  switch (err.code) {
    case 'rate_limit':
      return 'Aurex is rate-limited right now — try again in a moment.'
    case 'timeout':
      return 'Aurex took too long to respond — try again.'
    case 'budget_exceeded':
      return 'This workspace has reached its AI budget.'
    case 'invalid_request':
      return 'That request could not be processed.'
    default:
      return 'Aurex is unavailable right now.'
  }
}
