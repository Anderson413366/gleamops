import { redirect } from 'next/navigation';

export default function PlanningHandoffPage() {
  redirect('/planning?tab=planning&view=handoff');
}
