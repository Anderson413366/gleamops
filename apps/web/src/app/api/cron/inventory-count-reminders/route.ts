import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function classify(dueDate: string, today: Date) {
  const due = new Date(`${dueDate}T00:00:00`);
  const diffDays = Math.floor((due.getTime() - new Date(toDateKey(today)).getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return { alert: 'OVERDUE', diffDays };
  if (diffDays <= 7) return { alert: 'DUE_SOON', diffDays };
  return { alert: 'ON_TRACK', diffDays };
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const header = request.headers.get('authorization');
    if (header !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 });
    }
  }

  const supabase = getServiceClient();
  const today = new Date();
  const todayKey = toDateKey(today);
  const dueIn7Key = toDateKey(addDays(today, 7));
  const overdue3Key = toDateKey(addDays(today, -3));
  const midnightIso = `${todayKey}T00:00:00.000Z`;

  const { data: dueSites, error: dueError } = await supabase
    .from('sites')
    .select('id, tenant_id, name, site_code, next_count_due')
    .is('archived_at', null)
    .not('next_count_due', 'is', null)
    .lte('next_count_due', dueIn7Key)
    .order('next_count_due');

  if (dueError) {
    // Backward compatibility before schedule columns exist.
    if (
      dueError.message.toLowerCase().includes('next_count_due')
      || dueError.message.toLowerCase().includes('count_status_alert')
      || dueError.message.toLowerCase().includes('last_count_date')
    ) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'Inventory schedule columns not available in this environment yet.',
      });
    }
    return NextResponse.json({ error: dueError.message }, { status: 500 });
  }

  const sites = (dueSites ?? []) as Array<{
    id: string;
    tenant_id: string;
    name: string;
    site_code: string;
    next_count_due: string;
  }>;

  const membershipByTenant = new Map<string, string[]>();
  const tenantIds = Array.from(new Set(sites.map((site) => site.tenant_id)));
  if (tenantIds.length > 0) {
    const { data: membershipRows } = await supabase
      .from('tenant_memberships')
      .select('tenant_id, user_id, role_code')
      .in('tenant_id', tenantIds)
      .in('role_code', ['OWNER_ADMIN', 'MANAGER', 'SUPERVISOR'])
      .is('archived_at', null);

    for (const row of ((membershipRows ?? []) as Array<{ tenant_id: string; user_id: string }>)) {
      if (!membershipByTenant.has(row.tenant_id)) membershipByTenant.set(row.tenant_id, []);
      membershipByTenant.get(row.tenant_id)!.push(row.user_id);
    }
  }

  let remindersQueued = 0;
  let siteAlertsUpdated = 0;

  for (const site of sites) {
    const { alert, diffDays } = classify(site.next_count_due, today);

    const { error: siteAlertError } = await supabase
      .from('sites')
      .update({ count_status_alert: alert })
      .eq('id', site.id)
      .is('archived_at', null);
    if (!siteAlertError) {
      siteAlertsUpdated += 1;
    }

    const is7DayReminder = site.next_count_due === dueIn7Key;
    const isDueToday = site.next_count_due === todayKey;
    const isOverdue3Days = site.next_count_due <= overdue3Key;
    if (!is7DayReminder && !isDueToday && !isOverdue3Days) continue;

    const users = membershipByTenant.get(site.tenant_id) ?? [];
    if (users.length === 0) continue;

    const title = is7DayReminder
      ? `Inventory count due in 7 days — ${site.name}`
      : isDueToday
        ? `Inventory count due today — ${site.name}`
        : `Inventory count overdue — ${site.name}`;
    const body = is7DayReminder
      ? `Inventory count for ${site.name} (${site.site_code}) is due in 7 days. Start count now.`
      : isDueToday
        ? `Inventory count for ${site.name} (${site.site_code}) is due today.`
        : `Inventory count for ${site.name} (${site.site_code}) is ${Math.abs(diffDays)} day(s) overdue.`;
    const link = `/crm/sites/${encodeURIComponent(site.site_code)}`;

    const { data: existingRows } = await supabase
      .from('notifications')
      .select('id')
      .eq('tenant_id', site.tenant_id)
      .eq('title', title)
      .eq('link', link)
      .gte('created_at', midnightIso)
      .limit(1);

    if ((existingRows ?? []).length > 0) continue;

    const payload = users.map((userId) => ({
      tenant_id: site.tenant_id,
      user_id: userId,
      title,
      body,
      link,
    }));
    const { error: notifyError } = await supabase.from('notifications').insert(payload);
    if (!notifyError) remindersQueued += payload.length;
  }

  return NextResponse.json({
    ok: true,
    scannedSites: sites.length,
    siteAlertsUpdated,
    remindersQueued,
  });
}
