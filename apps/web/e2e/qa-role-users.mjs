#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_TENANT_ID = 'a0000000-0000-0000-0000-000000000001';
const DEFAULT_ROLES = ['OWNER_ADMIN', 'MANAGER'];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = rest.join('=').trim();
  }
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeRoleList(input) {
  if (!input) return [...DEFAULT_ROLES];
  return String(input)
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}

function roleToEmail(role, prefix, domain) {
  const roleSlug = String(role)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${roleSlug}@${domain}`;
}

async function listUsersByEmail(admin) {
  const usersByEmail = new Map();
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const user of users) {
      const email = (user.email || '').toLowerCase();
      if (email) usersByEmail.set(email, user);
    }
    if (users.length < 200) break;
    page += 1;
  }
  return usersByEmail;
}

async function ensureRoleUsers({
  admin,
  tenantId,
  roles,
  emailPrefix,
  emailDomain,
  password,
}) {
  if (!password) {
    throw new Error('Missing password. Provide --password or QA_AUTOMATION_PASSWORD.');
  }

  const usersByEmail = await listUsersByEmail(admin);
  const results = [];

  for (const role of roles) {
    const email = roleToEmail(role, emailPrefix, emailDomain);
    let user = usersByEmail.get(email.toLowerCase());
    const appMetadataPatch = {
      tenant_id: tenantId,
      role,
      role_code: role,
    };

    if (user) {
      const { data, error } = await admin.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
        app_metadata: {
          ...(user.app_metadata || {}),
          ...appMetadataPatch,
        },
      });
      if (error) throw error;
      user = data.user;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: appMetadataPatch,
        user_metadata: {
          qa_role: role,
          qa_bucket: 'phase2-regression',
        },
      });
      if (error) throw error;
      user = data.user;
    }

    if (!user?.id) {
      throw new Error(`Failed to resolve user id for ${email}`);
    }

    const membershipPayload = {
      tenant_id: tenantId,
      user_id: user.id,
      role_code: role,
      archived_at: null,
      archived_by: null,
      archive_reason: null,
    };

    const { error: membershipError } = await admin
      .from('tenant_memberships')
      .upsert(membershipPayload, { onConflict: 'tenant_id,user_id' });
    if (membershipError) throw membershipError;

    results.push({
      role,
      email,
      userId: user.id,
      ensuredAt: nowIso(),
    });
  }

  return {
    action: 'ensure',
    tenantId,
    users: results.map((item) => ({
      role: item.role,
      email: item.email,
      password,
      userId: item.userId,
    })),
    ensuredAt: nowIso(),
  };
}

async function cleanupRoleUsers({
  admin,
  tenantId,
  roles,
  emailPrefix,
  emailDomain,
}) {
  const usersByEmail = await listUsersByEmail(admin);
  const archiveAt = nowIso();
  const results = [];

  for (const role of roles) {
    const email = roleToEmail(role, emailPrefix, emailDomain);
    const user = usersByEmail.get(email.toLowerCase());

    if (!user?.id) {
      results.push({
        role,
        email,
        deleted: false,
        reason: 'user-not-found',
      });
      continue;
    }

    const { error: membershipError } = await admin
      .from('tenant_memberships')
      .update({ archived_at: archiveAt, archive_reason: 'QA cleanup', archived_by: null })
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id);
    if (membershipError) throw membershipError;

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    results.push({
      role,
      email,
      userId: user.id,
      deleted: true,
      archivedAt: archiveAt,
    });
  }

  return {
    action: 'cleanup',
    tenantId,
    cleanedAt: nowIso(),
    results,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadLocalEnv();

  const action = String(args.action || 'ensure').toLowerCase();
  const roles = normalizeRoleList(args.roles);
  const tenantId = String(args['tenant-id'] || process.env.QA_TENANT_ID || DEFAULT_TENANT_ID);
  const emailPrefix = String(args['email-prefix'] || process.env.QA_EMAIL_PREFIX || 'test-phase2');
  const emailDomain = String(args['email-domain'] || process.env.QA_EMAIL_DOMAIN || 'gleamops.test');
  const password = args.password || process.env.QA_AUTOMATION_PASSWORD || '';
  const outFile = args.out ? path.resolve(process.cwd(), args.out) : '';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let result;
  if (action === 'ensure') {
    result = await ensureRoleUsers({
      admin,
      tenantId,
      roles,
      emailPrefix,
      emailDomain,
      password,
    });
  } else if (action === 'cleanup') {
    result = await cleanupRoleUsers({
      admin,
      tenantId,
      roles,
      emailPrefix,
      emailDomain,
    });
  } else {
    throw new Error(`Unsupported action: ${action}. Use --action ensure|cleanup`);
  }

  const serialized = JSON.stringify(result, null, 2);
  if (outFile) {
    fs.writeFileSync(outFile, serialized);
    console.log(outFile);
  } else {
    console.log(serialized);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
