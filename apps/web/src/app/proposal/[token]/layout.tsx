import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Proposal | GleamOps',
};

export default function ProposalPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
