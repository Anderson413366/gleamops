import { redirect } from 'next/navigation';

export default function FinancialLandingRedirect() {
  redirect('/money?tab=job-financials');
}

