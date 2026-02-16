'use client';

import { UserRound } from 'lucide-react';
import { Badge } from '@gleamops/ui';
import type { Contact } from '@gleamops/shared';

const CONTACT_TYPE_COLORS: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'gray'> = {
  PRIMARY: 'blue',
  BILLING: 'green',
  OPERATIONS: 'purple',
  EMERGENCY: 'orange',
  OTHER: 'gray',
};

interface ContactWithParent extends Contact {
  client?: { name: string; client_code: string } | null;
  site?: { name: string; site_code: string } | null;
}

interface ContactsCardGridProps {
  rows: ContactWithParent[];
  onSelect: (item: ContactWithParent) => void;
}

export function ContactsCardGrid({ rows, onSelect }: ContactsCardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className="flex cursor-pointer flex-col items-center rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-150 hover:border-module-accent/40 hover:shadow-md"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-module-accent/15 text-module-accent">
            <UserRound className="h-8 w-8" />
          </div>
          <p className="mt-3 line-clamp-2 text-sm font-semibold leading-tight text-foreground">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.contact_code}</p>
          <div className="mt-3">
            {item.contact_type ? (
              <Badge color={CONTACT_TYPE_COLORS[item.contact_type] ?? 'gray'}>
                {item.contact_type}
              </Badge>
            ) : (
              <Badge color="gray">OTHER</Badge>
            )}
          </div>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>Role: {item.role_title ?? item.role ?? 'Not set'}</p>
            <p className="truncate">Client: {item.client?.name ?? item.site?.name ?? 'Not set'}</p>
            <p className="truncate">Phone: {item.mobile_phone ?? item.phone ?? 'Not set'}</p>
            <p className="truncate">Email: {item.email ?? 'Not set'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
