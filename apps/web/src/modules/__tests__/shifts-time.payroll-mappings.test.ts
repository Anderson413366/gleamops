import assert from 'node:assert/strict';
import test from 'node:test';
import { _resetFlagCache, PAYROLL_SOURCE_FIELDS } from '@gleamops/shared';
import { replacePayrollMappingFieldSet, previewPayrollExportRpc, archivePayrollMappingTemplate, getAllPayrollMappings } from '@/modules/shifts-time';

const API_PATH = '/api/operations/shifts-time/payroll/mappings/[id]/fields';

function setPayrollFlags() {
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1 = '1';
  process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_PAYROLL_EXPORT_V1 = '1';
  _resetFlagCache();
}

function resetPayrollFlags() {
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_V1;
  delete process.env.NEXT_PUBLIC_FF_SHIFTS_TIME_PAYROLL_EXPORT_V1;
  _resetFlagCache();
}

function createMappingFieldsDb(mode: 'ok' | 'insert_error' | 'archive_error') {
  const calls = {
    insertCount: 0,
    archiveUpdateCount: 0,
    archiveNotCount: 0,
  };

  const db = {
    from(table: string) {
      assert.equal(table, 'payroll_export_mapping_fields');
      const chain = {
        insert(rows: Array<Record<string, unknown>>) {
          calls.insertCount += 1;
          return {
            select: async () => {
              if (mode === 'insert_error') {
                return { data: null, error: { message: 'insert failed' } };
              }

              const mapped = rows.map((row, index) => ({
                id: `field-${index + 1}`,
                mapping_id: String(row.mapping_id ?? ''),
                sort_order: Number(row.sort_order ?? index + 1),
                output_column_name: String(row.output_column_name ?? ''),
                source_field: (row.source_field as string | null | undefined) ?? null,
                static_value: (row.static_value as string | null | undefined) ?? null,
                transform_config: (row.transform_config as Record<string, unknown> | null | undefined) ?? null,
                is_required: Boolean(row.is_required),
                is_enabled: row.is_enabled !== false,
              }));
              return { data: mapped, error: null };
            },
          };
        },
        update() {
          calls.archiveUpdateCount += 1;
          return {
            eq() {
              return this;
            },
            is() {
              return this;
            },
            not() {
              calls.archiveNotCount += 1;
              if (mode === 'archive_error') {
                return Promise.resolve({ data: null, error: { message: 'archive failed' } });
              }
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };

      return chain;
    },
  };

  return { db, calls };
}

test('replacePayrollMappingFieldSet does not archive current fields when insert fails', async () => {
  setPayrollFlags();
  try {
    const { db, calls } = createMappingFieldsDb('insert_error');
    const result = await replacePayrollMappingFieldSet(
      db as never,
      {
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['MANAGER'],
      },
      '00000000-0000-0000-0000-000000000001',
      {
        fields: [{
          output_column_name: 'Regular Hours',
          source_field: 'regular_hours',
          is_required: true,
        }],
      },
      API_PATH,
    );

    assert.equal(result.success, false);
    assert.equal(calls.insertCount, 1);
    assert.equal(calls.archiveUpdateCount, 0);
    assert.equal(calls.archiveNotCount, 0);
  } finally {
    resetPayrollFlags();
  }
});

test('replacePayrollMappingFieldSet inserts new generation before archiving prior fields', async () => {
  setPayrollFlags();
  try {
    const { db, calls } = createMappingFieldsDb('ok');
    const result = await replacePayrollMappingFieldSet(
      db as never,
      {
        userId: 'user-1',
        tenantId: 'tenant-1',
        roles: ['MANAGER'],
      },
      '00000000-0000-0000-0000-000000000001',
      {
        fields: [{
          output_column_name: 'Regular Hours',
          source_field: 'regular_hours',
          is_required: true,
        }],
      },
      API_PATH,
    );

    assert.equal(result.success, true);
    if (!result.success) {
      return;
    }

    const payload = result.data as Array<{ output_column_name: string }>;
    assert.equal(payload.length, 1);
    assert.equal(payload[0]?.output_column_name, 'Regular Hours');
    assert.equal(calls.insertCount, 1);
    assert.equal(calls.archiveUpdateCount, 1);
    assert.equal(calls.archiveNotCount, 1);
  } finally {
    resetPayrollFlags();
  }
});

test('replacePayrollMappingFieldSet rejects invalid source_field values', async () => {
  setPayrollFlags();
  try {
    const { db } = createMappingFieldsDb('ok');
    const result = await replacePayrollMappingFieldSet(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['MANAGER'] },
      '00000000-0000-0000-0000-000000000001',
      {
        fields: [{
          output_column_name: 'Bad Field',
          source_field: 'not_a_real_field',
          is_required: true,
        }],
      },
      API_PATH,
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.status, 400);
      assert.ok(result.error.detail?.includes('not_a_real_field'));
    }
  } finally {
    resetPayrollFlags();
  }
});

test('replacePayrollMappingFieldSet accepts valid source_field values', async () => {
  setPayrollFlags();
  try {
    const { db } = createMappingFieldsDb('ok');
    const result = await replacePayrollMappingFieldSet(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['MANAGER'] },
      '00000000-0000-0000-0000-000000000001',
      {
        fields: PAYROLL_SOURCE_FIELDS.slice(0, 3).map((sf, i) => ({
          output_column_name: `Col ${i}`,
          source_field: sf,
          is_required: false,
        })),
      },
      API_PATH,
    );

    assert.equal(result.success, true);
  } finally {
    resetPayrollFlags();
  }
});

