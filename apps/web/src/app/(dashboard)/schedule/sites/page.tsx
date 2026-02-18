import { redirect } from 'next/navigation';

export default function ScheduleSitesPage() {
  redirect('/schedule?tab=calendar&view=site');
}
