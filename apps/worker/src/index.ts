/**
 * GleamOps Worker — Background job runner
 *
 * Currently runs:
 *   - Proposal send worker (poll QUEUED → SendGrid → SENT/FAILED)
 *   - Follow-up sequence worker (poll SCHEDULED → SendGrid → SENT/FAILED/SKIPPED)
 *   - QBO timesheet sync worker (poll APPROVED → QBO TimeActivity → SYNCED/FAILED)
 *
 * Future:
 *   - PDF generation
 *   - Ticket generation
 */
import { startSendWorker, stopSendWorker } from './send-worker.js';
import { startFollowupWorker, stopFollowupWorker } from './followup-worker.js';
import { startQboTimesheetWorker, stopQboTimesheetWorker } from './qbo-timesheet-worker.js';

async function main() {
  console.log('=== GleamOps Worker starting ===');
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(not set)'}`);
  console.log(`  SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? '***set***' : '(not set — simulated mode)'}`);
  console.log(`  QBO_CLIENT_ID: ${process.env.QBO_CLIENT_ID ? '***set***' : '(not set — simulated mode)'}`);
  console.log(`  QBO_REALM_ID: ${process.env.QBO_REALM_ID ? '***set***' : '(not set)'}`);
  console.log(`  QBO_REFRESH_TOKEN: ${process.env.QBO_REFRESH_TOKEN ? '***set***' : '(not set)'}`);
  console.log(`  QBO_CLIENT_SECRET: ${process.env.QBO_CLIENT_SECRET ? '***set***' : '(not set)'}`);
  console.log('');

  await startSendWorker();
  await startFollowupWorker();
  await startQboTimesheetWorker();

  console.log('[main] all workers started — polling');
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(signal: string) {
  console.log(`\n[main] received ${signal}, shutting down gracefully...`);
  stopSendWorker();
  stopFollowupWorker();
  stopQboTimesheetWorker();
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
