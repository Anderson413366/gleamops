import { redirect } from 'next/navigation';

export default function FinancialIntelligencePage() {
  redirect('/reports?tab=financial');
}
