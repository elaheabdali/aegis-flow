'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Search, X } from 'lucide-react';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { formatNumber } from '@/i18n/formatters';
import type { RiskSeverity, StreamFilterState } from '@/types/domain';
import { TELEMETRY_SPRING } from '@/lib/motion';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';

interface StreamControlsProps {
  readonly locale?: Locale;
  readonly dict: Dictionary;
  readonly filters: StreamFilterState;
  readonly onUpdateFilters: (next: Partial<StreamFilterState>) => void;
}

const SEVERITY_OPTIONS: readonly (RiskSeverity | 'all')[] = [
  'all',
  'critical',
  'high',
  'medium',
  'low',
];

export function StreamControls({
  locale = DEFAULT_LOCALE,
  dict,
  filters,
  onUpdateFilters,
}: StreamControlsProps) {
  const isPaused = useWorkbenchStore((s) => s.isPaused);
  const togglePause = useWorkbenchStore((s) => s.togglePause);
  const pendingCount = useWorkbenchStore((s) => s.pendingQueue.length);

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Search Box */}
      <div className="relative max-w-md flex-1">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
          aria-hidden="true"
        />
        <input
          type="text"
          inputMode="search"
          maxLength={120}
          autoComplete="off"
          spellCheck={false}
          value={filters.query}
          onChange={(e) => onUpdateFilters({ query: e.target.value })}
          placeholder={dict.workbench.searchPlaceholder}
          aria-label={dict.workbench.searchPlaceholder}
          className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] ps-9 pe-8 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-blue-500 focus:outline-none"
        />
        {filters.query && (
          <button
            type="button"
            onClick={() => onUpdateFilters({ query: '' })}
            aria-label={locale === 'fa' ? 'پاک کردن جستجو' : 'Clear search'}
            className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Risk Filter Pills + Stream Freeze/Resume Toggle */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div
          role="group"
          aria-label={dict.workbench.columns.riskScore}
          className="flex flex-wrap items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1"
        >
          {SEVERITY_OPTIONS.map((sev) => {
            const isSelected = filters.severity === sev;
            return (
              <button
                key={sev}
                type="button"
                onClick={() => onUpdateFilters({ severity: sev })}
                aria-pressed={isSelected}
                className={`relative rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="activeSeverityPill"
                    transition={TELEMETRY_SPRING}
                    className="absolute inset-0 rounded-md bg-[var(--surface-card)] shadow-xs"
                  />
                )}
                <span className="relative z-10">
                  {dict.workbench.severities[sev]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Freeze / Resume Stream Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => togglePause()}
          aria-pressed={isPaused}
          className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-xs font-semibold transition-colors ${
            isPaused
              ? 'border-amber-500/40 bg-amber-500/15 text-amber-500 hover:bg-amber-500/20'
              : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
          }`}
        >
          {isPaused ? (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{dict.workbench.resumeStream}</span>
              <AnimatePresence>
                {pendingCount > 0 && (
                  <motion.span
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950 tabular-nums"
                  >
                    {dict.workbench.queuedBadge.replace(
                      '{count}',
                      formatNumber(pendingCount, locale)
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5" />
              <span>{dict.workbench.pauseStream}</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}