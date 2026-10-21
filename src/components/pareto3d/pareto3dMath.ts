// @ts-check
import { MetricKey, RankedGpu, MetricDefinition } from '../../lib/math/types';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type CameraPresetId = 'iso' | 'xy' | 'xz';

export interface ProjectedPoint {
  screenX: number;
  screenY: number;
  depthIntoScreen: number;
  scale: number;
}

export const CAMERA_PRESETS: Array<{
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

export function computeBounds(
  gpus: RankedGpu[],
  xMetric: MetricKey,
  yMetric: MetricKey,
  zMetric: MetricKey,
) {
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
}

export function normalizeVal(val: number, min: number, max: number): number {
  if (max <= min) return 0;
  return ((val - min) / (max - min)) * 2 - 1;
}

export function createProjectPoint(
  yaw: number,
  pitch: number,
  zoom: number,
  pan: { x: number; y: number },
  isOrtho: boolean,
): (nx: number, ny: number, nz: number) => ProjectedPoint {
  const radYaw = (yaw * Math.PI) / 180;
  const radPitch = (pitch * Math.PI) / 180;
  const cosY = Math.cos(radYaw);
  const sinY = Math.sin(radYaw);
  const cosP = Math.cos(radPitch);
  const sinP = Math.sin(radPitch);

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
}

export function computeCubeLines(
  projectPoint: (nx: number, ny: number, nz: number) => ProjectedPoint,
) {
  const corners: [number, number, number][] = [
    [-1, -1, -1],
    [1, -1, -1],
    [1, -1, 1],
    [-1, -1, 1],
    [-1, 1, -1],
    [1, 1, -1],
    [1, 1, 1],
    [-1, 1, 1],
  ];
  const edges: Array<{
    a: number;
    b: number;
    role: 'x-base' | 'y-axis' | 'z-axis' | 'frame';
  }> = [
    { a: 0, b: 1, role: 'x-base' },
    { a: 0, b: 4, role: 'y-axis' },
    { a: 0, b: 3, role: 'z-axis' },
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
}

export interface RawDominatedFace {
  quad: [Vec3, Vec3, Vec3, Vec3];
  isFrontierInterface: boolean;
}

export interface DominatedCornerTickCoords {
  id: string;
  origin: Vec3;
  tx: Vec3;
  ty: Vec3;
  tz: Vec3;
}

export interface DominatedMeshGeometry {
  rawFaces: RawDominatedFace[];
  cornerTicks: DominatedCornerTickCoords[];
}

export interface DominatedGeometryOptions {
  gpus: RankedGpu[];
  viewOptimalityMap: Map<
    string,
    { isViewOptimal: boolean; isBelowMargin: boolean }
  >;
  xMetric: MetricKey;
  yMetric: MetricKey;
  zMetric: MetricKey;
  bounds: ReturnType<typeof computeBounds>;
  xDef: MetricDefinition;
  yDef: MetricDefinition;
  zDef: MetricDefinition;
  activePreset: CameraPresetId | 'custom';
  showDominatedZoneMesh: boolean;
}

export interface DominatedBoundaryOptions extends DominatedGeometryOptions {
  projectPoint: (nx: number, ny: number, nz: number) => ProjectedPoint;
}

/**
 * Computes 3D voxel grid and unprojected boundary face geometry in normalized space [-1, 1].
 * Memoized per data and active metrics, independent of camera rotation/pan/zoom (PERF-06).
 */
export function computeDominatedGeometry({
  gpus,
  viewOptimalityMap,
  xMetric,
  yMetric,
  zMetric,
  bounds,
  xDef,
  yDef,
  zDef,
  activePreset,
  showDominatedZoneMesh,
}: DominatedGeometryOptions): DominatedMeshGeometry {
  if (!showDominatedZoneMesh || gpus.length === 0) {
    return { rawFaces: [], cornerTicks: [] };
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

  const isDom: boolean[][][] = Array.from({ length: NX }, (_, ix) => {
    const cx = (xCoords[ix] + xCoords[ix + 1]) / 2;
    return Array.from({ length: NY }, (__, iy) => {
      const cy = (yCoords[iy] + yCoords[iy + 1]) / 2;
      return Array.from({ length: NZ }, (___, iz) => {
        const cz = (zCoords[iz] + zCoords[iz + 1]) / 2;

        for (const g of optimalGpus) {
          const domX = !useX ? true : xMinDir ? cx > g.nx : cx < g.nx;
          if (!domX) continue;

          const domY = !useY ? true : yMaxDir ? cy < g.ny : cy > g.ny;
          if (!domY) continue;

          const domZ = !useZ ? true : zMaxDir ? cz < g.nz : cz > g.nz;
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

  const dxTick = xMinDir ? 0.22 : -0.22;
  const dyTick = yMaxDir ? -0.22 : 0.22;
  const dzTick = zMaxDir ? -0.22 : 0.22;

  const cornerTicks: DominatedCornerTickCoords[] = optimalGpus.map((g) => ({
    id: g.id,
    origin: { x: g.nx, y: g.ny, z: g.nz },
    tx: { x: Math.max(-1, Math.min(1, g.nx + dxTick)), y: g.ny, z: g.nz },
    ty: { x: g.nx, y: Math.max(-1, Math.min(1, g.ny + dyTick)), z: g.nz },
    tz: { x: g.nx, y: g.ny, z: Math.max(-1, Math.min(1, g.nz + dzTick)) },
  }));

  return { rawFaces, cornerTicks };
}

/**
 * Projects precomputed 3D dominated boundary faces and ticks to screen coordinates.
 * High-frequency projection executed during camera yaw/pitch/pan/zoom (PERF-06).
 */
export function projectDominatedBoundary(
  geometry: DominatedMeshGeometry,
  projectPoint: (nx: number, ny: number, nz: number) => ProjectedPoint,
) {
  const fillFaces = geometry.rawFaces
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

  const cornerTicks = geometry.cornerTicks.map((ct) => ({
    id: ct.id,
    origin: projectPoint(ct.origin.x, ct.origin.y, ct.origin.z),
    tx: projectPoint(ct.tx.x, ct.tx.y, ct.tx.z),
    ty: projectPoint(ct.ty.x, ct.ty.y, ct.ty.z),
    tz: projectPoint(ct.tz.x, ct.tz.y, ct.tz.z),
  }));

  return { fillFaces, cornerTicks };
}

export function computeDominatedBoundary(options: DominatedBoundaryOptions) {
  const geometry = computeDominatedGeometry(options);
  return projectDominatedBoundary(geometry, options.projectPoint);
}
