import { describe, it, expect } from 'vitest';
import { canTransitionStatus } from '../status-machine';

describe('canTransitionStatus', () => {
  // ---------------------------------------------------------------------------
  // Bid transitions
  // ---------------------------------------------------------------------------
  describe('bid', () => {
    it('DRAFT → IN_PROGRESS is valid', () => {
      expect(canTransitionStatus('bid', 'DRAFT', 'IN_PROGRESS')).toBe(true);
    });

    it('IN_PROGRESS → READY_FOR_REVIEW is valid', () => {
      expect(canTransitionStatus('bid', 'IN_PROGRESS', 'READY_FOR_REVIEW')).toBe(true);
    });

    it('IN_PROGRESS → DRAFT (back to draft) is valid', () => {
      expect(canTransitionStatus('bid', 'IN_PROGRESS', 'DRAFT')).toBe(true);
    });

    it('READY_FOR_REVIEW → APPROVED is valid', () => {
      expect(canTransitionStatus('bid', 'READY_FOR_REVIEW', 'APPROVED')).toBe(true);
    });

    it('APPROVED → SENT is valid', () => {
      expect(canTransitionStatus('bid', 'APPROVED', 'SENT')).toBe(true);
    });

    it('SENT → WON is valid', () => {
      expect(canTransitionStatus('bid', 'SENT', 'WON')).toBe(true);
    });

    it('SENT → LOST is valid', () => {
      expect(canTransitionStatus('bid', 'SENT', 'LOST')).toBe(true);
    });

    it('WON is terminal (cannot transition)', () => {
      expect(canTransitionStatus('bid', 'WON', 'DRAFT')).toBe(false);
      expect(canTransitionStatus('bid', 'WON', 'IN_PROGRESS')).toBe(false);
    });

    it('LOST is terminal (cannot transition)', () => {
      expect(canTransitionStatus('bid', 'LOST', 'DRAFT')).toBe(false);
    });

    it('DRAFT → SENT (skip steps) is invalid', () => {
      expect(canTransitionStatus('bid', 'DRAFT', 'SENT')).toBe(false);
    });

    it('DRAFT → WON (skip to terminal) is invalid', () => {
      expect(canTransitionStatus('bid', 'DRAFT', 'WON')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Proposal transitions
  // ---------------------------------------------------------------------------
  describe('proposal', () => {
    it('DRAFT → GENERATED is valid', () => {
      expect(canTransitionStatus('proposal', 'DRAFT', 'GENERATED')).toBe(true);
    });

    it('GENERATED → SENT is valid', () => {
      expect(canTransitionStatus('proposal', 'GENERATED', 'SENT')).toBe(true);
    });

    it('SENT → DELIVERED/OPENED/WON/LOST/EXPIRED are all valid', () => {
      expect(canTransitionStatus('proposal', 'SENT', 'DELIVERED')).toBe(true);
      expect(canTransitionStatus('proposal', 'SENT', 'OPENED')).toBe(true);
      expect(canTransitionStatus('proposal', 'SENT', 'WON')).toBe(true);
      expect(canTransitionStatus('proposal', 'SENT', 'LOST')).toBe(true);
      expect(canTransitionStatus('proposal', 'SENT', 'EXPIRED')).toBe(true);
    });

    it('OPENED → WON/LOST/EXPIRED are valid', () => {
      expect(canTransitionStatus('proposal', 'OPENED', 'WON')).toBe(true);
      expect(canTransitionStatus('proposal', 'OPENED', 'LOST')).toBe(true);
      expect(canTransitionStatus('proposal', 'OPENED', 'EXPIRED')).toBe(true);
    });

    it('WON/LOST/EXPIRED are terminal', () => {
      expect(canTransitionStatus('proposal', 'WON', 'DRAFT')).toBe(false);
      expect(canTransitionStatus('proposal', 'LOST', 'DRAFT')).toBe(false);
      expect(canTransitionStatus('proposal', 'EXPIRED', 'DRAFT')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Ticket transitions
  // ---------------------------------------------------------------------------
  describe('ticket', () => {
    it('SCHEDULED → IN_PROGRESS is valid', () => {
      expect(canTransitionStatus('ticket', 'SCHEDULED', 'IN_PROGRESS')).toBe(true);
    });

    it('SCHEDULED → CANCELED is valid', () => {
      expect(canTransitionStatus('ticket', 'SCHEDULED', 'CANCELED')).toBe(true);
    });

    it('IN_PROGRESS → COMPLETED is valid', () => {
      expect(canTransitionStatus('ticket', 'IN_PROGRESS', 'COMPLETED')).toBe(true);
    });

    it('COMPLETED → VERIFIED is valid', () => {
      expect(canTransitionStatus('ticket', 'COMPLETED', 'VERIFIED')).toBe(true);
    });

    it('VERIFIED is terminal', () => {
      expect(canTransitionStatus('ticket', 'VERIFIED', 'SCHEDULED')).toBe(false);
    });

    it('CANCELED is terminal', () => {
      expect(canTransitionStatus('ticket', 'CANCELED', 'SCHEDULED')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Inspection transitions
  // ---------------------------------------------------------------------------
  describe('inspection', () => {
    it('DRAFT → IN_PROGRESS → COMPLETED → SUBMITTED is the full path', () => {
      expect(canTransitionStatus('inspection', 'DRAFT', 'IN_PROGRESS')).toBe(true);
      expect(canTransitionStatus('inspection', 'IN_PROGRESS', 'COMPLETED')).toBe(true);
      expect(canTransitionStatus('inspection', 'COMPLETED', 'SUBMITTED')).toBe(true);
    });

    it('SUBMITTED is terminal', () => {
      expect(canTransitionStatus('inspection', 'SUBMITTED', 'DRAFT')).toBe(false);
    });

    it('skipping steps is invalid', () => {
      expect(canTransitionStatus('inspection', 'DRAFT', 'COMPLETED')).toBe(false);
      expect(canTransitionStatus('inspection', 'DRAFT', 'SUBMITTED')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Timesheet transitions
  // ---------------------------------------------------------------------------
  describe('timesheet', () => {
    it('DRAFT → SUBMITTED is valid', () => {
      expect(canTransitionStatus('timesheet', 'DRAFT', 'SUBMITTED')).toBe(true);
    });

    it('SUBMITTED → APPROVED/REJECTED are valid', () => {
      expect(canTransitionStatus('timesheet', 'SUBMITTED', 'APPROVED')).toBe(true);
      expect(canTransitionStatus('timesheet', 'SUBMITTED', 'REJECTED')).toBe(true);
    });

    it('REJECTED → DRAFT (re-submit path) is valid', () => {
      expect(canTransitionStatus('timesheet', 'REJECTED', 'DRAFT')).toBe(true);
    });

    it('APPROVED is terminal', () => {
      expect(canTransitionStatus('timesheet', 'APPROVED', 'DRAFT')).toBe(false);
      expect(canTransitionStatus('timesheet', 'APPROVED', 'SUBMITTED')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('unknown entity type returns false', () => {
      expect(canTransitionStatus('unknown', 'DRAFT', 'SENT')).toBe(false);
    });

    it('unknown from-status returns false', () => {
      expect(canTransitionStatus('bid', 'NONEXISTENT', 'SENT')).toBe(false);
    });

    it('same status → same status is invalid (no self-loops)', () => {
      expect(canTransitionStatus('bid', 'DRAFT', 'DRAFT')).toBe(false);
    });
  });
});
