import { redirect } from 'next/navigation';

export default function WorkJobsBridge() {
  redirect('/work?tab=jobs');
}
