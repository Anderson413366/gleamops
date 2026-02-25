import { redirect } from 'next/navigation';

export default function TeamStaffIndexPage() {
  redirect('/team?tab=staff');
}
