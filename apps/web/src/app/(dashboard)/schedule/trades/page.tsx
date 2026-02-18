import { redirect } from 'next/navigation';

export default function ScheduleTradesPage() {
  redirect('/schedule?tab=planning&view=trades');
}
