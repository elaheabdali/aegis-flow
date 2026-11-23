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

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aegis-flow.vercel.app';

  return {
    metadataBase: new URL(siteUrl),
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fa: '/fa',
        en: '/en',
        'x-default': '/fa',
      },
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      url: `/${locale}`,
      siteName: 'AegisFlow',
      locale: locale === 'fa' ? 'fa_IR' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.title,
      description: dict.meta.description,
    },
    robots: {
      index: true,
      follow: true,
    },
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
        className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)] antialiased selection:bg-blue-500/20 selection:text-blue-400"
      >
        <AppProviders>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white focus:shadow-lg"
          >
            {typedLocale === 'fa'
              ? 'پرش به محتوای اصلی میز کار'
              : 'Skip to main workbench content'}
          </a>
          <div className="flex min-h-screen flex-col">
            <CommandHeader locale={typedLocale} dict={dict} />
            <main
              id="main-content"
              className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6"
            >
              {children}
            </main>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}