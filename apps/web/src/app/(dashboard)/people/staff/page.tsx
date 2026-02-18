import { redirect } from 'next/navigation';

export default function PeopleStaffBridge() {
  redirect('/people?tab=staff');
}
