import { redirect } from 'next/navigation';

export default function VendorsSubcontractorsRedirectPage() {
  redirect('/vendors?tab=subcontractors');
}
