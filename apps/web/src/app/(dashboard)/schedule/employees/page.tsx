import { redirect } from 'next/navigation';

export default function ScheduleEmployeesPage() {
  redirect('/schedule?tab=calendar&view=employee');
}
