import { redirect } from 'next/navigation';

export default function CustomersClientsBridge() {
  redirect('/customers?tab=clients');
}
