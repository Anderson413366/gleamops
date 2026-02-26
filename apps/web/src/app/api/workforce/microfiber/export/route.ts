import { NextRequest, NextResponse } from 'next/server';
import { ownerDashboardQuerySchema } from '@gleamops/shared';
import { extractAuth, isAuthError } from '@/lib/api/auth-guard';
import { getUserClient } from '@/lib/api/user-client';
import { exportMicrofiberPayroll } from '@/modules/owner-dashboard';

const API_PATH = '/api/workforce/microfiber/export';

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return 'staff_name,staff_code,period_start,period_end,sets_washed,amount_due\n';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  const lines = rows.map((row) => headers.map((header) => escape(row[header])).join(','));
  return `${headers.join(',')}\n${lines.join('\n')}\n`;
}

export async function GET(request: NextRequest) {
  const auth = await extractAuth(request, API_PATH);
  if (isAuthError(auth)) return auth;

  const parsed = ownerDashboardQuerySchema.safeParse({
    date_from: request.nextUrl.searchParams.get('date_from') ?? undefined,
    date_to: request.nextUrl.searchParams.get('date_to') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid date filters.' }, { status: 400 });
  }

  const result = await exportMicrofiberPayroll(getUserClient(request), auth, parsed.data, API_PATH);
  if (!result.success) {
    return NextResponse.json(result.error, { status: result.error.status });
  }

  const csv = toCsv(result.data.map((row) => ({
    staff_name: row.staff_name,
    staff_code: row.staff_code,
    period_start: row.period_start ?? '',
    period_end: row.period_end ?? '',
    sets_washed: row.sets_washed,
    amount_due: row.amount_due,
  })));

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="microfiber-payroll.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
