import { redirect } from 'next/navigation';

export default function FinancialPlannedRedirect() {
  redirect('/reports?tab=financial');
}
