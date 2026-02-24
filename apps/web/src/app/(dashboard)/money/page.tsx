import { redirect } from 'next/navigation';

export default function MoneyPage() {
  redirect('/reports?tab=financial');
}
