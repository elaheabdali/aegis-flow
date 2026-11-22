'use client';

import { motion } from 'framer-motion';
import { Activity, AlertOctagon, Banknote, Cpu } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import {
  formatCompactIranianCurrency,
  formatNumber,
} from '@/i18n/formatters';
import { STAGGER_CONTAINER } from '@/lib/motion';
import { TelemetryCard } from '@/components/ui/MotionPrimitives';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { RiskSparkline } from '@/components/stream/RiskSparkline';

interface KpiTelemetryBarProps {
  readonly locale: Locale;
  readonly dict: Dictionary;
}

export function KpiTelemetryBar({ locale, dict }: KpiTelemetryBarProps) {
  const metrics = useWorkbenchStore((s) => s.metrics);
  const currency = useWorkbenchStore((s) => s.currency);
  const riskVelocityHistory = useWorkbenchStore((s) => s.riskVelocityHistory);

  return (
    <motion.section
      variants={STAGGER_CONTAINER}
      initial="hidden"
      animate="visible"
      aria-label="Live Telemetry Metrics"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {/* Card 1: Stream Throughput + Live Sparkline */}
      <TelemetryCard className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <Activity className="h-3.5 w-3.5 text-blue-500" />
            <span>{dict.kpi.throughput}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
              {formatNumber(metrics.throughputPerSec, locale)}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {dict.kpi.throughputUnit}
            </span>
          </div>
        </div>
        <RiskSparkline
          data={riskVelocityHistory}
          label={dict.kpi.sparklineTitle}
        />
      </TelemetryCard>

      {/* Card 2: Flagged Financial Exposure (Toman / Rial) */}
      <TelemetryCard>
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
          <Banknote className="h-3.5 w-3.5 text-amber-500" />
          <span>{dict.kpi.flaggedVolume}</span>
        </div>
        <div className="mt-2 text-start text-xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
          {formatCompactIranianCurrency(
            metrics.flaggedExposureIrt,
            currency,
            locale
          )}
        </div>
      </TelemetryCard>

      {/* Card 3: Critical Alerts */}
      <TelemetryCard>
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
          <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
          <span>{dict.kpi.criticalAlerts}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-rose-500 tabular-nums">
            {formatNumber(metrics.criticalCount, locale)}
          </span>
          <span
            dir="ltr"
            className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-500"
          >
            SCORE ≥ 82
          </span>
        </div>
      </TelemetryCard>

      {/* Card 4: Off-Thread Worker Latency */}
      <TelemetryCard>
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
          <Cpu className="h-3.5 w-3.5 text-emerald-500" />
          <span>{dict.kpi.workerLatency}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-emerald-500 tabular-nums">
            {formatNumber(metrics.workerLatencyMs, locale, 2)}
          </span>
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {dict.kpi.latencyUnit}
          </span>
        </div>
      </TelemetryCard>
    </motion.section>
  );
}