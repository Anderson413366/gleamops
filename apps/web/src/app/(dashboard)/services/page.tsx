export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

export default function ServicesLibraryPage() {
  redirect('/catalog?tab=services');
}
