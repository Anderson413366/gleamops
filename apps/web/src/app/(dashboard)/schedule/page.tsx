import { Suspense } from 'react';
import SchedulePageClient from './schedule-page';

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <SchedulePageClient />
    </Suspense>
  );
}
