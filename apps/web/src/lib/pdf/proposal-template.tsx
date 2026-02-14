import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { ProposalLayoutConfig, ProposalLayoutSection } from '@gleamops/shared';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ProposalPDFProps {
  proposalCode: string;
  clientName: string;
  siteName?: string;
  date: string;
  validUntil?: string;
  description?: string;
  pricingOptions: Array<{
    label: string;
    monthlyPrice: number;
    isRecommended: boolean;
    description?: string;
  }>;
  terms?: string;
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  // V2 additions
  layoutConfig?: ProposalLayoutConfig;
  signatures?: Array<{
    signerName: string;
    signatureImageUrl?: string;
    signedAt: string;
  }>;
  attachmentNames?: string[];
}

// ---------------------------------------------------------------------------
// Brand colors
// ---------------------------------------------------------------------------
const EMERALD = '#059669';
const EMERALD_LIGHT = '#d1fae5';
const DARK = '#111827';
const GRAY = '#6b7280';
const LIGHT_GRAY = '#f3f4f6';
const WHITE = '#ffffff';
const BORDER = '#e5e7eb';

// ---------------------------------------------------------------------------
// Register default Helvetica (built-in; no external font files needed)
// ---------------------------------------------------------------------------
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
    { src: 'Helvetica-Oblique', fontStyle: 'italic' },
  ],
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: DARK,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
    backgroundColor: WHITE,
  },

  // Header bar
  headerBar: {
    backgroundColor: EMERALD,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: -40,
    marginHorizontal: -50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerCompanyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: WHITE,
    letterSpacing: 0.5,
  },
  headerLabel: {
    fontSize: 12,
    color: WHITE,
    opacity: 0.85,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Company info below header
  companyInfo: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 24,
    gap: 16,
  },
  companyInfoItem: {
    fontSize: 9,
    color: GRAY,
  },

  // Proposal metadata section
  metaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: DARK,
  },

  // Scope / description
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: EMERALD,
    marginBottom: 8,
    marginTop: 16,
  },
  descriptionText: {
    fontSize: 10,
    color: DARK,
    lineHeight: 1.6,
    marginBottom: 16,
  },

  // Pricing table
  pricingContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  pricingRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  pricingHeaderRow: {
    flexDirection: 'row',
    backgroundColor: EMERALD,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  pricingHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: WHITE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pricingRecommendedRow: {
    backgroundColor: EMERALD_LIGHT,
  },
  pricingLabel: {
    flex: 2,
    fontSize: 11,
    fontWeight: 'bold',
    color: DARK,
  },
  pricingDescription: {
    flex: 3,
    fontSize: 9,
    color: GRAY,
    paddingRight: 8,
  },
  pricingAmount: {
    flex: 1.5,
    fontSize: 12,
    fontWeight: 'bold',
    color: DARK,
    textAlign: 'right',
  },
  recommendedBadge: {
    backgroundColor: EMERALD,
    color: WHITE,
    fontSize: 7,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  pricingLabelContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Terms section
  termsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  termsText: {
    fontSize: 9,
    color: GRAY,
    lineHeight: 1.5,
  },

  // Signature section
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 40,
  },
  signatureBlock: {
    flex: 1,
  },
  signatureLabel: {
    fontSize: 9,
    color: GRAY,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: DARK,
    marginBottom: 4,
    paddingBottom: 24,
  },
  signatureHelper: {
    fontSize: 8,
    color: GRAY,
  },
  signatureImage: {
    height: 50,
    marginBottom: 4,
    objectFit: 'contain' as const,
  },
  signatureNameText: {
    fontSize: 9,
    color: DARK,
    marginTop: 2,
  },
  signatureDateText: {
    fontSize: 8,
    color: GRAY,
    marginTop: 1,
  },

  // Attachments section
  attachmentItem: {
    fontSize: 9,
    color: DARK,
    marginBottom: 4,
    paddingLeft: 8,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: GRAY,
  },
});

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------
function HeaderSection({ companyName }: { companyName: string }) {
  return (
    <View style={styles.headerBar}>
      <Text style={styles.headerCompanyName}>{companyName}</Text>
      <Text style={styles.headerLabel}>Service Proposal</Text>
    </View>
  );
}

