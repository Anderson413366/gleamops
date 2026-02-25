import { redirect } from 'next/navigation';

export default function FinancialJobsRedirect() {
  redirect('/reports?tab=financial');
}
