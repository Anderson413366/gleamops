import { redirect } from 'next/navigation';

export default function VendorsSubcontractorsRedirectPage() {
  redirect('/clients?tab=partners');
}
