'use client';

import { Pencil, Building2, MapPin, Mail, Phone, Star } from 'lucide-react';
import {
  SlideOver,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@gleamops/ui';
import type { Contact } from '@gleamops/shared';

interface ContactWithParent extends Contact {
  client?: { name: string; client_code: string } | null;
  site?: { name: string; site_code: string } | null;
}

interface ContactDetailProps {
  contact: ContactWithParent | null;
  open: boolean;
  onClose: () => void;
  onEdit: (contact: Contact) => void;
}

export function ContactDetail({ contact, open, onClose, onEdit }: ContactDetailProps) {
  if (!contact) return null;

  return (
    <SlideOver open={open} onClose={onClose} title={contact.name} subtitle={contact.contact_code}>
      <div className="space-y-6">
        {/* Role + Primary + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {contact.role && <Badge color="blue">{contact.role}</Badge>}
            {contact.is_primary && (
              <Badge color="yellow">
                <Star className="h-3 w-3 mr-0.5 fill-current" />
                Primary
              </Badge>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => onEdit(contact)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${contact.email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${contact.phone}`}
                  className="text-sm text-primary hover:underline"
                >
                  {contact.phone}
                </a>
              </div>
            )}
            {!contact.email && !contact.phone && (
              <p className="text-sm text-muted-foreground">No contact information provided.</p>
            )}
          </CardContent>
        </Card>

        {/* Linked Entities */}
        <Card>
          <CardHeader>
            <CardTitle>Linked To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.client && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">{contact.client.name}</span>
                  <span className="text-muted-foreground ml-1 text-xs font-mono">
                    ({contact.client.client_code})
                  </span>
                </span>
              </div>
            )}
            {contact.site && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-medium">{contact.site.name}</span>
                  <span className="text-muted-foreground ml-1 text-xs font-mono">
                    ({contact.site.site_code})
                  </span>
                </span>
              </div>
            )}
            {!contact.client && !contact.site && (
              <p className="text-sm text-muted-foreground">Not linked to any client or site.</p>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border">
          <p>Created: {new Date(contact.created_at).toLocaleDateString()}</p>
          <p>Updated: {new Date(contact.updated_at).toLocaleDateString()}</p>
        </div>
      </div>
    </SlideOver>
  );
}
