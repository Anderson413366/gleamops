import { redirect } from 'next/navigation';

export default function FinancialPlannedRedirect() {
  redirect('/money?tab=planned-income');
}

