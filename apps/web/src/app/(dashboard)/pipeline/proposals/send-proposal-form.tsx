'use client';

import { useState, useEffect } from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SlideOver, Button, Input, Badge } from '@gleamops/ui';
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
  const [rateLimited, setRateLimited] = useState(false);
  const [enableFollowups, setEnableFollowups] = useState(true);
  const [recentSends, setRecentSends] = useState<{id:string; recipient_email:string; status:string; sent_at:string|null}[]>([]);

  // Fetch recent sends for this proposal
  useEffect(() => {
    if (!proposal || !open) return;
    const supabase = getSupabaseBrowserClient();
    supabase
      .from('sales_proposal_sends')
      .select('id, recipient_email, status, sent_at')
      .eq('proposal_id', proposal.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setRecentSends(data as typeof recentSends);
      });
  }, [proposal, open]);

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
    setRateLimited(false);

    try {
      // Get the current session token for auth
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Not authenticated. Please sign in again.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/proposals/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          proposalId: proposal.id,
          recipientEmail: email.trim(),
          recipientName: name.trim() || null,
          enable_followups: enableFollowups,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setRateLimited(true);
          setError(data.detail || 'Rate limit exceeded. Please try again later.');
        } else {
          setError(data.detail || data.error || 'Failed to send proposal.');
        }
        setLoading(false);
        return;
      }

      setLoading(false);
      setEmail('');
      setName('');
      onSuccess?.();
      onClose();
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setName('');
    setError('');
    setRateLimited(false);
    onClose();
  };

  if (!proposal) return null;

  return (
    <SlideOver open={open} onClose={handleClose} title="Send Proposal" subtitle={proposal.proposal_code}>
      <div className="space-y-6">
        {recentSends.length > 0 && (
          <div className="space-y-2 pb-4 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Sends</p>
            {recentSends.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{s.recipient_email}</span>
                <Badge color={s.status === 'OPENED' ? 'yellow' : s.status === 'BOUNCED' ? 'red' : 'blue'}>
                  {s.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

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

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="enable-followups"
              checked={enableFollowups}
              onChange={(e) => setEnableFollowups(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="enable-followups" className="text-sm">
              Enable automatic follow-up sequence (5 emails over 14 days)
            </label>
          </div>
        </div>

        {error && (
          <div className={`flex items-start gap-2 p-3 rounded-lg border ${
            rateLimited
              ? 'bg-warning/10 border-warning/20 text-warning'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading} className="flex-1">
            <Send className="h-4 w-4" />
            {loading ? 'Sending...' : 'Send Proposal'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Email is queued for delivery via SendGrid with tracking for delivery, opens, and bounces.
          Rate limits: 10 sends/hour, 3 per recipient/day.
        </p>
      </div>
    </SlideOver>
  );
}
