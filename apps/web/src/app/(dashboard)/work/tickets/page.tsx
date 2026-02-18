import { redirect } from 'next/navigation';

export default function WorkTicketsBridge() {
  redirect('/work?tab=tickets');
}
