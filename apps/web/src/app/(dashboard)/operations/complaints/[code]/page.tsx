import { ComplaintDetail } from '../complaint-detail';

export default async function ComplaintDetailPage(
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  return <ComplaintDetail complaintCode={code} />;
}
