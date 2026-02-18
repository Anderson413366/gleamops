import { redirect } from 'next/navigation';

export default function PeopleTimekeepingBridge() {
  redirect('/people?tab=timekeeping');
}
