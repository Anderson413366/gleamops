import { redirect } from 'next/navigation';

export default function PlanningBoardsPage() {
  redirect('/planning?tab=planning&view=boards');
}
