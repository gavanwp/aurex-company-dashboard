// notifications-deliver — dedicated worker for the "notifications.deliver"
// queue (NotificationsArchitecture.md §2/§8; ADR-0004 channel adapters;
// ADR-0005 jobs substrate). FOUNDATION SKELETON: the claim/complete/fail
// spine is real; channel delivery is stubbed exactly where adapters plug in.
//
// Pipeline position: everything BEFORE this worker (subscription matching,
// recipient resolution, permission check, template render, coalescing) has
// already happened — the notifications row (0005) exists with rendered
// title/body, and one 'notifications.deliver' job per notification was
// enqueued in the same logical write. This worker owns ROUTING + DELIVERY:
//   claim job → load notification → load preference matrix → route to
//   channel adapters → write delivery record per channel → retry/backoff.
//
// Scheduling: pg_cron on a tight cadence (in-app is the pacing channel for
// the p95 ≤ 5s delivery SLO — see README.md; a LISTEN/NOTIFY nudge is the
// documented upgrade if polling breaches the SLO, ADR-0005).

import { createServiceClient } from '../_shared/service-client.ts'
import { claimJobs, completeJob, failJob } from '../_shared/jobs.ts'

const QUEUE = 'notifications.deliver'
const BATCH_SIZE = 20

Deno.serve(async (_req: Request): Promise<Response> => {
  const client = createServiceClient()
  const workerId = `notifications-deliver:${crypto.randomUUID().slice(0, 8)}`
  const jobs = await claimJobs(client, QUEUE, BATCH_SIZE, workerId)
  let succeeded = 0
  let failed = 0

  for (const job of jobs) {
    try {
      // ── 1. Parse payload (R-T3: jsonb is a boundary) ──────────────────────
      // Import-map upgrade: NotificationsDeliverPayloadSchema.parse(job.payload)
      // from @aurexos/core replaces this structural check.
      const notificationId =
        typeof job.payload['notificationId'] === 'string' ? job.payload['notificationId'] : null
      if (notificationId === null) {
        await failJob(client, job, 'payload missing notificationId', { permanent: true })
        failed += 1
        continue
      }

      // ── 2. Load the notification — ALWAYS workspace-scoped ───────────────
      // Service role bypasses RLS, so workspace_id is an explicit predicate
      // (docs/09 §2.3). A missing row is permanent: notifications are pruned
      // at 90 days and a pruned/deleted target will never reappear.
      const { data: notification, error: loadError } = await client
        .from('notifications')
        .select('*')
        .eq('workspace_id', job.workspace_id)
        .eq('id', notificationId)
        .maybeSingle()

      if (loadError) throw new Error(`load notification failed: ${loadError.message}`)
      if (notification === null) {
        await failJob(client, job, `notification ${notificationId} not found`, { permanent: true })
        failed += 1
        continue
      }

      // ── 3. Load the recipient's preference matrix ─────────────────────────
      // notification_preferences persistence lands in a future migration; the
      // contract (NotificationPreferenceMatrixSchema) is in @aurexos/core.
      // Until then every type delivers on its registry defaultChannels
      // (NOTIFICATION_TYPES in core), which is also the correct fallback for
      // recipients without preference rows (§6.2). Mandatory types
      // (approvals, security) must never resolve to all-channels-off (§6.3).

      // ── 4. Route to channel adapters (the ADR-0004 seam) ─────────────────
      //
      // IN-APP: the notifications row itself IS the in-app delivery —
      // Supabase Realtime pushed it to `notifications:{user_id}` on insert
      // (§4.4). Nothing to send here; the in-app "delivery record" is the
      // row's existence, reconciled by the inbox on open.
      //
      // EMAIL (Resend adapter — stub until packages/ui/emails templates and
      // RESEND_API_KEY wiring land):
      //
      //   const resendKey = Deno.env.get('RESEND_API_KEY')
      //   const res = await fetch('https://api.resend.com/emails', {
      //     method: 'POST',
      //     headers: {
      //       authorization: `Bearer ${resendKey}`,
      //       'content-type': 'application/json',
      //       // Resend idempotency: buildDeliveryIdempotencyKey(id, 'email')
      //       'idempotency-key': `${notification.id}:email`,
      //     },
      //     body: JSON.stringify({
      //       from: 'AurexOS <notifications@...>', // dedicated subdomain, §8
      //       to: recipientEmail,                  // resolved from profiles
      //       subject: notification.title,
      //       html: renderedHtml,                  // React Email template
      //     }),
      //   })
      //   // Classify per the adapter contract: 429/5xx → retryable (respect
      //   // retry-after), 4xx validation → permanent_failure. Never throw for
      //   // provider errors — classified results drive failJob's policy.
      //
      // PUSH: Phase 4 (Web Push/VAPID). DIGEST: Phase 2 (digest queue).
      // Long-tail (Slack/SMS/WhatsApp/Discord/Telegram): n8n-bridged
      // adapters behind the same ChannelAdapter interface — never new
      // pipeline code here (ADR-0004).
      //
      // ── 5. Write delivery records ─────────────────────────────────────────
      // One idempotent row per (notification, channel) with the state machine
      // pending → sent → delivered/bounced → dead. The notification_deliveries
      // table lands in a future migration; ChannelDeliverySchema in core
      // governs it. Upsert on the idempotency key so worker replays are
      // absorbed structurally (§8).
      console.log(
        `notifications-deliver skeleton: notification ${notification.id} ` +
          `(type ${notification.type}, workspace ${job.workspace_id}) — ` +
          'in-app delivered via row insert; email/push/digest adapters pending',
      )

      await completeJob(client, job.id)
      succeeded += 1
    } catch (err) {
      // Unclassified failure → retryable path: 30s → 2m → 10m → 1h → 6h,
      // then 'dead' (admin-replayable DLQ, surfaced in Settings — §8).
      const message = err instanceof Error ? err.message : String(err)
      await failJob(client, job, message)
      failed += 1
    }
  }

  return new Response(JSON.stringify({ workerId, claimed: jobs.length, succeeded, failed }), {
    headers: { 'content-type': 'application/json' },
  })
})
