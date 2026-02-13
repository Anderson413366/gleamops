/**
 * Problem Details helper (RFC 9457).
 * All API errors use this shape.
 */
import type { ProblemDetails } from '../types/app';

const BASE_URL = 'https://gleamops.app/errors';

export function createProblemDetails(
  code: string,
  title: string,
  status: number,
  detail: string,
  instance: string,
  errors?: Array<{ field: string; message: string }>
): ProblemDetails {
  return {
    type: `${BASE_URL}/${code}`,
    title,
    status,
    detail,
    instance,
    code,
    ...(errors && errors.length > 0 ? { errors } : {}),
  };
}

// ---------------------------------------------------------------------------
// Error catalog (from docs/07_ERROR_CATALOG.md)
// ---------------------------------------------------------------------------

// Sales / Pipeline
export const PROSPECT_001 = (detail: string, instance: string) =>
  createProblemDetails('PROSPECT_001', 'Invalid prospect data', 400, detail, instance);
export const PROSPECT_002 = (instance: string) =>
  createProblemDetails('PROSPECT_002', 'Prospect not found', 404, 'The requested prospect does not exist', instance);
export const PROSPECT_003 = (instance: string) =>
  createProblemDetails('PROSPECT_003', 'Prospect already converted', 409, 'This prospect has already been converted to an opportunity', instance);

// Bids
export const BID_001 = (instance: string) =>
  createProblemDetails('BID_001', 'No areas defined', 400, 'At least one area must be defined before calculation', instance);
export const BID_002 = (instance: string) =>
  createProblemDetails('BID_002', 'Bid version locked', 409, 'This bid version is a sent snapshot and cannot be modified', instance);
export const BID_003 = (detail: string, instance: string) =>
  createProblemDetails('BID_003', 'Workload calculation failed', 422, detail, instance);
export const BID_004 = (instance: string) =>
  createProblemDetails('BID_004', 'ETag mismatch', 409, 'The resource was modified by another user. Refresh and try again.', instance);

// Proposals
export const PROPOSAL_001 = (instance: string) =>
  createProblemDetails('PROPOSAL_001', 'Proposal incomplete', 400, 'Proposal is missing required fields before sending', instance);
export const PROPOSAL_002 = (instance: string) =>
  createProblemDetails('PROPOSAL_002', 'Proposal send rate limit exceeded', 429, 'Too many sends. Try again later.', instance);
export const PROPOSAL_003 = (detail: string, instance: string) =>
  createProblemDetails('PROPOSAL_003', 'Email provider failed', 502, detail, instance);
export const PROPOSAL_004 = (instance: string) =>
  createProblemDetails('PROPOSAL_004', 'Proposal already sent', 409, 'This proposal has already been sent with this idempotency key', instance);
export const PROPOSAL_005 = (detail: string, instance: string) =>
  createProblemDetails('PROPOSAL_005', 'PDF generation failed', 500, detail, instance);

// Conversion
export const CONVERT_001 = (instance: string) =>
  createProblemDetails('CONVERT_001', 'Bid not won', 409, 'Only WON bids can be converted', instance);
export const CONVERT_002 = (instance: string) =>
  createProblemDetails('CONVERT_002', 'Already converted', 409, 'This bid has already been converted', instance);
export const CONVERT_003 = (detail: string, instance: string) =>
  createProblemDetails('CONVERT_003', 'Conversion failed', 500, detail, instance);

// Follow-ups
export const FOLLOWUP_001 = (instance: string) =>
  createProblemDetails('FOLLOWUP_001', 'Sequence stopped', 409, 'This follow-up sequence has been stopped', instance);
export const FOLLOWUP_002 = (instance: string) =>
  createProblemDetails('FOLLOWUP_002', 'Proposal won/lost', 409, 'Follow-ups stopped because proposal status changed', instance);

// Tickets
export const TICKET_001 = (instance: string) =>
  createProblemDetails('TICKET_001', 'Ticket not found', 404, 'The requested ticket does not exist', instance);
export const TICKET_002 = (instance: string) =>
  createProblemDetails('TICKET_002', 'Ticket already completed', 409, 'This ticket has already been completed', instance);

// Auth
export const AUTH_001 = (instance: string) =>
  createProblemDetails('AUTH_001', 'Unauthorized', 401, 'Authentication required', instance);
export const AUTH_002 = (instance: string) =>
  createProblemDetails('AUTH_002', 'Forbidden', 403, 'You do not have permission for this action', instance);
export const AUTH_003 = (instance: string) =>
  createProblemDetails('AUTH_003', 'Tenant scope mismatch', 403, 'You cannot access resources in another tenant', instance);

// System
export const SYS_001 = (instance: string) =>
  createProblemDetails('SYS_001', 'Rate limit exceeded', 429, 'Too many requests. Try again later.', instance);
export const SYS_002 = (detail: string, instance: string) =>
  createProblemDetails('SYS_002', 'Internal error', 500, detail, instance);

// Additional Proposal codes (disambiguated from PROPOSAL_001)
export const PROPOSAL_006 = (detail: string, instance: string, errors?: Array<{ field: string; message: string }>) =>
  createProblemDetails('PROPOSAL_006', 'Missing required fields', 400, detail, instance, errors);
export const PROPOSAL_007 = (instance: string) =>
  createProblemDetails('PROPOSAL_007', 'Proposal not found', 404, 'The requested proposal does not exist or belongs to another tenant', instance);
