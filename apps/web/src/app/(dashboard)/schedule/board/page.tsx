import { redirect } from 'next/navigation';

export default function ScheduleBoardPage() {
  redirect('/schedule?tab=calendar&view=board');
}
