'use client';

import type { Subcontractor } from '@gleamops/shared';
import { SUBCONTRACTOR_STATUS_COLORS } from '@gleamops/shared';
import type { StatusColor } from '@gleamops/shared';
import { SlideOver, Badge } from '@gleamops/ui';
import { Pencil } from 'lucide-react';

interface Props {
  subcontractor: Subcontractor | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (sub: Subcontractor) => void;
}

export function SubcontractorDetail({ subcontractor, open, onClose, onEdit }: Props) {
  if (!subcontractor) return null;

  return (
    <SlideOver open={open} onClose={onClose} title={subcontractor.company_name}>
      <div className="space-y-6">
        {/* Header with edit */}
        <div className="flex items-center justify-between">
          <Badge color={(SUBCONTRACTOR_STATUS_COLORS[subcontractor.status] as StatusColor) ?? 'gray'}>
            {subcontractor.status}
          </Badge>
          {onEdit && (
            <button
              onClick={() => onEdit(subcontractor)}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Code</span>
            <p className="font-mono mt-0.5">{subcontractor.subcontractor_code}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Contact</span>
            <p className="mt-0.5">{subcontractor.contact_name ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Email</span>
            <p className="mt-0.5">{subcontractor.email ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Phone</span>
            <p className="mt-0.5">{subcontractor.phone ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Services</span>
            <p className="mt-0.5">{subcontractor.services_provided ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">License #</span>
            <p className="mt-0.5">{subcontractor.license_number ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Insurance Expiry</span>
            <p className="mt-0.5">{subcontractor.insurance_expiry ?? '—'}</p>
          </div>
        </div>

        {/* Notes */}
        {subcontractor.notes && (
          <div>
            <span className="text-sm text-muted-foreground">Notes</span>
            <p className="text-sm mt-1 whitespace-pre-wrap">{subcontractor.notes}</p>
          </div>
        )}
      </div>
    </SlideOver>
  );
}
