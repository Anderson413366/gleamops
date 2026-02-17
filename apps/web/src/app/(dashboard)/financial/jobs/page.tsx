import { redirect } from 'next/navigation';

export default function FinancialJobsRedirect() {
  redirect('/money?tab=job-financials');
}

