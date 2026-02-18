import { redirect } from 'next/navigation';

export default function CustomersSitesBridge() {
  redirect('/customers?tab=sites');
}
