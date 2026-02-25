import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function ScheduleWorkOrdersRoute() {
  redirect('/schedule?tab=work-orders');
}