function CompanyInfoSection({ companyPhone, companyEmail }: { companyPhone?: string; companyEmail?: string }) {
  if (!companyPhone && !companyEmail) return null;
  return (
    <View style={styles.companyInfo}>
      {companyPhone && <Text style={styles.companyInfoItem}>{companyPhone}</Text>}
      {companyEmail && <Text style={styles.companyInfoItem}>{companyEmail}</Text>}
    </View>
  );
}

function MetadataSection({ proposalCode, clientName, siteName, date, validUntil }: {
  proposalCode: string; clientName: string; siteName?: string; date: string; validUntil?: string;
}) {
  return (
    <View style={styles.metaSection}>
      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Proposal</Text>
        <Text style={styles.metaValue}>{proposalCode}</Text>
      </View>
      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Prepared For</Text>
        <Text style={styles.metaValue}>{clientName}</Text>
        {siteName && (
          <Text style={{ fontSize: 9, color: GRAY, marginTop: 2 }}>{siteName}</Text>
        )}
      </View>
      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Date</Text>
        <Text style={styles.metaValue}>{date}</Text>
      </View>
      {validUntil && (
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Valid Until</Text>
          <Text style={styles.metaValue}>{validUntil}</Text>
        </View>
      )}
    </View>
  );
}

function ScopeSection({ description }: { description?: string }) {
  if (!description) return null;
  return (
    <View>
      <Text style={styles.sectionTitle}>Scope of Services</Text>
      <Text style={styles.descriptionText}>{description}</Text>
    </View>
  );
}

