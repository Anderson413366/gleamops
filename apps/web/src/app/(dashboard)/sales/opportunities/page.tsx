import { redirect } from 'next/navigation';

export default function SalesOpportunitiesBridge() {
  redirect('/sales?tab=opportunities');
}
