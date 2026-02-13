'use client';

import { Upload } from 'lucide-react';

export default function ImportPage() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">CSV Import</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Import data from CSV files into GleamOps. Upload clients, sites, staff, supplies, and more.
      </p>
      <p className="text-xs text-muted-foreground mt-4">Coming soon</p>
    </div>
  );
}
