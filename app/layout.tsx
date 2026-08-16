import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GDR | Global Distribution Runtime',
  description: 'Global operations command with multi-layer geographic intelligence and AI terminal orchestration.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sansFont.variable} ${monoFont.variable}`}>
      <body suppressHydrationWarning className="bg-void text-[#f1f5f9] font-sans antialiased overflow-hidden selection:bg-cobalt-c2/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}

