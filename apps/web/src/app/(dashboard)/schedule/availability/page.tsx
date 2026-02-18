import { redirect } from 'next/navigation';

export default function ScheduleAvailabilityPage() {
  redirect('/schedule?tab=planning&view=availability');
}
