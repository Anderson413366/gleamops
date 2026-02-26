import { NextRequest, NextResponse } from 'next/server';
import { processOperationsMorningCron } from '@/modules/cron';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const header = request.headers.get('authorization');
    if (header !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
    }
  }

  const result = await processOperationsMorningCron();

  if (!result.ok) {
    return NextResponse.json({ error: (result as { ok: false; error: string }).error }, { status: 500 });
  }

  return NextResponse.json(result);
}
