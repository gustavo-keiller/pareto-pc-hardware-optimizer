/**
 * SimpleGuideWidgets.tsx — Reusable mini visual widgets for the Simple Pareto Guide.
 */

/**
 * Vertical fill meter displaying normalized weight share.
 */
export function MiniWeightBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <span
      className="inline-flex h-5 w-3 flex-col justify-end overflow-hidden rounded-[3px] border border-slate-600 bg-slate-950 p-[1px] align-middle shadow-inner"
      title={`${Math.round(clamped)}% Priority Weight`}
    >
      <span
        className="w-full rounded-[1px] transition-all duration-150"
        style={{
          height: `${clamped}%`,
          backgroundColor: color,
        }}
      />
    </span>
  );
}

/**
 * Clean hardware spec comparison bar.
 */
export function SkewedStatBar({
  label,
  valueText,
  pct,
  colorClass = 'bg-amber-400',
}: {
  label: string;
  valueText: string;
  pct: number;
  colorClass?: string;
}) {
  const clamped = Math.max(6, Math.min(100, pct));
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-bold italic tracking-wide text-amber-300">
          {label}
        </span>
        <span className="font-mono font-bold text-white">{valueText}</span>
      </div>
      <div className="relative h-3.5 w-full -skew-x-12 overflow-hidden rounded bg-slate-800/90 p-0.5 shadow-inner border border-slate-700/70">
        <div
          className={`h-full rounded-sm ${colorClass} transition-all duration-300 shadow-sm`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
