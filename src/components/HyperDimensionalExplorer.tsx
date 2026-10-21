import { useMemo, useState } from 'react';
import { RankedGpu } from '../lib/math/types';
import {
  HyperDimKey,
  HYPER_DIMENSIONS,
  HyperProjectionMode,
  HyperEvaluatedItem,
  mapHyperDims,
} from './hyper/hyperTypes';
import { HyperHeaderControls } from './hyper/HyperHeaderControls';
import { ParallelDominanceView } from './hyper/ParallelDominanceView';
import { StarGlyphScatterView } from './hyper/StarGlyphScatterView';
import { RadVizGravityArena } from './hyper/RadVizGravityArena';

export { HYPER_DIMENSIONS } from './hyper/hyperTypes';
export type { HyperDimKey } from './hyper/hyperTypes';

interface HyperDimensionalExplorerProps {
  gpus: RankedGpu[];
  hoveredGpuId: string | null;
  selectedGpuIds: string[];
  isExpanded: boolean;
  hideDominatedNodes: boolean;
  onHoverGpu: (id: string | null) => void;
  onToggleSelectGpu: (id: string) => void;
}

export function HyperDimensionalExplorer({
  gpus,
  hoveredGpuId,
  selectedGpuIds,
  isExpanded,
  hideDominatedNodes,
  onHoverGpu,
  onToggleSelectGpu,
}: HyperDimensionalExplorerProps) {
  const [projection, setProjection] = useState<HyperProjectionMode>('parallel');

  // Active dimensions (defaults to 6 dimensions)
  const [activeDimKeys, setActiveDimKeys] = useState<HyperDimKey[]>([
    'price',
    'rasterFps1440p',
    'rtFps1440p',
    'vramGb',
    'tdpWatts',
    'fpsPerDollar',
  ]);

  // Per-dimension minimum utility gates (0 to 80%)
  const [dimGates, setDimGates] = useState<Record<HyperDimKey, number>>({
    price: 0,
    rasterFps1440p: 0,
    rtFps1440p: 0,
    vramGb: 0,
    tdpWatts: 0,
    fpsPerDollar: 0,
    fpsPerWatt: 0,
  });

  // Per-dimension gravity boost for RadViz
  const [gravityBoost, setGravityBoost] = useState<Record<HyperDimKey, number>>(
    {
      price: 1,
      rasterFps1440p: 1,
      rtFps1440p: 1,
      vramGb: 1,
      tdpWatts: 1,
      fpsPerDollar: 1,
      fpsPerWatt: 1,
    },
  );

  // Pinned trap ID to demonstrate N-D dominance ribbon
  const [pinnedTrapId, setPinnedTrapId] = useState<string | null>(null);
  const [localHideTraps, setLocalHideTraps] = useState<boolean>(false);

  const effectiveHideTraps = hideDominatedNodes || localHideTraps;

  const activeDims = useMemo(
    () => HYPER_DIMENSIONS.filter((d) => activeDimKeys.includes(d.key)),
    [activeDimKeys],
  );

  // Compute min/max bounds for all 7 dimensions
  const dimBounds = useMemo(() => {
    const map = mapHyperDims(() => ({ min: 0, max: 100, mid: 50 }));
    for (const dim of HYPER_DIMENSIONS) {
      if (gpus.length === 0) {
        map[dim.key] = { min: 0, max: 100, mid: 50 };
      } else {
        const vals = gpus.map((g) => dim.getValue(g));
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        map[dim.key] = { min, max, mid: (min + max) / 2 };
      }
    }
    return map;
  }, [gpus]);

  // Compute normalized directional utility u_{i, d} in [0, 1] and evaluate exact N-D Pareto Dominance
  const hyperEvaluated = useMemo<HyperEvaluatedItem[]>(() => {
    const utilitiesById = new Map<string, Record<HyperDimKey, number>>();

    for (const gpu of gpus) {
      const uRecord = mapHyperDims(() => 0);
      for (const dim of HYPER_DIMENSIONS) {
        const { min, max } = dimBounds[dim.key];
        const val = dim.getValue(gpu);
        const span = max - min;
        if (span <= 1e-9) {
          uRecord[dim.key] = 1.0;
        } else {
          const raw =
            dim.direction === 'min' ? (max - val) / span : (val - min) / span;
          uRecord[dim.key] = Math.max(0, Math.min(1, raw));
        }
      }
      utilitiesById.set(gpu.id, uRecord);
    }

    const dominatorsById = new Map<string, RankedGpu[]>();
    for (const b of gpus) {
      const uB = utilitiesById.get(b.id)!;
      const dominators: RankedGpu[] = [];

      for (const a of gpus) {
        if (a.id === b.id) continue;
        const uA = utilitiesById.get(a.id)!;
        let allAtLeastAsGood = true;
        let strictlyBetterInOne = false;

        for (const dim of activeDims) {
          const va = uA[dim.key];
          const vb = uB[dim.key];
          if (va + 1e-9 < vb) {
            allAtLeastAsGood = false;
            break;
          }
          if (va > vb + 1e-9) {
            strictlyBetterInOne = true;
          }
        }

        if (allAtLeastAsGood && strictlyBetterInOne) {
          dominators.push(a);
        }
      }
      dominatorsById.set(b.id, dominators);
    }

    return gpus.map((gpu) => {
      const u = utilitiesById.get(gpu.id)!;
      const dominators = dominatorsById.get(gpu.id) ?? [];
      const isNDOptimal = dominators.length === 0;

      const passesGates = activeDims.every(
        (d) => u[d.key] * 100 + 1e-6 >= dimGates[d.key],
      );

      let weightedSum = 0;
      let weightTotal = 0;
      for (const d of activeDims) {
        const w = gravityBoost[d.key] || 1;
        weightedSum += w * u[d.key];
        weightTotal += w;
      }
      const hyperScore = weightTotal > 0 ? weightedSum / weightTotal : 0;

      return {
        gpu,
        utilities: u,
        dominators,
        isNDOptimal,
        passesGates,
        hyperScore,
      };
    });
  }, [gpus, dimBounds, activeDims, dimGates, gravityBoost]);

  const ndOptimalList = useMemo(
    () => hyperEvaluated.filter((item) => item.isNDOptimal),
    [hyperEvaluated],
  );
  const ndTrapList = useMemo(
    () => hyperEvaluated.filter((item) => !item.isNDOptimal),
    [hyperEvaluated],
  );

  const inspectedItem = useMemo(() => {
    const targetId = hoveredGpuId ?? pinnedTrapId;
    if (!targetId) return null;
    return hyperEvaluated.find((item) => item.gpu.id === targetId) ?? null;
  }, [hyperEvaluated, hoveredGpuId, pinnedTrapId]);

  const activeDominatorItem = useMemo(() => {
    if (!inspectedItem || inspectedItem.isNDOptimal) return null;
    const firstDom = inspectedItem.dominators[0];
    if (!firstDom) return null;
    return hyperEvaluated.find((item) => item.gpu.id === firstDom.id) ?? null;
  }, [inspectedItem, hyperEvaluated]);

  const handleToggleDimension = (key: HyperDimKey) => {
    setActiveDimKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 3) return prev;
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const handleResetGates = () => {
    setDimGates({
      price: 0,
      rasterFps1440p: 0,
      rtFps1440p: 0,
      vramGb: 0,
      tdpWatts: 0,
      fpsPerDollar: 0,
      fpsPerWatt: 0,
    });
    setGravityBoost({
      price: 1,
      rasterFps1440p: 1,
      rtFps1440p: 1,
      vramGb: 1,
      tdpWatts: 1,
      fpsPerDollar: 1,
      fpsPerWatt: 1,
    });
    setPinnedTrapId(null);
  };

  const svgW = 860;
  const svgH = isExpanded ? 560 : 440;

  return (
    <div className="mt-3 space-y-4">
      <HyperHeaderControls
        activeDims={activeDims}
        activeDimKeys={activeDimKeys}
        onToggleDimension={handleToggleDimension}
        projection={projection}
        setProjection={setProjection}
        ndOptimalList={ndOptimalList}
        ndTrapList={ndTrapList}
        effectiveHideTraps={effectiveHideTraps}
        onToggleHideTraps={() => setLocalHideTraps((prev) => !prev)}
        onResetGates={handleResetGates}
        pinnedTrapId={pinnedTrapId}
        setPinnedTrapId={setPinnedTrapId}
      />

      {projection === 'parallel' && (
        <ParallelDominanceView
          activeDims={activeDims}
          dimGates={dimGates}
          setDimGates={setDimGates}
          hyperEvaluated={hyperEvaluated}
          effectiveHideTraps={effectiveHideTraps}
          selectedGpuIds={selectedGpuIds}
          inspectedItem={inspectedItem}
          activeDominatorItem={activeDominatorItem}
          dimBounds={dimBounds}
          svgW={svgW}
          svgH={svgH}
          onHoverGpu={onHoverGpu}
          onToggleSelectGpu={onToggleSelectGpu}
        />
      )}

      {projection === 'glyph' && (
        <StarGlyphScatterView
          activeDims={activeDims}
          dimBounds={dimBounds}
          hyperEvaluated={hyperEvaluated}
          effectiveHideTraps={effectiveHideTraps}
          inspectedItem={inspectedItem}
          svgW={svgW}
          svgH={svgH}
          onHoverGpu={onHoverGpu}
          onToggleSelectGpu={onToggleSelectGpu}
        />
      )}

      {projection === 'radviz' && (
        <RadVizGravityArena
          activeDims={activeDims}
          gravityBoost={gravityBoost}
          setGravityBoost={setGravityBoost}
          hyperEvaluated={hyperEvaluated}
          effectiveHideTraps={effectiveHideTraps}
          inspectedItem={inspectedItem}
          svgW={svgW}
          svgH={svgH}
          onHoverGpu={onHoverGpu}
          onToggleSelectGpu={onToggleSelectGpu}
        />
      )}
    </div>
  );
}
