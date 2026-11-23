'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Sun,
  Moon,
  Languages,
  UserCheck,
  Shield,
  Coins,
} from 'lucide-react';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { TELEMETRY_SPRING } from '@/lib/motion';
import { LivePulseBadge } from '@/components/ui/MotionPrimitives';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import type { AnalystRole } from '@/types/domain';

interface CommandHeaderProps {
  readonly locale: Locale;
  readonly dict: Dictionary;
}

const emptySubscribe = () => () => {};

function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function CommandHeader({ locale, dict }: CommandHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useIsMounted();

  const activeRole = useWorkbenchStore((s) => s.activeRole);
  const setActiveRole = useWorkbenchStore((s) => s.setActiveRole);
  const currency = useWorkbenchStore((s) => s.currency);
  const setCurrency = useWorkbenchStore((s) => s.setCurrency);
  const isPaused = useWorkbenchStore((s) => s.isPaused);
  const connectionMode = useWorkbenchStore((s) => s.connectionMode);

  const handleLocaleSwitch = (targetLocale: Locale) => {
    if (targetLocale === locale) return;
    const segments = pathname.split('/');
    segments[1] = targetLocale;
    router.push(segments.join('/'));
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const isDark = mounted ? resolvedTheme === 'dark' : true;

  const badgeStatus = isPaused
    ? 'paused'
    : connectionMode === 'live_ws'
      ? 'live'
      : 'simulated';

  const badgeLabel = isPaused
    ? dict.header.streamPaused
    : connectionMode === 'live_ws'
      ? dict.header.streamLive
      : dict.header.streamSimulated;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand Identity + Live Telemetry Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <motion.div
              whileHover={{ rotate: [0, -6, 6, 0] }}
              transition={{ duration: 0.4 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/25"
            >
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                  {dict.header.brandName}
                </span>
                <span className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-blue-500">
                  {dict.header.brandTagline}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block">
            <LivePulseBadge status={badgeStatus} label={badgeLabel} />
          </div>
        </div>

        {/* End Controls: Currency (IRT/IRR), RBAC Role, Language (FA/EN), Theme Toggle */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Toman / Rial Currency Unit Switcher */}
          <div
            role="group"
            aria-label={dict.header.currencyLabel}
            className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1"
          >
            <Coins
              className="mx-1.5 h-3.5 w-3.5 text-amber-500"
              aria-hidden="true"
            />
            {(['IRT', 'IRR'] as const).map((unit) => {
              const isSelected = currency === unit;
              return (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setCurrency(unit)}
                  aria-pressed={isSelected}
                  className={`relative rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="activeCurrencyPill"
                      transition={TELEMETRY_SPRING}
                      className="absolute inset-0 rounded-md bg-[var(--surface-card)] shadow-xs"
                    />
                  )}
                  <span className="relative z-10">
                    {dict.header.currencies[unit]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Responsive RBAC Role Selector for < xl viewports */}
          <div className="flex xl:hidden">
            <label htmlFor="mobile-role-select" className="sr-only">
              {dict.header.roleLabel}
            </label>
            <select
              id="mobile-role-select"
              aria-label={dict.header.roleLabel}
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as AnalystRole)}
              className="h-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2 text-xs font-medium text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
            >
              <option value="senior_investigator">
                {dict.header.roles.senior_investigator}
              </option>
              <option value="junior_analyst">
                {dict.header.roles.junior_analyst}
              </option>
            </select>
          </div>

          {/* Desktop RBAC Role Switcher */}
          <div
            role="group"
            aria-label={dict.header.roleLabel}
            className="hidden items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1 xl:flex"
          >
            {(
              [
                {
                  id: 'senior_investigator',
                  icon: Shield,
                  label: dict.header.roles.senior_investigator,
                },
                {
                  id: 'junior_analyst',
                  icon: UserCheck,
                  label: dict.header.roles.junior_analyst,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isActive = activeRole === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveRole(item.id)}
                  className={`relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeRolePill"
                      transition={TELEMETRY_SPRING}
                      className="absolute inset-0 rounded-md bg-[var(--surface-card)] shadow-xs"
                    />
                  )}
                  <Icon className="relative z-10 h-3.5 w-3.5 text-blue-500" />
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bilingual FA / EN Switcher */}
          <div
            role="group"
            aria-label={dict.header.languageToggle}
            className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1"
          >
            <Languages
              className="mx-1.5 h-3.5 w-3.5 text-[var(--text-muted)]"
              aria-hidden="true"
            />
            {(['fa', 'en'] as const).map((lang) => {
              const isSelected = locale === lang;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLocaleSwitch(lang)}
                  aria-pressed={isSelected}
                  className={`relative rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="activeLocalePill"
                      transition={TELEMETRY_SPRING}
                      className="absolute inset-0 rounded-md bg-[var(--surface-card)] shadow-xs"
                    />
                  )}
                  <span className="relative z-10">
                    {lang === 'fa' ? 'فا' : 'EN'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Animated Dark / Light Theme Toggle */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={toggleTheme}
            aria-label={dict.header.themeToggle}
            title={dict.header.themeToggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isDark ? 'dark' : 'light'}
                initial={{ rotate: -60, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 60, opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.18 }}
              >
                {isDark ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-700" />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </header>
  );
}