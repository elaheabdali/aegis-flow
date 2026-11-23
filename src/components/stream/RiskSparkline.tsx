'use client';

import { useId, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RiskSparklineProps {
  readonly data: readonly number[];
  readonly label: string;
}

export function RiskSparkline({ data, label }: RiskSparklineProps) {
  const gradientId = useId();
  const prefersReducedMotion = useReducedMotion();

  const { linePath, areaPath, lastPoint } = useMemo(() => {
    const width = 180;
    const height = 40;
    const pad = 4;

    if (data.length < 2) {
      return { linePath: '', areaPath: '', lastPoint: null };
    }

    const maxVal = 100;
    const minVal = 0;
    const stepX = (width - pad * 2) / (data.length - 1);

    const coords = data.map((rawVal, idx) => {
      const safeVal = Number.isFinite(rawVal)
        ? Math.min(maxVal, Math.max(minVal, rawVal))
        : minVal;
      const normalized = (safeVal - minVal) / (maxVal - minVal);
      const x = pad + idx * stepX;
      const y = height - pad - normalized * (height - pad * 2);
      return { x, y };
    });

    const line = coords
      .map(
        (pt, i) =>
          `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
      )
      .join(' ');

    const first = coords[0];
    const last = coords[coords.length - 1];
    const area =
      first && last
        ? `${line} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`
        : '';

    return { linePath: line, areaPath: area, lastPoint: last ?? null };
  }, [data]);

  return (
    <div role="img" aria-label={label} className="flex items-center gap-3">
      <svg
        viewBox="0 0 180 40"
        className="h-10 w-36 overflow-visible sm:w-44"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {lastPoint && (
          <motion.circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="3.5"
            fill="#3b82f6"
            animate={prefersReducedMotion ? undefined : { r: [3, 5, 3] }}
            transition={
              prefersReducedMotion
                ? undefined
                : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
            }
          />
        )}
      </svg>
    </div>
  );
}