function PricingSection({ pricingOptions }: { pricingOptions: ProposalPDFProps['pricingOptions'] }) {
  const sortedOptions = [...pricingOptions].sort((a, b) => a.monthlyPrice - b.monthlyPrice);
  return (
    <View>
      <Text style={styles.sectionTitle}>Pricing Options</Text>
      <View style={styles.pricingContainer}>
        <View style={styles.pricingHeaderRow}>
          <Text style={[styles.pricingHeaderText, { flex: 2 }]}>Option</Text>
          <Text style={[styles.pricingHeaderText, { flex: 3 }]}>Description</Text>
          <Text style={[styles.pricingHeaderText, { flex: 1.5, textAlign: 'right' }]}>Monthly Price</Text>
        </View>
        {sortedOptions.map((option, index) => (
          <View
            key={index}
            style={[
              styles.pricingRow,
              ...(option.isRecommended ? [styles.pricingRecommendedRow] : []),
            ]}
          >
            <View style={styles.pricingLabelContainer}>
              <Text style={styles.pricingLabel}>{option.label}</Text>
              {option.isRecommended && <Text style={styles.recommendedBadge}>Recommended</Text>}
            </View>
            <Text style={styles.pricingDescription}>{option.description || '\u2014'}</Text>
            <Text style={styles.pricingAmount}>{formatCurrency(option.monthlyPrice)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TermsSection({ terms }: { terms?: string }) {
  if (!terms) return null;
  return (
    <View style={styles.termsSection}>
      <Text style={styles.sectionTitle}>Terms & Conditions</Text>
      <Text style={styles.termsText}>{terms}</Text>
    </View>
  );
}

function SignatureSection({ companyName, signatures }: {
  companyName: string;
  signatures?: ProposalPDFProps['signatures'];
}) {
  // If we have actual signatures, render them
  if (signatures && signatures.length > 0) {
    return (
      <View style={styles.signatureSection}>
        {signatures.map((sig, i) => (
          <View key={i} style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Signed by</Text>
            {sig.signatureImageUrl ? (
              <Image src={sig.signatureImageUrl} style={styles.signatureImage} />
            ) : (
              <View style={styles.signatureLine} />
            )}
            <Text style={styles.signatureNameText}>{sig.signerName}</Text>
            <Text style={styles.signatureDateText}>
              {new Date(sig.signedAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </Text>
          </View>
        ))}
        {/* Company signature block */}
        <View style={styles.signatureBlock}>
          <Text style={styles.signatureLabel}>{companyName}</Text>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureHelper}>Authorized Representative / Date</Text>
        </View>
      </View>
    );
  }

  // Default: empty signature lines
  return (
    <View style={styles.signatureSection}>
      <View style={styles.signatureBlock}>
        <Text style={styles.signatureLabel}>Client Signature</Text>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureHelper}>Name / Title / Date</Text>
      </View>
      <View style={styles.signatureBlock}>
        <Text style={styles.signatureLabel}>{companyName}</Text>
        <View style={styles.signatureLine} />
        <Text style={styles.signatureHelper}>Authorized Representative / Date</Text>
      </View>
    </View>
  );
}

function AttachmentsSection({ attachmentNames }: { attachmentNames?: string[] }) {
  if (!attachmentNames || attachmentNames.length === 0) return null;
  return (
    <View>
      <Text style={styles.sectionTitle}>Supporting Documents</Text>
      {attachmentNames.map((name, i) => (
        <Text key={i} style={styles.attachmentItem}>
          {i + 1}. {name}
        </Text>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ProposalPDF(props: ProposalPDFProps) {
  const {
    proposalCode,
    clientName,
    siteName,
    date,
    validUntil,
    description,
    pricingOptions,
    terms,
    companyName = 'GleamOps',
    companyPhone,
    companyEmail,
    layoutConfig,
    signatures,
    attachmentNames,
  } = props;

  // Build section renderers keyed by section ID
  const sectionRenderers: Record<ProposalLayoutSection['id'], React.ReactNode> = {
    header: <HeaderSection companyName={companyName} />,
    companyInfo: <CompanyInfoSection companyPhone={companyPhone} companyEmail={companyEmail} />,
    metadata: <MetadataSection proposalCode={proposalCode} clientName={clientName} siteName={siteName} date={date} validUntil={validUntil} />,
    scope: <ScopeSection description={description} />,
    pricing: <PricingSection pricingOptions={pricingOptions} />,
    terms: <TermsSection terms={terms} />,
    signatures: <SignatureSection companyName={companyName} signatures={signatures} />,
    attachments: <AttachmentsSection attachmentNames={attachmentNames} />,
  };

  // Determine section order
  let orderedSections: Array<{ id: ProposalLayoutSection['id']; pageBreakBefore: boolean }>;

  if (layoutConfig) {
    // V2: use layout config
    orderedSections = [...layoutConfig.sections]
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ id: s.id, pageBreakBefore: s.pageBreakBefore }));
  } else {
    // V1: hardcoded order (backward compatible)
    orderedSections = [
      { id: 'header', pageBreakBefore: false },
      { id: 'companyInfo', pageBreakBefore: false },
      { id: 'metadata', pageBreakBefore: false },
      { id: 'scope', pageBreakBefore: false },
      { id: 'pricing', pageBreakBefore: false },
      { id: 'terms', pageBreakBefore: false },
      { id: 'signatures', pageBreakBefore: false },
    ];
  }

  return (
    <Document
      title={`Proposal ${proposalCode}`}
      author={companyName}
      subject={`Service Proposal for ${clientName}`}
    >
      <Page size="LETTER" style={styles.page}>
        {orderedSections.map((section) => (
          <View key={section.id} break={section.pageBreakBefore || undefined}>
            {sectionRenderers[section.id]}
          </View>
        ))}

        {/* ---- Footer ---- */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {companyName} | {proposalCode}
          </Text>
          <Text style={styles.footerText}>
            Confidential
          </Text>
        </View>
      </Page>
    </Document>
  );
}
