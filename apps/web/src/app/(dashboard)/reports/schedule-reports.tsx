'use client';

import { Card, CardContent } from '@gleamops/ui';

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

function ReportSection({ title, reports }: { title: string; reports: ReportCard[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((report) => (
          <Card key={report.name} className="hover:shadow-md hover:border-module-accent/40 cursor-pointer transition-all">
            <CardContent className="py-3">
              <p className="text-sm font-semibold text-foreground">{report.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{report.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ScheduleReports() {
  return (
    <div className="space-y-6">
      <ReportSection title="Schedule" reports={SCHEDULE_REPORTS} />
      <ReportSection title="Tags" reports={TAG_REPORTS} />
      <ReportSection title="Time Sheets" reports={TIMESHEET_REPORTS} />
      <ReportSection title="Employee" reports={EMPLOYEE_REPORTS} />

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
