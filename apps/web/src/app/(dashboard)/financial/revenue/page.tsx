import { redirect } from 'next/navigation';

export default function FinancialRevenueRedirect() {
  redirect('/reports?tab=financial');
}
