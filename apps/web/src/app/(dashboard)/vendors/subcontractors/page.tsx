import { redirect } from 'next/navigation';

export default function VendorsSubcontractorsRedirectPage() {
  redirect('/team?tab=subcontractors');
}
