import { redirect } from 'next/navigation';

export default function SalesProspectsBridge() {
  redirect('/sales?tab=prospects');
}
