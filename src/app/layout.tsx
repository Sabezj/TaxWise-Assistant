
import type {Metadata} from 'next';
import {GeistSans} from 'geist/font/sans';
// import {GeistMono} from 'geist/font/mono'; // Assuming this was fixed or not needed for now
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from '@/contexts/i18n-context';

const geistSans = GeistSans;
// const geistMono = GeistMono; // Assuming this was fixed or not needed for now

export const metadata: Metadata = {
  title: 'TaxWise Assistant',
  description: 'Your intelligent assistant for tax deductions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <I18nProvider>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
