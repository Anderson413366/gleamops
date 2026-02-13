/**
 * GleamOps Worker — Background job runner
 *
 * Currently runs:
 *   - Proposal send worker (poll QUEUED → SendGrid → SENT/FAILED)
 *   - Follow-up sequence worker (poll SCHEDULED → SendGrid → SENT/FAILED/SKIPPED)
 *
 * Future:
 *   - PDF generation
 *   - Ticket generation
 */
import { startSendWorker, stopSendWorker } from './send-worker.js';
import { startFollowupWorker, stopFollowupWorker } from './followup-worker.js';

async function main() {
  console.log('=== GleamOps Worker starting ===');
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'}`);
  console.log(`  SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? '***set***' : '(not set — simulated mode)'}`);
  console.log('');

  await startSendWorker();
  await startFollowupWorker();

  console.log('[main] all workers started — polling');
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(signal: string) {
  console.log(`\n[main] received ${signal}, shutting down gracefully...`);
  stopSendWorker();
  stopFollowupWorker();
  // Allow in-flight sends to finish, then exit
  setTimeout(() => {
    console.log('[main] shutdown complete');
    process.exit(0);
  }, 2_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main().catch((err) => {
  console.error('[main] fatal error:', err);
  process.exit(1);
});
