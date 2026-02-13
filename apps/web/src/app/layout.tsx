import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GleamOps',
  description: 'Commercial cleaning operations platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Toaster
          position="top-right"
          gap={8}
          toastOptions={{
            duration: 3000,
            className: 'shadow-lg border-border',
          }}
        />
      </body>
    </html>
  );
}
