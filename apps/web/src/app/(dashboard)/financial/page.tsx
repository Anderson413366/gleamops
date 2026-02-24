import { redirect } from 'next/navigation';

export default function FinancialLandingRedirect() {
  redirect('/reports?tab=financial');
}
