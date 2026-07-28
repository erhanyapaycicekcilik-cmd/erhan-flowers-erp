import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Erhan Flowers Panel',
  description: 'Erhan Flowers ERP MVP yönetim paneli',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
