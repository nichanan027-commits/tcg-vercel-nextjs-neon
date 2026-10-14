import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import LogoutButton from '@/components/LogoutButton';

export const metadata: Metadata = {
  title: 'TCG Smart Claim Pitching',
  description: 'ระบบเสนอจ่ายค่าประกันชดเชยต่อคณะกรรมการ: นำเข้าชีต นำเสนอ บันทึกมติ และร่างรายงานการประชุม',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header className="topbar">
          <div className="topbar-in">
            <Link href="/" className="brand">TCG Smart Claim Pitching<small>ระบบเสนอคณะกรรมการจ่ายค่าประกันชดเชย</small></Link>
            <LogoutButton />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
