import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { WorkbenchClient } from '@/components/WorkbenchClient';

export default async function WorkbenchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) {
    notFound();
  }

  const dict = await getDictionary(locale);

  return (
    <>
      <h1 className="sr-only">{dict.meta.title}</h1>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            aria-label="Loading workbench"
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)]"
                />
              ))}
            </div>
            <div className="h-[620px] animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)]" />
          </div>
        }
      >
        <WorkbenchClient locale={locale} dict={dict} />
      </Suspense>
    </>
  );
}