import type { ProposalLayoutConfig, ProposalLayoutSection } from '../types/database';

/**
 * Human-readable labels for each proposal PDF section.
 */
export const PROPOSAL_SECTION_LABELS: Record<ProposalLayoutSection['id'], string> = {
  header: 'Header Bar',
  companyInfo: 'Company Info',
  metadata: 'Proposal Details',
  scope: 'Scope of Services',
  pricing: 'Pricing Options',
  terms: 'Terms & Conditions',
  signatures: 'Signature Lines',
  attachments: 'Supporting Documents',
};

/**
 * Default layout config for new proposals.
 * All sections enabled except attachments (opt-in).
 */
export const DEFAULT_PROPOSAL_LAYOUT: ProposalLayoutConfig = {
  sections: [
    { id: 'header', enabled: true, order: 0, pageBreakBefore: false },
    { id: 'companyInfo', enabled: true, order: 1, pageBreakBefore: false },
    { id: 'metadata', enabled: true, order: 2, pageBreakBefore: false },
    { id: 'scope', enabled: true, order: 3, pageBreakBefore: false },
    { id: 'pricing', enabled: true, order: 4, pageBreakBefore: false },
    { id: 'terms', enabled: true, order: 5, pageBreakBefore: false },
    { id: 'signatures', enabled: true, order: 6, pageBreakBefore: false },
    { id: 'attachments', enabled: false, order: 7, pageBreakBefore: true },
  ],
  signaturePlacement: 'agreement',
  attachmentMode: 'list_only',
};
