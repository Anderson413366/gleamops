import { redirect } from 'next/navigation';

export default function SuppliesKitsBridge() {
  redirect('/supplies?tab=kits');
}
