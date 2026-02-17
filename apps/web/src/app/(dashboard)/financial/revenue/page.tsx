import { redirect } from 'next/navigation';

export default function FinancialRevenueRedirect() {
  redirect('/money?tab=revenue');
}

