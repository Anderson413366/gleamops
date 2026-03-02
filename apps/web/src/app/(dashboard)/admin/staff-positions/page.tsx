'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { getStaffPositions, type StaffPosition } from '@/lib/get-staff-positions';
import { PositionBadge } from '@/components/staff/position-badge';
import { Badge, Skeleton } from '@gleamops/ui';
import { toast } from 'sonner';

interface StaffRow {
  id: string;
  full_name: string;
  display_name: string | null;
  staff_code: string;
  role: string;
  staff_status: string | null;
}

export default function StaffPositionAssignmentPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [positions, setPositions] = useState<StaffPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const [{ data: staffData }, posData] = await Promise.all([
      supabase
        .from('staff')
        .select('id, full_name, display_name, staff_code, role, staff_status')
        .is('archived_at', null)
        .order('full_name'),
      getStaffPositions(),
    ]);
    setStaff((staffData ?? []) as StaffRow[]);
    setPositions(posData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateRole = async (staffId: string, positionCode: string) => {
    setSaving((s) => ({ ...s, [staffId]: true }));
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from('staff')
      .update({ role: positionCode })
      .eq('id', staffId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Position updated');
    }
    setSaving((s) => ({ ...s, [staffId]: false }));
    await fetchData();
  };

  const legacyCount = staff.filter((s) => s.role === 'CLEANER').length;
  const positionMap = new Map(positions.map((p) => [p.position_code, p]));

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Admin
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Position Assignment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign staff to positions (POS-001 through POS-014). {legacyCount > 0 && (
              <Badge color="yellow">{legacyCount} staff still using legacy CLEANER role</Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{staff.length} staff members</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Staff Member</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Current Role</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Assign Position</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => {
                const pos = positionMap.get(member.role);
                const isLegacy = member.role === 'CLEANER';
                return (
                  <tr
                    key={member.id}
                    className={`border-b border-border/50 ${isLegacy ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}`}
                  >
                    <td className="p-3 font-medium">{member.display_name ?? member.full_name}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{member.staff_code}</td>
                    <td className="p-3">
                      <Badge color={member.staff_status === 'ACTIVE' ? 'green' : 'gray'}>
                        {member.staff_status ?? 'N/A'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {pos ? (
                        <PositionBadge positionName={pos.position_name} colorHex={pos.color_hex} size="sm" />
                      ) : (
                        <Badge color={isLegacy ? 'yellow' : 'gray'}>{member.role}</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <select
                        value={member.role}
                        disabled={saving[member.id]}
                        onChange={(e) => { void updateRole(member.id, e.target.value); }}
                        className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs disabled:opacity-50"
                      >
                        <option value="CLEANER">-- Legacy: CLEANER --</option>
                        {positions.map((p) => (
                          <option key={p.position_code} value={p.position_code}>
                            {p.position_name} ({p.position_code})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
