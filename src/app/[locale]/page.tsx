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
    <Suspense
      fallback={
        <div className="h-96 animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)]" />
      }
    >
      <WorkbenchClient locale={locale} dict={dict} />
    </Suspense>
  );
}