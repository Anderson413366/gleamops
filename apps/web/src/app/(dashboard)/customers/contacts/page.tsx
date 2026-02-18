import { redirect } from 'next/navigation';

export default function CustomersContactsBridge() {
  redirect('/customers?tab=contacts');
}
