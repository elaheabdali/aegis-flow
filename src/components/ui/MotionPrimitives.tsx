'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { TELEMETRY_ITEM_VARIANTS, TELEMETRY_SPRING } from '@/lib/motion';

interface LivePulseBadgeProps {
  readonly status: 'live' | 'simulated' | 'paused';
  readonly label: string;
}

export function LivePulseBadge({ status, label }: LivePulseBadgeProps) {
  const colorMap = {
    live: {
      dot: 'bg-emerald-500',
      ring: 'bg-emerald-400',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/25 bg-emerald-500/10',
    },
    simulated: {
      dot: 'bg-blue-500',
      ring: 'bg-blue-400',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/25 bg-blue-500/10',
    },
    paused: {
      dot: 'bg-amber-500',
      ring: 'bg-amber-400',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/25 bg-amber-500/10',
    },
  }[status];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${colorMap.border} ${colorMap.text}`}
    >
      <span className="relative flex h-2 w-2">
        {status !== 'paused' && (
          <motion.span
            animate={{ scale: [1, 2.1], opacity: [0.75, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            className={`absolute inline-flex h-full w-full rounded-full ${colorMap.ring}`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${colorMap.dot}`} />
      </span>
      <span>{label}</span>
    </div>
  );
}

export function TelemetryCard({
  children,
  className = '',
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      variants={TELEMETRY_ITEM_VARIANTS}
      whileHover={{ y: -2 }}
      transition={TELEMETRY_SPRING}
      className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-sm transition-colors hover:border-[var(--border-strong)] ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}