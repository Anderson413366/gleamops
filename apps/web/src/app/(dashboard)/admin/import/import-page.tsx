'use client';

import { Upload, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, Button } from '@gleamops/ui';

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">CSV Import</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Import clients, sites, staff, services, and supplies in structured batches with validation checkpoints.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="secondary" disabled>
            <FileSpreadsheet className="h-4 w-4" />
            Download Templates
          </Button>
          <Button disabled>
            <Upload className="h-4 w-4" />
            Upload CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-semibold text-foreground mb-3">Import Readiness Checklist</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Use the latest template version</li>
            <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Include unique codes for each record</li>
            <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Validate required columns before upload</li>
            <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Resolve duplicate rows before final import</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
