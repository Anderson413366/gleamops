import Link from 'next/link';
import { PropsWithChildren } from 'react';
import { Card } from '@gleamops/ui';

interface PortalLayoutProps extends PropsWithChildren {
  params: Promise<{ token: string }>;
}

export default async function PortalLayout({ children, params }: PortalLayoutProps) {
  const { token } = await params;
  const base = `/public/portal/${encodeURIComponent(token)}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
      <Card className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={base} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-all duration-200 ease-in-out hover:bg-muted">
            Dashboard
          </Link>
          <Link href={`${base}/inspections`} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-all duration-200 ease-in-out hover:bg-muted">
            Inspections
          </Link>
          <Link href={`${base}/complaints`} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-all duration-200 ease-in-out hover:bg-muted">
            Complaints
          </Link>
          <Link href={`${base}/complaints/new`} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-all duration-200 ease-in-out hover:bg-muted">
            New Complaint
          </Link>
          <Link href={`${base}/feedback/new`} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-all duration-200 ease-in-out hover:bg-muted">
            Send Feedback
          </Link>
        </div>
      </Card>
      {children}
    </div>
  );
}
