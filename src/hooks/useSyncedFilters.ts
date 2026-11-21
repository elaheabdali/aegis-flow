'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { RiskSeverity, StreamFilterState } from '@/types/domain';

const VALID_SEVERITIES = new Set<string>(['all', 'critical', 'high', 'medium', 'low']);

export function useSyncedFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const filters: StreamFilterState = useMemo(() => {
    const rawSeverity = searchParams.get('severity') ?? 'all';
    const severity: RiskSeverity | 'all' = VALID_SEVERITIES.has(rawSeverity)
      ? (rawSeverity as RiskSeverity | 'all')
      : 'all';

    return {
      query: searchParams.get('q') ?? '',
      severity,
    };
  }, [searchParams]);

  const updateFilters = useCallback(
    (next: Partial<StreamFilterState>) => {
      const params = new URLSearchParams(searchParams.toString());
      const merged: StreamFilterState = { ...filters, ...next };

      if (merged.query.trim()) {
        params.set('q', merged.query);
      } else {
        params.delete('q');
      }

      if (merged.severity !== 'all') {
        params.set('severity', merged.severity);
      } else {
        params.delete('severity');
      }

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [filters, pathname, router, searchParams]
  );

  return { filters, updateFilters };
} 