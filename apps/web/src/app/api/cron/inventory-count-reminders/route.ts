import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

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

function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL
    ?? process.env.NEXT_PUBLIC_SITE_URL
    ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
    ?? 'https://gleamops.vercel.app';
  const prefixed = raw.startsWith('http') ? raw : `https://${raw}`;
  return prefixed.replace(/\/$/, '');
}

function reminderCopy(
  siteName: string,
  siteCode: string,
  dueDate: string,
  diffDays: number,
): { title: string; body: string; kind: 'DUE_IN_7' | 'DUE_TODAY' | 'OVERDUE_3' } | null {
  if (diffDays === 7) {
    return {
      title: `Inventory count due in 7 days — ${siteName}`,
      body: `Inventory count for ${siteName} (${siteCode}) is due in 7 days (${dueDate}). Start count now.`,
      kind: 'DUE_IN_7',
    };
  }
  if (diffDays === 0) {
    return {
      title: `Inventory count due today — ${siteName}`,
      body: `Inventory count for ${siteName} (${siteCode}) is due today (${dueDate}).`,
      kind: 'DUE_TODAY',
    };
  }
  if (diffDays === -3) {
    return {
      title: `Inventory count overdue by 3 days — ${siteName}`,
      body: `Inventory count for ${siteName} (${siteCode}) is now 3 days overdue. Please complete it as soon as possible.`,
      kind: 'OVERDUE_3',
    };
  }
  return null;
}

function reminderHtml(input: {
  siteName: string;
  siteCode: string;
  dueDate: string;
  copy: string;
  countUrl: string;
}) {
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937;">
      <h2 style="margin: 0 0 12px;">Inventory Count Reminder</h2>
      <p style="margin: 0 0 12px;">${input.copy}</p>
      <p style="margin: 0 0 6px;"><strong>Site:</strong> ${input.siteName} (${input.siteCode})</p>
      <p style="margin: 0 0 16px;"><strong>Due date:</strong> ${input.dueDate}</p>
      <p style="margin: 0 0 20px;">
        <a href="${input.countUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 8px; font-weight: 600;">
          Open Count Form
        </a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">If the button does not work, copy this URL: ${input.countUrl}</p>
    </div>
  `;
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
  const dueIn7Key = toDateKey(addDays(today, 7));
  const midnightIso = `${toDateKey(today)}T00:00:00.000Z`;

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

  const siteIds = sites.map((site) => site.id);
  const tokenBySiteId = new Map<string, string>();
  if (siteIds.length > 0) {
    const { data: tokenRows, error: tokenError } = await supabase
      .from('inventory_counts')
      .select('site_id, public_token, status, created_at')
      .in('site_id', siteIds)
      .is('archived_at', null)
      .in('status', ['DRAFT', 'IN_PROGRESS'])
      .not('public_token', 'is', null)
      .order('created_at', { ascending: false });

    if (!tokenError && tokenRows) {
      for (const row of (tokenRows as Array<{ site_id: string; public_token: string | null }>)) {
        if (!row.public_token) continue;
        if (!tokenBySiteId.has(row.site_id)) {
          tokenBySiteId.set(row.site_id, row.public_token);
        }
      }
    }
  }

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

  const allRecipientUserIds = Array.from(
    new Set(Array.from(membershipByTenant.values()).flat())
  );
  const emailByUserId = new Map<string, string>();
  if (allRecipientUserIds.length > 0) {
    await Promise.all(allRecipientUserIds.map(async (userId) => {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (!error && data.user?.email) {
        emailByUserId.set(userId, data.user.email);
      }
    }));
  }

  const baseUrl = appBaseUrl();
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL ?? 'notifications@gleamops.com';
  const sendgridFromName = process.env.SENDGRID_FROM_NAME ?? 'GleamOps';
  if (sendgridApiKey) {
    sgMail.setApiKey(sendgridApiKey);
  }

  let remindersQueued = 0;
  let siteAlertsUpdated = 0;
  let emailCandidates = 0;
  let emailsSent = 0;
  let emailFailures = 0;

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

    const copy = reminderCopy(site.name, site.site_code, site.next_count_due, diffDays);
    if (!copy) continue;

    const countToken = tokenBySiteId.get(site.id);
    const countUrl = countToken
      ? `${baseUrl}/count/${encodeURIComponent(countToken)}`
      : `${baseUrl}/inventory?tab=counts&action=create-count&site=${encodeURIComponent(site.site_code)}`;
    const link = countToken
      ? `/count/${encodeURIComponent(countToken)}`
      : `/inventory?tab=counts&action=create-count&site=${encodeURIComponent(site.site_code)}`;

    const users = membershipByTenant.get(site.tenant_id) ?? [];
    if (users.length === 0) continue;

    const title = copy.title;
    const body = `${copy.body} Count URL: ${countUrl}`;

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

    const recipientEmails = Array.from(
      new Set(users.map((userId) => emailByUserId.get(userId)).filter(Boolean))
    ) as string[];

    if (recipientEmails.length === 0) continue;
    emailCandidates += recipientEmails.length;

    if (!sendgridApiKey) continue;

    const html = reminderHtml({
      siteName: site.name,
      siteCode: site.site_code,
      dueDate: site.next_count_due,
      copy: copy.body,
      countUrl,
    });

    await Promise.all(recipientEmails.map(async (email) => {
      try {
        await sgMail.send({
          to: email,
          from: {
            email: sendgridFromEmail,
            name: sendgridFromName,
          },
          subject: title,
          html,
        }, false);
        emailsSent += 1;
      } catch {
        emailFailures += 1;
      }
    }));
  }

  return NextResponse.json({
    ok: true,
    scannedSites: sites.length,
    siteAlertsUpdated,
    remindersQueued,
    emailCandidates,
    emailsSent,
    emailFailures,
  });
}
