'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SlideOver, Button, Input } from '@gleamops/ui';
import type { SalesProposal } from '@gleamops/shared';

interface SendProposalFormProps {
  proposal: SalesProposal | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendProposalForm({ proposal, open, onClose, onSuccess }: SendProposalFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!proposal) return;
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email address');
      return;
    }

    setLoading(true);
    setError('');
    const supabase = getSupabaseBrowserClient();

    // Create send record
    const { error: sendError } = await supabase
      .from('sales_proposal_sends')
      .insert({
        tenant_id: proposal.tenant_id,
        proposal_id: proposal.id,
        recipient_email: email.trim(),
        recipient_name: name.trim() || null,
        status: 'SENT', // In production: SENDING → worker sends → SENT
        sent_at: new Date().toISOString(),
      });

    if (sendError) {
      setError(sendError.message);
      setLoading(false);
      return;
    }

    // Update proposal status to SENT if it was DRAFT or GENERATED
    if (proposal.status === 'DRAFT' || proposal.status === 'GENERATED') {
      await supabase
        .from('sales_proposals')
        .update({ status: 'SENT' })
        .eq('id', proposal.id);
    }

    setLoading(false);
    setEmail('');
    setName('');
    onSuccess?.();
    onClose();
  };

  const handleClose = () => {
    setEmail('');
    setName('');
    setError('');
    onClose();
  };

  if (!proposal) return null;

  return (
    <SlideOver open={open} onClose={handleClose} title="Send Proposal" subtitle={proposal.proposal_code}>
      <div className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Recipient Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@company.com"
            required
          />
          <Input
            label="Recipient Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading} className="flex-1">
            <Send className="h-4 w-4" />
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </div>

        <p className="text-xs text-muted">
          In production, this will send an email with the proposal PDF attached via SendGrid.
          For now, this records the send in the database.
        </p>
      </div>
    </SlideOver>
  );
}
