import { useMemo } from 'react';
import {
  GpuCandidate,
  HardConstraints,
  HardwareVendor,
} from '../lib/math/types';
import {
  computeGpuFacets,
  KNOWN_GPU_TECHNOLOGIES,
} from '../lib/math/capabilities';
import { Cpu, Check, RotateCcw, Sparkles } from 'lucide-react';

interface HardwareFilterPanelProps {
  candidates: GpuCandidate[];
  constraints: HardConstraints;
  onChangeConstraints: (
    updater: (prev: HardConstraints) => HardConstraints,
  ) => void;
}

export function HardwareFilterPanel({
  candidates,
  constraints,
  onChangeConstraints,
}: HardwareFilterPanelProps) {
  const facets = useMemo(
    () => computeGpuFacets(candidates, constraints),
    [candidates, constraints],
  );

  const vendorFacet = facets.find((f) => f.id === 'vendors');
  const selectedVendors = constraints.selectedVendors ?? [];
  const requiredFeatures = constraints.requiredFeatures ?? [];

  const isAnyFilterActive =
    selectedVendors.length > 0 || requiredFeatures.length > 0;

  const handleToggleVendor = (vendor: HardwareVendor) => {
    onChangeConstraints((prev) => {
      const current = prev.selectedVendors ?? [];
      const next = current.includes(vendor)
        ? current.filter((v) => v !== vendor)
        : [...current, vendor];
      return {
        ...prev,
        selectedVendors: next,
      };
    });
  };

  const handleSelectAllVendors = () => {
    onChangeConstraints((prev) => ({
      ...prev,
      selectedVendors: [],
    }));
  };

  const handleToggleFeature = (featureId: string) => {
    onChangeConstraints((prev) => {
      const current = prev.requiredFeatures ?? [];
      const next = current.includes(featureId)
        ? current.filter((f) => f !== featureId)
        : [...current, featureId];
      return {
        ...prev,
        requiredFeatures: next,
      };
    });
  };

  const handleClearAllFilters = () => {
    onChangeConstraints((prev) => ({
      ...prev,
      selectedVendors: [],
      selectedArchitectures: [],
      requiredFeatures: [],
    }));
  };

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-sky-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Brand &amp; Ecosystem Filters
          </h3>
        </div>
        {isAnyFilterActive && (
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-amber-300 hover:bg-slate-700 transition"
            title="Reset brand and technology filters"
          >
            <RotateCcw className="h-3 w-3" />
            Clear Filters
          </button>
        )}
      </div>

      {/* 1. Brand / Vendor Selector */}
      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-300">
            Chipset Manufacturer:
          </span>
          <span className="text-[11px] text-slate-400">
            {selectedVendors.length === 0
              ? 'Showing All Brands'
              : `${selectedVendors.length} Selected`}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {/* All Brands Pill */}
          <button
            type="button"
            onClick={handleSelectAllVendors}
            className={`rounded-xl border px-2.5 py-2 text-center transition ${
              selectedVendors.length === 0
                ? 'border-amber-400 bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700 hover:text-slate-200 font-bold'
            }`}
          >
            <div className="text-xs">All</div>
            <div className="text-[10px] opacity-75">({candidates.length})</div>
          </button>

          {/* NVIDIA */}
          {(() => {
            const opt = vendorFacet?.options.find((o) => o.id === 'NVIDIA');
            const isSelected = selectedVendors.includes('NVIDIA');
            const count = opt?.count ?? 0;
            return (
              <button
                type="button"
                onClick={() => handleToggleVendor('NVIDIA')}
                className={`rounded-xl border px-2.5 py-2 text-center transition ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-extrabold shadow-md shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300 font-semibold'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-xs">
                  {isSelected && <Check className="h-3 w-3 text-emerald-400" />}
                  NVIDIA
                </div>
                <div className="text-[10px] opacity-75">({count})</div>
              </button>
            );
          })()}

          {/* AMD */}
          {(() => {
            const opt = vendorFacet?.options.find((o) => o.id === 'AMD');
            const isSelected = selectedVendors.includes('AMD');
            const count = opt?.count ?? 0;
            return (
              <button
                type="button"
                onClick={() => handleToggleVendor('AMD')}
                className={`rounded-xl border px-2.5 py-2 text-center transition ${
                  isSelected
                    ? 'border-rose-500 bg-rose-500/20 text-rose-300 font-extrabold shadow-md shadow-rose-500/10'
                    : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-rose-500/40 hover:text-rose-300 font-semibold'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-xs">
                  {isSelected && <Check className="h-3 w-3 text-rose-400" />}
                  AMD
                </div>
                <div className="text-[10px] opacity-75">({count})</div>
              </button>
            );
          })()}

          {/* Intel */}
          {(() => {
            const opt = vendorFacet?.options.find((o) => o.id === 'Intel');
            const isSelected = selectedVendors.includes('Intel');
            const count = opt?.count ?? 0;
            return (
              <button
                type="button"
                onClick={() => handleToggleVendor('Intel')}
                className={`rounded-xl border px-2.5 py-2 text-center transition ${
                  isSelected
                    ? 'border-sky-500 bg-sky-500/20 text-sky-300 font-extrabold shadow-md shadow-sky-500/10'
                    : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-sky-500/40 hover:text-sky-300 font-semibold'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-xs">
                  {isSelected && <Check className="h-3 w-3 text-sky-400" />}
                  Intel
                </div>
                <div className="text-[10px] opacity-75">({count})</div>
              </button>
            );
          })()}
        </div>
      </div>

      {/* 2. Proprietary Technologies Attached to Brands */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Brand Technologies &amp; Capabilities:
          </span>
          <span className="text-[10px] text-slate-500">Ecosystem Features</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400 mb-2.5">
          Filter out or isolate proprietary hardware features attached to brands
          that cannot be compared purely on a numeric axis.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {KNOWN_GPU_TECHNOLOGIES.map((tech) => {
            const isRequired = requiredFeatures.includes(tech.id);
            return (
              <button
                key={tech.id}
                type="button"
                onClick={() => handleToggleFeature(tech.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  isRequired
                    ? 'border-amber-400 bg-amber-400/20 text-amber-300 shadow-sm'
                    : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
                title={tech.description}
              >
                {isRequired ? (
                  <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600 shrink-0" />
                )}
                <span>{tech.label}</span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                    isRequired
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tech.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
