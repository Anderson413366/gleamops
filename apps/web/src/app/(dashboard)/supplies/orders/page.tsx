import { redirect } from 'next/navigation';

export default function SuppliesOrdersBridge() {
  redirect('/supplies?tab=orders');
}
