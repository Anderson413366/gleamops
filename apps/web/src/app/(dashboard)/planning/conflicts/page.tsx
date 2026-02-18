import { redirect } from 'next/navigation';

export default function PlanningConflictsPage() {
  redirect('/planning?tab=planning&view=conflicts');
}
