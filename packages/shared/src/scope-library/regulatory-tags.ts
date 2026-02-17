/**
 * Regulatory tag definitions — 8 industry standards referenced
 * throughout the scope library.
 */
import type { RegulatoryTag } from './types';

export const REGULATORY_TAGS: RegulatoryTag[] = [
  {
    code: 'CDC',
    label: 'CDC',
    description: 'Centers for Disease Control and Prevention — infection control and environmental surface guidelines.',
  },
  {
    code: 'AORN',
    label: 'AORN',
    description: 'Association of periOperative Registered Nurses — sterile processing and surgical suite standards.',
  },
  {
    code: 'ISSA',
    label: 'ISSA',
    description: 'International Sanitary Supply Association — cleaning industry standards and CIMS certification.',
  },
  {
    code: 'FGI',
    label: 'FGI',
    description: 'Facility Guidelines Institute — healthcare facility design and maintenance standards.',
  },
  {
    code: 'OSHA',
    label: 'OSHA',
    description: 'Occupational Safety and Health Administration — worker safety, bloodborne pathogens, HazCom.',
  },
  {
    code: 'EPA',
    label: 'EPA',
    description: 'Environmental Protection Agency — List N disinfectants, chemical safety, and disposal regulations.',
  },
  {
    code: 'JOINT_COMMISSION',
    label: 'Joint Commission',
    description: 'The Joint Commission — hospital accreditation standards including environment of care.',
  },
  {
    code: 'CMS',
    label: 'CMS',
    description: 'Centers for Medicare & Medicaid Services — conditions of participation for healthcare facilities.',
  },
];
