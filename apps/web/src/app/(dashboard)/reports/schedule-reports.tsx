'use client';

import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, Badge, Button, ExportButton, Table, TableHeader, TableHead, TableBody, TableRow, TableCell, EmptyState } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface ReportCard {
  name: string;
  description: string;
  category: string;
}

const SCHEDULE_REPORTS: ReportCard[] = [
  { name: 'Schedule Summary', description: 'Overview of all scheduled shifts by location and position', category: 'Schedule' },
  { name: 'Position Summary', description: 'Breakdown of shifts by position type across all locations', category: 'Schedule' },
  { name: 'Position Summary Cost', description: 'Position summary with associated labor costs', category: 'Schedule' },
  { name: 'Hours Scheduled', description: 'Total hours scheduled per employee and location', category: 'Schedule' },
  { name: 'Budget', description: 'Budget vs actual labor costs for scheduled shifts', category: 'Schedule' },
  { name: 'Daily Peak Hours', description: 'Identify daily peak staffing requirements', category: 'Schedule' },
  { name: 'Shifts Scheduled', description: 'List of all scheduled shifts with details', category: 'Schedule' },
  { name: 'Shifts Confirmed', description: 'Confirmed/acknowledged shifts by staff', category: 'Schedule' },
  { name: 'Crib Sheet', description: 'Quick reference sheet of daily assignments', category: 'Schedule' },
  { name: 'Shift Exchanges', description: 'History of shift trades and swaps', category: 'Schedule' },
  { name: 'Open Shifts', description: 'Unassigned shifts requiring coverage', category: 'Schedule' },
  { name: 'Tasks', description: 'Tasks assigned to shifts and their completion status', category: 'Schedule' },
  { name: 'Conflicts Report', description: 'Schedule conflicts and overlap analysis', category: 'Schedule' },
];

const TAG_REPORTS: ReportCard[] = [
  { name: 'Daily Tag Summary', description: 'Summary of shifts grouped by tags per day', category: 'Tags' },
];

const TIMESHEET_REPORTS: ReportCard[] = [
  { name: 'Time Sheets', description: 'Detailed timesheet data for all employees', category: 'Time Sheets' },
  { name: 'Time Sheets Summary', description: 'Aggregated timesheet hours by period', category: 'Time Sheets' },
  { name: 'Time Sheet Attendance', description: 'Attendance records from timesheet data', category: 'Time Sheets' },
  { name: 'Time Sheet Late Summary', description: 'Late arrivals and early departures summary', category: 'Time Sheets' },
];

const EMPLOYEE_REPORTS: ReportCard[] = [
  { name: 'Attendance', description: 'Employee attendance records and patterns', category: 'Employee' },
  { name: 'Anniversary', description: 'Work anniversary dates for all employees', category: 'Employee' },
  { name: 'Vacations', description: 'Vacation usage and remaining balances', category: 'Employee' },
  { name: 'Vacation Summary', description: 'Summary of vacation hours taken vs entitled', category: 'Employee' },
  { name: 'Availability', description: 'Staff availability schedules', category: 'Employee' },
  { name: 'Unavailability', description: 'Staff unavailability periods', category: 'Employee' },
  { name: 'Hourly Availability', description: 'Hour-by-hour availability across all staff', category: 'Employee' },
  { name: 'Skills Expiration', description: 'Expiring certifications and skills', category: 'Employee' },
];

