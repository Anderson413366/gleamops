import { FieldReportDetail } from '../field-report-detail';

export default async function FieldReportDetailPage(
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  return <FieldReportDetail reportCode={code} />;
}

