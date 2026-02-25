'use client';

import PipelineAnalytics from '../analytics/pipeline-analytics';

interface AnalyticsSectionProps {
  refreshToken?: number;
}

export function AnalyticsSection({ refreshToken = 0 }: AnalyticsSectionProps) {
  return (
    <PipelineAnalytics key={`analytics-section-${refreshToken}`} />
  );
}