/* --- Data source mapping: which Supabase table + columns to query for each report --- */
const REPORT_DATA_SOURCES: Record<string, { table: string; select: string; orderBy: string; columns: { key: string; label: string }[] }> = {
  'Schedule Summary': { table: 'work_tickets', select: 'ticket_code, scheduled_date, status, start_time, end_time', orderBy: 'scheduled_date', columns: [{ key: 'ticket_code', label: 'Ticket' }, { key: 'scheduled_date', label: 'Date' }, { key: 'status', label: 'Status' }, { key: 'start_time', label: 'Start' }, { key: 'end_time', label: 'End' }] },
  'Shifts Scheduled': { table: 'work_tickets', select: 'ticket_code, scheduled_date, status, start_time, end_time', orderBy: 'scheduled_date', columns: [{ key: 'ticket_code', label: 'Ticket' }, { key: 'scheduled_date', label: 'Date' }, { key: 'status', label: 'Status' }, { key: 'start_time', label: 'Start' }, { key: 'end_time', label: 'End' }] },
  'Time Sheets': { table: 'timesheets', select: 'staff_id, week_start, week_end, total_hours, regular_hours, overtime_hours, status', orderBy: 'week_start', columns: [{ key: 'week_start', label: 'Week Start' }, { key: 'week_end', label: 'Week End' }, { key: 'total_hours', label: 'Total Hours' }, { key: 'regular_hours', label: 'Regular' }, { key: 'overtime_hours', label: 'Overtime' }, { key: 'status', label: 'Status' }] },
  'Time Sheets Summary': { table: 'timesheets', select: 'staff_id, week_start, total_hours, status', orderBy: 'week_start', columns: [{ key: 'week_start', label: 'Week Start' }, { key: 'total_hours', label: 'Total Hours' }, { key: 'status', label: 'Status' }] },
  'Attendance': { table: 'time_entries', select: 'staff_id, clock_in, clock_out, duration_minutes, status', orderBy: 'clock_in', columns: [{ key: 'staff_id', label: 'Staff' }, { key: 'clock_in', label: 'Clock In' }, { key: 'clock_out', label: 'Clock Out' }, { key: 'duration_minutes', label: 'Duration (min)' }, { key: 'status', label: 'Status' }] },
  'Availability': { table: 'staff_availability_rules', select: 'staff_id, rule_type, availability_type, weekday, start_time, end_time', orderBy: 'created_at', columns: [{ key: 'staff_id', label: 'Staff' }, { key: 'rule_type', label: 'Type' }, { key: 'availability_type', label: 'Availability' }, { key: 'weekday', label: 'Day' }, { key: 'start_time', label: 'Start' }, { key: 'end_time', label: 'End' }] },
  'Skills Expiration': { table: 'staff_certifications', select: 'staff_id, certification_name, issuing_authority, expiry_date, status', orderBy: 'expiry_date', columns: [{ key: 'certification_name', label: 'Certification' }, { key: 'issuing_authority', label: 'Authority' }, { key: 'expiry_date', label: 'Expires' }, { key: 'status', label: 'Status' }] },
};

/* --- Report Detail View --- */
function ReportDetailView({ report, onBack }: { report: ReportCard; onBack: () => void }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const source = REPORT_DATA_SOURCES[report.name];

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (!source) {
      setRows([]);
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from(source.table)
      .select(source.select)
      .is('archived_at', null)
      .order(source.orderBy, { ascending: false })
      .limit(100);

    if (error) {
      toast.error(`Failed to load ${report.name}: ${error.message}`);
    }
    setRows((data ?? []) as unknown as Record<string, unknown>[]);
    setLoading(false);
  }, [report.name, source]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = source?.columns ?? [{ key: 'id', label: 'ID' }];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </Button>
          <div>
            <h3 className="text-base font-semibold text-foreground">{report.name}</h3>
            <p className="text-xs text-muted-foreground">{report.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="blue">{report.category}</Badge>
          <Badge color="gray">{rows.length} rows</Badge>
          {rows.length > 0 && (
            <ExportButton
              data={rows}
              filename={report.name.toLowerCase().replace(/\s+/g, '-')}
              columns={columns}
              onExported={(count, file) => toast.success(`Exported ${count} records to ${file}`)}
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading report data...</p>
        </div>
      ) : rows.length === 0 ? (
        <div>
          <Table>
            <TableHeader>
              <tr>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody />
          </Table>
          <div className="mt-4">
            <EmptyState
              icon={<FileText className="h-10 w-10" />}
              title={`No ${report.name.toLowerCase()} data`}
              description={source ? 'Data will appear here as records are created in the system.' : 'This report will be connected to live data in a future update.'}
            />
          </div>
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <tr>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className="text-sm">
                      {row[col.key] != null ? String(row[col.key]) : '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* --- Report Card Grid --- */
function ReportSection({ title, reports, onSelect }: { title: string; reports: ReportCard[]; onSelect: (report: ReportCard) => void }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((report) => (
          <Card
            key={report.name}
            className="hover:shadow-md hover:border-module-accent/40 cursor-pointer transition-all"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(report)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(report); } }}
          >
            <CardContent className="py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{report.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
                </div>
                {REPORT_DATA_SOURCES[report.name] && (
                  <Badge color="green" className="shrink-0">Live</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* --- Main Component --- */
export default function ScheduleReports() {
  const [selectedReport, setSelectedReport] = useState<ReportCard | null>(null);

  if (selectedReport) {
    return <ReportDetailView report={selectedReport} onBack={() => setSelectedReport(null)} />;
  }

  return (
    <div className="space-y-6">
      <ReportSection title="Schedule" reports={SCHEDULE_REPORTS} onSelect={setSelectedReport} />
      <ReportSection title="Tags" reports={TAG_REPORTS} onSelect={setSelectedReport} />
      <ReportSection title="Time Sheets" reports={TIMESHEET_REPORTS} onSelect={setSelectedReport} />
      <ReportSection title="Employee" reports={EMPLOYEE_REPORTS} onSelect={setSelectedReport} />

      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <button type="button" className="text-sm text-module-accent hover:underline font-medium">
          Custom Reports
        </button>
        <span className="text-muted-foreground text-sm">|</span>
        <button type="button" className="text-sm text-muted-foreground hover:text-foreground">
          Request a Report
        </button>
      </div>
    </div>
  );
}
