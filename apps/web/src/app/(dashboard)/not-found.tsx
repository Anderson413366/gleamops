'use client';

import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Button } from '@gleamops/ui';

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <SearchX className="h-16 w-16 text-muted-foreground/50" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link href="/home">
        <Button variant="secondary" size="sm">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Home
        </Button>
      </Link>
    </div>
  );
}
