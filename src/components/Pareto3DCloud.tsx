import React, { useEffect, useMemo, useRef, useState } from 'react';
import { METRIC_DEFINITIONS, MetricKey, RankedGpu } from '../lib/math/types';
import { ALL_METRIC_KEYS } from '../lib/math/topsis';
import { evaluateParetoFrontier } from '../lib/math/pareto';
import {
  ExtrapolationConfig,
  evaluateLinearExtrapolation,
} from '../lib/math/extrapolation';
import {
  RotateCcw,
  Move3d,
  EyeOff,
  Layers,
  ZoomIn,
  ZoomOut,
  Compass,
  Anchor,
} from 'lucide-react';

interface Pareto3DCloudProps {
  gpus: RankedGpu[];
  xMetric: MetricKey; // Base metric anchored at Bottom-Left (defaults to 'price' / Money $)
  yMetric: MetricKey;
  zMetric: MetricKey;
  extrapolation: ExtrapolationConfig;
  hoveredGpuId: string | null;
  selectedGpuIds: string[];
  isExpanded?: boolean;
  hideDominatedNodes?: boolean;
  showDominatedZoneMesh?: boolean;
  onToggleHideDominatedNodes?: () => void;
  onToggleDominatedZoneMesh?: () => void;
  onHoverGpu: (id: string | null) => void;
  onToggleSelectGpu: (id: string) => void;
  onChangeXMetric?: (m: MetricKey) => void;
  onChangeYMetric?: (m: MetricKey) => void;
  onChangeZMetric: (m: MetricKey) => void;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

type CameraPresetId = 'iso' | 'xy' | 'xz';

/**
 * Reoriented 3D Camera Presets:
 * - Origin (-1, -1, -1) = (Min Base $, Min Y, Min Z) is ALWAYS anchored at the Bottom-Left!
 * - In 'iso' (yaw: 25, pitch: 22):
 *   - Base X (Money $) starts at Bottom-Left and increases to the Right.
 *   - Spec Y (FPS) starts at Bottom-Left and increases Straight Up.
 *   - Spec Z (VRAM) starts at Bottom-Left and increases Up-and-Back.
 * - In 'xy' (yaw: 0, pitch: 0):
 *   - Base X (Money $) is at Bottom-Left -> Right; Spec Y is Bottom-Left -> Top.
 * - In 'xz' (yaw: 0, pitch: 90):
 *   - Base X (Money $) is STILL at Bottom-Left -> Right; Spec Z is Bottom-Left -> Top!
 */
const CAMERA_PRESETS: Array<{
  id: CameraPresetId;
  label: string;
  title: string;
  yaw: number;
  pitch: number;
}> = [
  {
    id: 'iso',
    label: '3D Cube (Base Bottom-Left)',
    title:
      'Reoriented 3D view with Base (Money $) anchored at the Front-Bottom-Left corner',
    yaw: 25,
    pitch: 22,
  },
  {
    id: 'xy',
    label: 'Base × Y',
    title:
      'Orthographic view: Base (Money $) on Bottom-Left → Right vs. Y-Axis on Bottom-Left → Top',
    yaw: 0,
    pitch: 0,
  },
  {
    id: 'xz',
    label: 'Base × Z',
    title:
      'Orthographic view: Base (Money $) on Bottom-Left → Right vs. Z-Axis on Bottom-Left → Top',
    yaw: 0,
    pitch: 90,
  },
];

export const Pareto3DCloud: React.FC<Pareto3DCloudProps> = ({
  gpus,
  xMetric,
  yMetric,
  zMetric,
  extrapolation,
  hoveredGpuId,
  selectedGpuIds,
  isExpanded = false,
  hideDominatedNodes = false,
  showDominatedZoneMesh = true,
  onToggleHideDominatedNodes,
  onToggleDominatedZoneMesh,
  onHoverGpu,
  onToggleSelectGpu,
  onChangeXMetric,
  onChangeYMetric,
  onChangeZMetric,
}) => {
  // Interactive camera rotation, zoom, pan, and preset state
  // Default yaw = 25, pitch = 22 places (-1, -1, -1) at the Front-Bottom-Left
  const [yaw, setYaw] = useState<number>(25);
  const [pitch, setPitch] = useState<number>(22);
  const [activePreset, setActivePreset] = useState<CameraPresetId | 'custom'>(
    'iso'
  );
  const [zoom, setZoom] = useState<number>(1.05);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const svgContainerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    mode: 'none' | 'orbit' | 'pan';
    startX: number;
    startY: number;
    startYaw: number;
    startPitch: number;
    startPanX: number;
    startPanY: number;
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startYaw: 25,
    startPitch: 22,
    startPanX: 0,
    startPanY: 0,
  });

  useEffect(() => {
    const el = svgContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      setZoom((prev) => Math.max(0.45, Math.min(4.5, prev * factor)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const xDef = METRIC_DEFINITIONS[xMetric];
  const yDef = METRIC_DEFINITIONS[yMetric];
  const zDef = METRIC_DEFINITIONS[zMetric];

  // Determine the active axes for the current camera view so points and unoptimized zones
  // are ALWAYS repainted accurately for what the user is actually looking at
  const viewAxes = useMemo<MetricKey[]>(() => {
    if (activePreset === 'xy') return Array.from(new Set([xMetric, yMetric]));
    if (activePreset === 'xz') return Array.from(new Set([xMetric, zMetric]));
    return Array.from(new Set([xMetric, yMetric, zMetric]));
  }, [activePreset, xMetric, yMetric, zMetric]);

  // Evaluate Pareto optimality specifically on `viewAxes` + Linear Extrapolation Margin
  const viewOptimalityMap = useMemo(() => {
    const evaluatedOnView = evaluateParetoFrontier(gpus, viewAxes);
    const sliceX = xMetric; // Base metric is always the horizontal reference!
    const sliceY = activePreset === 'xz' ? zMetric : yMetric;
    const extrapEval = extrapolation.enabled
      ? evaluateLinearExtrapolation(gpus, sliceX, sliceY, extrapolation)
      : null;
    const belowMarginSet = new Set(extrapEval?.belowMarginIds ?? []);

    const map = new Map<
      string,
      { isViewOptimal: boolean; isBelowMargin: boolean }
    >();
    for (const item of evaluatedOnView) {
      const isBelowMargin = belowMarginSet.has(item.id);
      const isViewOptimal =
        item.isParetoOptimal &&
        !(extrapolation.enabled && extrapolation.enforceAsTrap && isBelowMargin);
      map.set(item.id, { isViewOptimal, isBelowMargin });
    }
    return map;
  }, [gpus, viewAxes, activePreset, xMetric, yMetric, zMetric, extrapolation]);

  // Winner GPU among the cards that are optimal in the current view
  const winnerGpu = useMemo(
    () =>
      gpus.find((g) => viewOptimalityMap.get(g.id)?.isViewOptimal) ??
      gpus[0] ??
      null,
    [gpus, viewOptimalityMap]
  );

  // Compute padded min/max bounds so boundary GPUs (e.g. 8GB VRAM or $250 Price)
  // sit comfortably inside [-1, 1]^3 and always have visible step-walls to the cube edges!
  const bounds = useMemo(() => {
    const getRange = (key: MetricKey) => {
      if (gpus.length === 0) return { min: 0, max: 100 };
      const vals = gpus.map((g) => g[key]);
      const rawMin = Math.min(...vals);
      const rawMax = Math.max(...vals);
      const span = Math.max(1, rawMax - rawMin);
      const pad = span * 0.08;
      return {
        min: Math.max(0, Math.floor(rawMin - pad)),
        max: Math.ceil(rawMax + pad),
      };
    };
    return {
      x: getRange(xMetric),
      y: getRange(yMetric),
      z: getRange(zMetric),
    };
  }, [gpus, xMetric, yMetric, zMetric]);

  /**
   * Reoriented 3D Projection:
   * - Origin (-1, -1, -1) = (Min Base $, Min Y, Min Z) is at the Front-Bottom-Left.
   * - rx = nx * cosY + nz * sinY  (Base X goes Left -> Right; Z goes Back-Right when yaw > 0)
   * - rz = -nx * sinY + nz * cosY (Depth into screen: -1 is Front/closest, +1 is Back/furthest)
   * - ry = ny * cosP + rz * sinP  (Vertical height: both +ny and +rz go UP on screen!)
   * - depthIntoScreen = -ny * sinP + rz * cosP (+depthIntoScreen is further away from camera)
   */
  const projectPoint = useMemo(() => {
    const radYaw = (yaw * Math.PI) / 180;
    const radPitch = (pitch * Math.PI) / 180;
    const cosY = Math.cos(radYaw);
    const sinY = Math.sin(radYaw);
    const cosP = Math.cos(radPitch);
    const sinP = Math.sin(radPitch);

    const isOrtho = activePreset === 'xy' || activePreset === 'xz';

    return (nx: number, ny: number, nz: number) => {
      const rx = nx * cosY + nz * sinY;
      const rz = -nx * sinY + nz * cosY;
      const ry = ny * cosP + rz * sinP;
      const depthIntoScreen = -ny * sinP + rz * cosP;

      const scale = isOrtho
        ? (285 * zoom) / 3.25
        : (285 * zoom) / (3.45 + depthIntoScreen * 0.35);
      const screenX = 450 + pan.x + rx * scale;
      const screenY = 275 + pan.y - ry * scale;
      return { screenX, screenY, depthIntoScreen, scale };
    };
  }, [yaw, pitch, zoom, pan, activePreset]);

  // Cube wireframe corners & floor grid
  const cubeLines = useMemo(() => {
    const corners: [number, number, number][] = [
      [-1, -1, -1], // 0: Origin (Front-Bottom-Left: Min Base $, Min Y, Min Z)
      [1, -1, -1], // 1: Front-Bottom-Right (Max Base $)
      [1, -1, 1], // 2: Back-Bottom-Right
      [-1, -1, 1], // 3: Back-Bottom-Left (Max Z)
      [-1, 1, -1], // 4: Front-Top-Left (Max Y)
      [1, 1, -1], // 5: Front-Top-Right
      [1, 1, 1], // 6: Back-Top-Right
      [-1, 1, 1], // 7: Back-Top-Left
    ];
    const edges: Array<{
      a: number;
      b: number;
      role: 'x-base' | 'y-axis' | 'z-axis' | 'frame';
    }> = [
      { a: 0, b: 1, role: 'x-base' }, // Bottom-Left -> Bottom-Right (Base Money Axis)
      { a: 0, b: 4, role: 'y-axis' }, // Bottom-Left -> Top-Left (Y Spec Axis)
      { a: 0, b: 3, role: 'z-axis' }, // Bottom-Left -> Back-Left (Z Spec Axis)
      { a: 1, b: 2, role: 'frame' },
      { a: 2, b: 3, role: 'frame' },
      { a: 4, b: 5, role: 'frame' },
      { a: 5, b: 6, role: 'frame' },
      { a: 6, b: 7, role: 'frame' },
      { a: 7, b: 4, role: 'frame' },
      { a: 1, b: 5, role: 'frame' },
      { a: 2, b: 6, role: 'frame' },
      { a: 3, b: 7, role: 'frame' },
    ];
    return edges.map(({ a, b, role }, idx) => {
      const p1 = projectPoint(...corners[a]);
      const p2 = projectPoint(...corners[b]);
      return { id: idx, p1, p2, role };
    });
  }, [projectPoint]);

  const normalizeVal = (val: number, min: number, max: number) =>
    ((val - min) / (max - min)) * 2 - 1;

  /**
   * Exact-Coordinate 3D Staircase Polyhedron (Tensor-Product Grid):
   * Instead of a uniform voxel grid that misses the GPU coordinates and leaves gaps,
   * we construct the 3D grid directly from the EXACT (g.nx, g.ny, g.nz) coordinates of
   * every view-optimal GPU!
   * Result: Every green ball sits DIRECTLY ON THE EXACT CORNER VERTEX of its 3D step
   * with zero gap and zero protrusion!
   */
  const mergedDominatedBoundary = useMemo(() => {
    if (!showDominatedZoneMesh || gpus.length === 0) {
      return { fillFaces: [], cornerTicks: [] };
    }

    const optimalGpus = gpus
      .filter((g) => viewOptimalityMap.get(g.id)?.isViewOptimal)
      .map((gpu) => ({
        id: gpu.id,
        nx: normalizeVal(gpu[xMetric], bounds.x.min, bounds.x.max),
        ny: normalizeVal(gpu[yMetric], bounds.y.min, bounds.y.max),
        nz: normalizeVal(gpu[zMetric], bounds.z.min, bounds.z.max),
      }));

    const xMinDir = xDef.direction === 'min';
    const yMaxDir = yDef.direction === 'max';
    const zMaxDir = zDef.direction === 'max';

    const useX = true;
    const useY = activePreset !== 'xz';
    const useZ = activePreset !== 'xy';

    const uniqueSorted = (vals: number[]) => {
      const sorted = [...vals].sort((a, b) => a - b);
      const out: number[] = [];
      for (const v of sorted) {
        if (out.length === 0 || Math.abs(v - out[out.length - 1]) > 1e-4) {
          out.push(v);
        }
      }
      return out;
    };

    const xCoords = uniqueSorted([-1, 1, ...optimalGpus.map((g) => g.nx)]);
    const yCoords = uniqueSorted([-1, 1, ...optimalGpus.map((g) => g.ny)]);
    const zCoords = uniqueSorted([-1, 1, ...optimalGpus.map((g) => g.nz)]);

    const NX = xCoords.length - 1;
    const NY = yCoords.length - 1;
    const NZ = zCoords.length - 1;

    // Because every optimal GPU coordinate is an exact grid plane in xCoords x yCoords x zCoords,
    // each cell [x0, x1] x [y0, y1] x [z0, z1] is either 100% dominated or 0% dominated!
    const isDom: boolean[][][] = Array.from({ length: NX }, (_, ix) => {
      const cx = (xCoords[ix] + xCoords[ix + 1]) / 2;
      return Array.from({ length: NY }, (__, iy) => {
        const cy = (yCoords[iy] + yCoords[iy + 1]) / 2;
        return Array.from({ length: NZ }, (___, iz) => {
          const cz = (zCoords[iz] + zCoords[iz + 1]) / 2;

          for (const g of optimalGpus) {
            const domX = !useX
              ? true
              : xMinDir
              ? cx > g.nx
              : cx < g.nx;
            if (!domX) continue;

            const domY = !useY
              ? true
              : yMaxDir
              ? cy < g.ny
              : cy > g.ny;
            if (!domY) continue;

            const domZ = !useZ
              ? true
              : zMaxDir
              ? cz < g.nz
              : cz > g.nz;
            if (domZ) return true;
          }
          return false;
        });
      });
    });

    const isOccupied = (ix: number, iy: number, iz: number): boolean => {
      if (ix < 0 || ix >= NX || iy < 0 || iy >= NY || iz < 0 || iz >= NZ) {
        return false;
      }
      return isDom[ix][iy][iz];
    };

    const rawFaces: Array<{
      quad: [Vec3, Vec3, Vec3, Vec3];
      isFrontierInterface: boolean;
    }> = [];

    for (let ix = 0; ix < NX; ix++) {
      const x0 = xCoords[ix];
      const x1 = xCoords[ix + 1];
      for (let iy = 0; iy < NY; iy++) {
        const y0 = yCoords[iy];
        const y1 = yCoords[iy + 1];
        for (let iz = 0; iz < NZ; iz++) {
          if (!isDom[ix][iy][iz]) continue;
          const z0 = zCoords[iz];
          const z1 = zCoords[iz + 1];

          if (!isOccupied(ix - 1, iy, iz)) {
            rawFaces.push({
              quad: [
                { x: x0, y: y0, z: z0 },
                { x: x0, y: y1, z: z0 },
                { x: x0, y: y1, z: z1 },
                { x: x0, y: y0, z: z1 },
              ],
              isFrontierInterface: ix > 0,
            });
          }
          if (!isOccupied(ix + 1, iy, iz)) {
            rawFaces.push({
              quad: [
                { x: x1, y: y0, z: z0 },
                { x: x1, y: y1, z: z0 },
                { x: x1, y: y1, z: z1 },
                { x: x1, y: y0, z: z1 },
              ],
              isFrontierInterface: ix < NX - 1,
            });
          }
          if (!isOccupied(ix, iy - 1, iz)) {
            rawFaces.push({
              quad: [
                { x: x0, y: y0, z: z0 },
                { x: x1, y: y0, z: z0 },
                { x: x1, y: y0, z: z1 },
                { x: x0, y: y0, z: z1 },
              ],
              isFrontierInterface: iy > 0,
            });
          }
          if (!isOccupied(ix, iy + 1, iz)) {
            rawFaces.push({
              quad: [
                { x: x0, y: y1, z: z0 },
                { x: x1, y: y1, z: z0 },
                { x: x1, y: y1, z: z1 },
                { x: x0, y: y1, z: z1 },
              ],
              isFrontierInterface: iy < NY - 1,
            });
          }
          if (!isOccupied(ix, iy, iz - 1)) {
            rawFaces.push({
              quad: [
                { x: x0, y: y0, z: z0 },
                { x: x1, y: y0, z: z0 },
                { x: x1, y: y1, z: z0 },
                { x: x0, y: y1, z: z0 },
              ],
              isFrontierInterface: iz > 0,
            });
          }
          if (!isOccupied(ix, iy, iz + 1)) {
            rawFaces.push({
              quad: [
                { x: x0, y: y0, z: z1 },
                { x: x1, y: y0, z: z1 },
                { x: x1, y: y1, z: z1 },
                { x: x0, y: y1, z: z1 },
              ],
              isFrontierInterface: iz < NZ - 1,
            });
          }
        }
      }
    }

    const fillFaces = rawFaces
      .map((f, idx) => {
        const proj = f.quad.map((v) => projectPoint(v.x, v.y, v.z));
        const depthIntoScreen =
          (proj[0].depthIntoScreen +
            proj[1].depthIntoScreen +
            proj[2].depthIntoScreen +
            proj[3].depthIntoScreen) /
          4;
        return {
          id: `uface-${idx}`,
          points: proj.map((p) => `${p.screenX},${p.screenY}`).join(' '),
          depthIntoScreen,
          isFrontierInterface: f.isFrontierInterface,
        };
      })
      .sort((a, b) => b.depthIntoScreen - a.depthIntoScreen);

    // Build 3D Corner Step-Ticks directly from each optimal GPU's exact corner vertex
    const dxTick = xMinDir ? 0.22 : -0.22;
    const dyTick = yMaxDir ? -0.22 : 0.22;
    const dzTick = zMaxDir ? -0.22 : 0.22;

    const cornerTicks = optimalGpus.map((g) => {
      const origin = projectPoint(g.nx, g.ny, g.nz);
      const tx = projectPoint(
        Math.max(-1, Math.min(1, g.nx + dxTick)),
        g.ny,
        g.nz
      );
      const ty = projectPoint(
        g.nx,
        Math.max(-1, Math.min(1, g.ny + dyTick)),
        g.nz
      );
      const tz = projectPoint(
        g.nx,
        g.ny,
        Math.max(-1, Math.min(1, g.nz + dzTick))
      );
      return { id: g.id, origin, tx, ty, tz };
    });

    return { fillFaces, cornerTicks };
  }, [
    gpus,
    viewOptimalityMap,
    xMetric,
    yMetric,
    zMetric,
    bounds,
    xDef.direction,
    yDef.direction,
    zDef.direction,
    activePreset,
    projectPoint,
    showDominatedZoneMesh,
  ]);

  // Project and sort GPUs from back (largest depthIntoScreen) to front (smallest depthIntoScreen)
  const projectedGpus = useMemo(() => {
    const visibleGpus = hideDominatedNodes
      ? gpus.filter((g) => viewOptimalityMap.get(g.id)?.isViewOptimal)
      : gpus;

    return visibleGpus
      .map((gpu) => {
        const nx = normalizeVal(gpu[xMetric], bounds.x.min, bounds.x.max);
        const ny = normalizeVal(gpu[yMetric], bounds.y.min, bounds.y.max);
        const nz = normalizeVal(gpu[zMetric], bounds.z.min, bounds.z.max);

        const pos = projectPoint(nx, ny, nz);
        const floorPos = projectPoint(nx, -1, nz);
        const viewStatus = viewOptimalityMap.get(gpu.id) ?? {
          isViewOptimal: gpu.isParetoOptimal,
          isBelowMargin: false,
        };

        return {
          gpu,
          pos,
          floorPos,
          isViewOptimal: viewStatus.isViewOptimal,
          isBelowMargin: viewStatus.isBelowMargin,
        };
      })
      .sort((a, b) => b.pos.depthIntoScreen - a.pos.depthIntoScreen);
  }, [
    gpus,
    hideDominatedNodes,
    viewOptimalityMap,
    xMetric,
    yMetric,
    zMetric,
    bounds,
    projectPoint,
  ]);

  const axisLabels = useMemo(() => {
    const bestX = xDef.direction === 'min' ? -1 : 1;
    const bestY = yDef.direction === 'max' ? 1 : -1;
    const bestZ = zDef.direction === 'max' ? 1 : -1;
    return {
      origin: projectPoint(-1, -1, -1), // Front-Bottom-Left Anchor (Min Base $)
      xEnd: projectPoint(1.12, -1, -1), // Bottom-Right (Max Base $)
      yEnd: projectPoint(-1, 1.14, -1), // Top-Left (Max Y)
      zEnd: projectPoint(-1, -1, 1.14), // Back-Left (Max Z)
      utopia: projectPoint(bestX, bestY, bestZ),
      antiUtopia: projectPoint(-bestX, -bestY, -bestZ),
    };
  }, [projectPoint, xDef.direction, yDef.direction, zDef.direction]);

  const handleApplyCameraPreset = (presetId: CameraPresetId) => {
    const found = CAMERA_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePreset(presetId);
    setYaw(found.yaw);
    setPitch(found.pitch);
    setPan({ x: 0, y: 0 });
  };

  // Helper to inspect ANY axis directly with Base (Money $) anchored at Bottom-Left
  const handleInspectAxisAgainstBase = (targetMetric: MetricKey) => {
    if (targetMetric === yMetric) {
      handleApplyCameraPreset('xy');
    } else if (targetMetric === zMetric) {
      handleApplyCameraPreset('xz');
    } else {
      onChangeZMetric(targetMetric);
      handleApplyCameraPreset('xz');
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const isPan = e.shiftKey || e.button === 1 || e.button === 2;
    dragRef.current = {
      mode: isPan ? 'pan' : 'orbit',
      startX: e.clientX,
      startY: e.clientY,
      startYaw: yaw,
      startPitch: pitch,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current.mode === 'none') return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (dragRef.current.mode === 'pan') {
      setPan({
        x: dragRef.current.startPanX + dx,
        y: dragRef.current.startPanY + dy,
      });
    } else {
      setActivePreset('custom');
      setYaw(dragRef.current.startYaw - dx * 0.45);
      setPitch(
        Math.max(-89, Math.min(89, dragRef.current.startPitch + dy * 0.35))
      );
    }
  };

  const handleMouseUp = () => {
    dragRef.current.mode = 'none';
  };

  const viewOptimalCount = useMemo(
    () =>
      gpus.filter((g) => viewOptimalityMap.get(g.id)?.isViewOptimal).length,
    [gpus, viewOptimalityMap]
  );

  const fmtVal = (def: typeof xDef, val: number) =>
    def.unit === '$' ? `$${Math.round(val)}` : `${Math.round(val)} ${def.unit}`;

  return (
    <div
      ref={svgContainerRef}
      className={`w-full ${
        isExpanded ? 'h-[82vh] min-h-[660px]' : 'h-[520px]'
      } relative select-none overflow-hidden rounded-xl bg-slate-950/50`}
    >
      {/* Top 3D Controls & Base-Anchored Axis Switcher */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Reoriented Camera Presets (Base Money $ ALWAYS at Bottom-Left) */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/90 p-1 text-xs backdrop-blur">
            <span className="px-2 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Compass className="h-3.5 w-3.5 text-emerald-400" />
              View (Base Bottom-Left):
            </span>
            <button
              type="button"
              onClick={() => handleApplyCameraPreset('iso')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                activePreset === 'iso'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="3D Cube with Base (Money $) anchored at the Front-Bottom-Left"
            >
              3D Cube
            </button>
            <button
              type="button"
              onClick={() => handleApplyCameraPreset('xy')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                activePreset === 'xy'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={`Base (${xDef.shortLabel}) at Bottom-Left → Right vs. ${yDef.shortLabel} Bottom-Left → Top`}
            >
              {xDef.shortLabel} × {yDef.shortLabel}
            </button>
            <button
              type="button"
              onClick={() => handleApplyCameraPreset('xz')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                activePreset === 'xz'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={`Base (${xDef.shortLabel}) at Bottom-Left → Right vs. ${zDef.shortLabel} Bottom-Left → Top`}
            >
              {xDef.shortLabel} × {zDef.shortLabel}
            </button>

            {/* Quick buttons for remaining specs so user can check ANY axis with Base Money on Bottom-Left */}
            {ALL_METRIC_KEYS.filter(
              (k) => k !== xMetric && k !== yMetric && k !== zMetric
            ).map((otherKey) => (
              <button
                key={otherKey}
                type="button"
                onClick={() => handleInspectAxisAgainstBase(otherKey)}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-amber-300 transition"
                title={`Switch Z-Axis to ${METRIC_DEFINITIONS[otherKey].shortLabel} and view with ${xDef.shortLabel} at Bottom-Left`}
              >
                {xDef.shortLabel} × {METRIC_DEFINITIONS[otherKey].shortLabel}
              </button>
            ))}
          </div>

          {/* Right: Zoom, Volume Toggle, Trap Toggle & Reset */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
            <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950/90 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.45, z * 0.85))}
                className="p-1 text-slate-300 hover:text-white transition"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[11px] text-emerald-400">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4.5, z * 1.18))}
                className="p-1 text-slate-300 hover:text-white transition"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {onToggleDominatedZoneMesh && (
              <button
                type="button"
                onClick={onToggleDominatedZoneMesh}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  showDominatedZoneMesh
                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                    : 'border-slate-800 bg-slate-950/90 text-slate-400 hover:text-white'
                }`}
                title="Toggle the unified, merged 3D dominated region hull"
              >
                <Layers className="h-3.5 w-3.5" />
                {showDominatedZoneMesh ? 'Unoptimized Zone: ON' : 'Zone: OFF'}
              </button>
            )}

            {onToggleHideDominatedNodes && (
              <button
                type="button"
                onClick={onToggleHideDominatedNodes}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  hideDominatedNodes
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-800 bg-slate-950/90 text-slate-400 hover:text-white'
                }`}
                title="Make dominated trap points disappear from the chart"
              >
                <EyeOff className="h-3.5 w-3.5" />
                {hideDominatedNodes ? 'Traps Hidden' : 'Hide Traps'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                handleApplyCameraPreset('iso');
                setZoom(1.05);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/90 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700 hover:text-white transition"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>

        {/* Sub-bar: Personalizable Base Axis (Bottom-Left) + Y-Axis + Z-Axis selectors */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 px-1">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-md border border-slate-800/80 bg-slate-950/85 px-2.5 py-1">
            <Anchor className="h-3 w-3 text-emerald-400" />
            <span>Base (Bottom-Left):</span>
            {onChangeXMetric ? (
              <select
                aria-label="Base Bottom-Left Axis Metric"
                value={xMetric}
                onChange={(e) => onChangeXMetric(e.target.value as MetricKey)}
                className="bg-transparent font-bold text-emerald-400 focus:outline-none cursor-pointer"
              >
                {ALL_METRIC_KEYS.map((k) => (
                  <option
                    key={k}
                    value={k}
                    className="bg-slate-900 text-slate-100"
                  >
                    {METRIC_DEFINITIONS[k].shortLabel} (
                    {METRIC_DEFINITIONS[k].unit})
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-bold text-emerald-400">
                {xDef.shortLabel}
              </span>
            )}

            <span className="text-slate-600">|</span>
            <span>Y-Vertical:</span>
            {onChangeYMetric ? (
              <select
                aria-label="Y-Vertical Axis Metric"
                value={yMetric}
                onChange={(e) => onChangeYMetric(e.target.value as MetricKey)}
                className="bg-transparent font-semibold text-sky-400 focus:outline-none cursor-pointer"
              >
                {ALL_METRIC_KEYS.map((k) => (
                  <option
                    key={k}
                    value={k}
                    className="bg-slate-900 text-slate-100"
                  >
                    {METRIC_DEFINITIONS[k].shortLabel}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-sky-400">
                {yDef.shortLabel}
              </span>
            )}

            <span className="text-slate-600">|</span>
            <Move3d className="h-3 w-3 text-purple-400" />
            <span>Z-Depth:</span>
            <select
              aria-label="Z-Axis Metric"
              value={zMetric}
              onChange={(e) => onChangeZMetric(e.target.value as MetricKey)}
              className="bg-transparent font-semibold text-purple-400 focus:outline-none cursor-pointer"
            >
              {ALL_METRIC_KEYS.map((k) => (
                <option
                  key={k}
                  value={k}
                  className="bg-slate-900 text-slate-100"
                >
                  {METRIC_DEFINITIONS[k].shortLabel}
                </option>
              ))}
            </select>

            <span className="text-slate-600">|</span>
            <span className="text-emerald-300 font-medium">
              {viewAxes.map((a) => METRIC_DEFINITIONS[a].shortLabel).join(' × ')}{' '}
              ({viewOptimalCount} Optimal)
            </span>
          </div>
          <span className="hidden sm:inline rounded bg-slate-950/70 px-2 py-0.5 text-slate-500">
            Drag: Orbit • Scroll: Zoom • Shift+Drag: Pan
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 900 520"
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <radialGradient id="winnerGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
          <radialGradient id="optimalGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="60%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </radialGradient>
          <radialGradient id="trapGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fda4af" />
            <stop offset="60%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#881337" />
          </radialGradient>
        </defs>

        {/* 3D Bounding Cube Edges with Colored Base/Y/Z Primary Axes */}
        {cubeLines.map((edge) => {
          const stroke =
            edge.role === 'x-base'
              ? '#10b981'
              : edge.role === 'y-axis'
              ? '#38bdf8'
              : edge.role === 'z-axis'
              ? '#c084fc'
              : '#1e293b';
          const width = edge.role === 'frame' ? 1 : 2.2;
          return (
            <line
              key={edge.id}
              x1={edge.p1.screenX}
              y1={edge.p1.screenY}
              x2={edge.p2.screenX}
              y2={edge.p2.screenY}
              stroke={stroke}
              strokeWidth={width}
              strokeDasharray={edge.role === 'frame' ? '4 4' : undefined}
            />
          );
        })}

        {/* Exact-Coordinate 3D Staircase Polyhedron & Step-Corner Vertex Ticks */}
        {showDominatedZoneMesh && (
          <g pointerEvents="none">
            <g opacity={0.28}>
              {mergedDominatedBoundary.fillFaces.map((face) => {
                const color = face.isFrontierInterface ? '#fb7185' : '#be123c';
                return (
                  <polygon
                    key={face.id}
                    points={face.points}
                    fill={color}
                    stroke={face.isFrontierInterface ? '#fda4af' : color}
                    strokeWidth={face.isFrontierInterface ? 0.9 : 0.4}
                    strokeLinejoin="round"
                  />
                );
              })}
            </g>
            {/* Crisp orthogonal corner ticks showing each green sphere sitting right on its 3D step vertex */}
            <g opacity={0.75}>
              {mergedDominatedBoundary.cornerTicks.map((ct) => (
                <g key={`ct-${ct.id}`}>
                  <line
                    x1={ct.origin.screenX}
                    y1={ct.origin.screenY}
                    x2={ct.tx.screenX}
                    y2={ct.tx.screenY}
                    stroke="#34d399"
                    strokeWidth={1.6}
                  />
                  <line
                    x1={ct.origin.screenX}
                    y1={ct.origin.screenY}
                    x2={ct.ty.screenX}
                    y2={ct.ty.screenY}
                    stroke="#38bdf8"
                    strokeWidth={1.6}
                  />
                  <line
                    x1={ct.origin.screenX}
                    y1={ct.origin.screenY}
                    x2={ct.tz.screenX}
                    y2={ct.tz.screenY}
                    stroke="#c084fc"
                    strokeWidth={1.6}
                  />
                </g>
              ))}
            </g>
          </g>
        )}

        {/* Bottom-Left Origin Anchor Badge & Utopia/Dominated Markers */}
        <g pointerEvents="none">
          {/* Bottom-Left Origin Marker (-1, -1, -1) */}
          <circle
            cx={axisLabels.origin.screenX}
            cy={axisLabels.origin.screenY}
            r={5}
            fill="#10b981"
            stroke="#022c22"
            strokeWidth={1.5}
          />
          <text
            x={axisLabels.origin.screenX}
            y={axisLabels.origin.screenY + 16}
            fill="#6ee7b7"
            fontSize="10.5"
            fontWeight="700"
            textAnchor="middle"
          >
            Origin (Bottom-Left): {fmtVal(xDef, bounds.x.min)}
          </text>

          <circle
            cx={axisLabels.utopia.screenX}
            cy={axisLabels.utopia.screenY}
            r={4}
            fill="#10b981"
          />
          <text
            x={axisLabels.utopia.screenX}
            y={axisLabels.utopia.screenY - 8}
            fill="#34d399"
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
          >
            Ideal Benchmark Target
          </text>

          <circle
            cx={axisLabels.antiUtopia.screenX}
            cy={axisLabels.antiUtopia.screenY}
            r={4}
            fill="#f43f5e"
          />
          <text
            x={axisLabels.antiUtopia.screenX}
            y={axisLabels.antiUtopia.screenY + 14}
            fill="#fb7185"
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
          >
            ▲ Unoptimized / Dominated Zone
          </text>
        </g>

        {/* Axis Endpoint Labels */}
        <text
          x={axisLabels.xEnd.screenX}
          y={axisLabels.xEnd.screenY + 4}
          fill="#34d399"
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
        >
          Base X: {xDef.shortLabel} → {fmtVal(xDef, bounds.x.max)} [
          {xDef.direction.toUpperCase()}]
        </text>
        {activePreset !== 'xz' && (
          <text
            x={axisLabels.yEnd.screenX}
            y={axisLabels.yEnd.screenY - 4}
            fill="#38bdf8"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
          >
            ↑ Y: {yDef.shortLabel} ({fmtVal(yDef, bounds.y.min)} →{' '}
            {fmtVal(yDef, bounds.y.max)})
          </text>
        )}
        {activePreset !== 'xy' && (
          <text
            x={axisLabels.zEnd.screenX}
            y={axisLabels.zEnd.screenY - 4}
            fill="#c084fc"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
          >
            ↗ Z: {zDef.shortLabel} ({fmtVal(zDef, bounds.z.min)} →{' '}
            {fmtVal(zDef, bounds.z.max)})
          </text>
        )}

        {/* Vertical Floor Drop-Stems & 3D Spheres */}
        {projectedGpus.map(({ gpu, pos, floorPos, isViewOptimal }) => {
          const isWinner = gpu.id === winnerGpu?.id;
          const isHovered = gpu.id === hoveredGpuId;
          const isSelected = selectedGpuIds.includes(gpu.id);
          const radius =
            Math.max(5.5, gpu.vramGb * 0.48) *
              Math.min(1.8, Math.max(0.7, pos.scale / 85)) +
            (isWinner ? 3 : 0) +
            (isHovered || isSelected ? 2.5 : 0);

          const fillUrl = isWinner
            ? 'url(#winnerGrad)'
            : isViewOptimal
            ? 'url(#optimalGrad)'
            : 'url(#trapGrad)';

          const strokeColor = isWinner
            ? '#fef08a'
            : isHovered || isSelected
            ? '#ffffff'
            : isViewOptimal
            ? '#34d399'
            : '#fb7185';

          return (
            <g
              key={gpu.id}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => onHoverGpu(gpu.id)}
              onMouseLeave={() => onHoverGpu(null)}
              onClick={() => onToggleSelectGpu(gpu.id)}
            >
              {/* Floor Shadow / Drop Line */}
              <line
                x1={floorPos.screenX}
                y1={floorPos.screenY}
                x2={pos.screenX}
                y2={pos.screenY}
                stroke={
                  isWinner
                    ? 'rgba(245, 158, 11, 0.55)'
                    : isViewOptimal
                    ? 'rgba(16, 185, 129, 0.35)'
                    : 'rgba(244, 63, 94, 0.22)'
                }
                strokeWidth={isHovered || isWinner ? 1.8 : 0.9}
                strokeDasharray="2 2"
              />
              <ellipse
                cx={floorPos.screenX}
                cy={floorPos.screenY}
                rx={3}
                ry={1.5}
                fill={
                  isWinner
                    ? '#f59e0b'
                    : isViewOptimal
                    ? '#10b981'
                    : '#f43f5e'
                }
                opacity={0.4}
              />

              {/* 3D Node Sphere */}
              <circle
                cx={pos.screenX}
                cy={pos.screenY}
                r={radius}
                fill={fillUrl}
                stroke={strokeColor}
                strokeWidth={isHovered || isSelected || isWinner ? 2.2 : 1}
                opacity={!isViewOptimal && !isHovered && !isSelected ? 0.65 : 1}
              />

              {/* Node Label */}
              <text
                x={pos.screenX}
                y={pos.screenY - radius - 5}
                fill={
                  isWinner
                    ? '#fbbf24'
                    : isViewOptimal
                    ? '#f1f5f9'
                    : '#94a3b8'
                }
                fontSize={isWinner || isHovered ? '11.5' : '9.5'}
                fontWeight={isWinner || isViewOptimal ? '700' : '500'}
                textAnchor="middle"
              >
                {gpu.name.replace(' [TRAP]', '')}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