test('replacePayrollMappingFieldSet rejects when all fields are disabled', async () => {
  setPayrollFlags();
  try {
    const { db } = createMappingFieldsDb('ok');
    const result = await replacePayrollMappingFieldSet(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['MANAGER'] },
      '00000000-0000-0000-0000-000000000001',
      {
        fields: [{
          output_column_name: 'Hours',
          source_field: 'regular_hours',
          is_required: false,
          is_enabled: false,
        }],
      },
      API_PATH,
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.status, 400);
      assert.ok(result.error.detail?.includes('enabled'));
    }
  } finally {
    resetPayrollFlags();
  }
});

test('previewPayrollExportRpc rejects mapping with zero enabled fields', async () => {
  setPayrollFlags();
  try {
    const db = {
      from(table: string) {
        assert.equal(table, 'payroll_export_mapping_fields');
        const chain = {
          select() { return chain; },
          eq() { return chain; },
          is() { return Promise.resolve({ count: 0, error: null }); },
        };
        return chain;
      },
      rpc: async () => ({ data: null, error: { message: 'should not be called' } }),
    };

    const result = await previewPayrollExportRpc(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['MANAGER'] },
      {
        mapping_id: '00000000-0000-0000-0000-000000000001',
        period_start: '2026-03-01',
        period_end: '2026-03-15',
      },
      '/api/operations/shifts-time/payroll/preview',
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.status, 400);
      assert.ok(result.error.detail?.includes('no enabled fields'));
    }
  } finally {
    resetPayrollFlags();
  }
});

function createArchiveDb(mode: 'ok' | 'parent_error' | 'parent_not_found' | 'child_error') {
  const calls = { parentUpdate: 0, childUpdate: 0 };
  const db = {
    from(table: string) {
      if (table === 'payroll_export_mappings') {
        return {
          update() {
            calls.parentUpdate += 1;
            return {
              eq() { return this; },
              is() { return this; },
              select() {
                return {
                  maybeSingle: async () => {
                    if (mode === 'parent_error') return { data: null, error: { message: 'parent update failed' } };
                    if (mode === 'parent_not_found') return { data: null, error: null };
                    return { data: { id: 'mapping-1', template_name: 'Test' }, error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (table === 'payroll_export_mapping_fields') {
        return {
          update() {
            calls.childUpdate += 1;
            return {
              eq() { return this; },
              is() {
                if (mode === 'child_error') return Promise.resolve({ data: null, error: { message: 'child archive failed' } });
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
  return { db, calls };
}

test('archivePayrollMappingTemplate archives parent and children on success', async () => {
  setPayrollFlags();
  try {
    const { db, calls } = createArchiveDb('ok');
    const result = await archivePayrollMappingTemplate(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['MANAGER'] },
      '00000000-0000-0000-0000-000000000001',
      '/api/operations/shifts-time/payroll/mappings/[id]',
    );

    assert.equal(result.success, true);
    if (result.success) {
      const data = result.data as { archived: boolean };
      assert.equal(data.archived, true);
    }
    assert.equal(calls.parentUpdate, 1);
    assert.equal(calls.childUpdate, 1);
  } finally {
    resetPayrollFlags();
  }
});

test('archivePayrollMappingTemplate returns error when parent archive fails', async () => {
  setPayrollFlags();
  try {
    const { db, calls } = createArchiveDb('parent_error');
    const result = await archivePayrollMappingTemplate(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['MANAGER'] },
      '00000000-0000-0000-0000-000000000001',
      '/api/operations/shifts-time/payroll/mappings/[id]',
    );

    assert.equal(result.success, false);
    assert.equal(calls.parentUpdate, 1);
    assert.equal(calls.childUpdate, 0);
  } finally {
    resetPayrollFlags();
  }
});

test('archivePayrollMappingTemplate returns 404 when mapping not found', async () => {
  setPayrollFlags();
  try {
    const { db } = createArchiveDb('parent_not_found');
    const result = await archivePayrollMappingTemplate(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['MANAGER'] },
      '00000000-0000-0000-0000-000000000001',
      '/api/operations/shifts-time/payroll/mappings/[id]',
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.status, 404);
    }
  } finally {
    resetPayrollFlags();
  }
});

test('archivePayrollMappingTemplate surfaces child archive failure', async () => {
  setPayrollFlags();
  try {
    const { db, calls } = createArchiveDb('child_error');
    const result = await archivePayrollMappingTemplate(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['MANAGER'] },
      '00000000-0000-0000-0000-000000000001',
      '/api/operations/shifts-time/payroll/mappings/[id]',
    );

    assert.equal(result.success, false);
    assert.equal(calls.parentUpdate, 1);
    assert.equal(calls.childUpdate, 1);
  } finally {
    resetPayrollFlags();
  }
});

test('getAllPayrollMappings returns list of mappings including inactive', async () => {
  setPayrollFlags();
  try {
    const db = {
      from(table: string) {
        assert.equal(table, 'payroll_export_mappings');
        const chain = {
          select() { return chain; },
          eq() { return chain; },
          is() { return chain; },
          order() { return chain; },
          limit() {
            return Promise.resolve({
              data: [
                { id: 'm-1', template_name: 'Active', is_active: true },
                { id: 'm-2', template_name: 'Inactive', is_active: false },
              ],
              error: null,
            });
          },
        };
        return chain;
      },
    };

    const result = await getAllPayrollMappings(
      db as never,
      { userId: 'user-1', tenantId: 'tenant-1', roles: ['MANAGER'] },
      '/api/operations/shifts-time/payroll/mappings',
    );

    assert.equal(result.success, true);
    if (result.success) {
      const data = result.data as Array<{ id: string }>;
      assert.equal(data.length, 2);
    }
  } finally {
    resetPayrollFlags();
  }
});
