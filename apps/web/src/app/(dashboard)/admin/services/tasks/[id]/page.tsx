import { redirect } from 'next/navigation';

export default async function AdminTaskDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/services/tasks/${id}`);
}
