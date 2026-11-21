import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Vazirmatn } from 'next/font/google';
import { notFound } from 'next/navigation';
import {
  LOCALES,
  getDirection,
  isValidLocale,
  type Locale,
} from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { AppProviders } from '@/components/providers/AppProviders';
import { CommandHeader } from '@/components/layout/CommandHeader';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  const dict = await getDictionary(locale);

  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const typedLocale: Locale = locale;
  const dir = getDirection(typedLocale);
  const dict = await getDictionary(typedLocale);

  return (
    <html
      lang={typedLocale}
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${vazirmatn.variable} ${jetbrainsMono.variable}`}
    >
      <body
        style={{
          fontFamily:
            typedLocale === 'fa'
              ? 'var(--font-vazirmatn), var(--font-inter), sans-serif'
              : 'var(--font-inter), sans-serif',
        }}
        className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)] selection:bg-blue-500/20 selection:text-blue-400"
      >
        <AppProviders>
          <div className="flex min-h-screen flex-col">
            <CommandHeader locale={typedLocale} dict={dict} />
            <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">
              {children}
            </main>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}