import { redirect } from 'next/navigation';

export default function ClientsSitesIndexPage() {
  redirect('/clients?tab=sites');
}
