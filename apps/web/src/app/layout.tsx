import type { Metadata } from 'next';
import { Atkinson_Hyperlegible, Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

const atkinsonHyperlegible = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-atkinson',
});

export const metadata: Metadata = {
  title: 'GleamOps',
  description: 'Commercial cleaning operations platform',
  icons: {
    icon: 'data:,',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.className} ${inter.variable} ${jetbrainsMono.variable} ${atkinsonHyperlegible.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('gleamops-theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Toaster
          position="top-right"
          gap={8}
          toastOptions={{
            duration: 3000,
            className: 'shadow-lg border border-border bg-card text-card-foreground',
            style: {
              background: 'var(--color-card)',
              color: 'var(--color-card-foreground)',
              border: '1px solid var(--color-border)',
            },
          }}
        />
      </body>
    </html>
  );
}
