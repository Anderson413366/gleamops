import { Suspense } from 'react';
import BoardDetailClient from './board-detail-client';

export default function BoardDetailPage() {
  return (
    <Suspense fallback={null}>
      <BoardDetailClient />
    </Suspense>
  );
}
