import { PeriodicTaskDetail } from '../periodic-task-detail';

export default async function PeriodicTaskDetailPage(
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  return <PeriodicTaskDetail periodicCode={code} />;
}

