import { RankedGpu } from '../../lib/math/types';

export type HyperDimKey =
  | 'price'
  | 'rasterFps1440p'
  | 'rtFps1440p'
  | 'vramGb'
  | 'tdpWatts'
  | 'fpsPerDollar'
  | 'fpsPerWatt';

export function mapHyperDims<T>(
  init: (key: HyperDimKey) => T,
): Record<HyperDimKey, T> {
  return {
    price: init('price'),
    rasterFps1440p: init('rasterFps1440p'),
    rtFps1440p: init('rtFps1440p'),
    vramGb: init('vramGb'),
    tdpWatts: init('tdpWatts'),
    fpsPerDollar: init('fpsPerDollar'),
    fpsPerWatt: init('fpsPerWatt'),
  };
}

export interface HyperDimDefinition {
  key: HyperDimKey;
  label: string;
  shortLabel: string;
  unit: string;
  direction: 'min' | 'max';
  color: string;
  getValue: (gpu: RankedGpu) => number;
  formatValue: (val: number) => string;
}

export const HYPER_DIMENSIONS: HyperDimDefinition[] = [
  {
    key: 'price',
    label: 'Lower Price ($)',
    shortLabel: 'Price ($)',
    unit: '$',
    direction: 'min',
    color: '#10b981',
    getValue: (g) => g.price,
    formatValue: (v) => `$${Math.round(v)}`,
  },
  {
    key: 'rasterFps1440p',
    label: '1440p Raster FPS',
    shortLabel: '1440p FPS',
    unit: 'FPS',
    direction: 'max',
    color: '#38bdf8',
    getValue: (g) => g.rasterFps1440p,
    formatValue: (v) => `${Math.round(v)} FPS`,
  },
  {
    key: 'rtFps1440p',
    label: '1440p Ray Tracing',
    shortLabel: 'Ray Tracing',
    unit: 'FPS',
    direction: 'max',
    color: '#a855f7',
    getValue: (g) => g.rtFps1440p,
    formatValue: (v) => `${Math.round(v)} FPS`,
  },
  {
    key: 'vramGb',
    label: 'VRAM Capacity',
    shortLabel: 'VRAM (GB)',
    unit: 'GB',
    direction: 'max',
    color: '#f59e0b',
    getValue: (g) => g.vramGb,
    formatValue: (v) => `${Math.round(v)} GB`,
  },
  {
    key: 'tdpWatts',
    label: 'Low Power Draw',
    shortLabel: 'Power (W)',
    unit: 'W',
    direction: 'min',
    color: '#2dd4bf',
    getValue: (g) => g.tdpWatts,
    formatValue: (v) => `${Math.round(v)}W`,
  },
  {
    key: 'fpsPerDollar',
    label: 'Value (FPS / $100)',
    shortLabel: 'FPS / $100',
    unit: 'FPS/$100',
    direction: 'max',
    color: '#ec4899',
    getValue: (g) =>
      g.price > 0 ? Number(((g.rasterFps1440p / g.price) * 100).toFixed(1)) : 0,
    formatValue: (v) => `${v.toFixed(1)}`,
  },
  {
    key: 'fpsPerWatt',
    label: 'Efficiency (FPS / 100W)',
    shortLabel: 'FPS / 100W',
    unit: 'FPS/100W',
    direction: 'max',
    color: '#84cc16',
    getValue: (g) =>
      g.tdpWatts > 0
        ? Number(((g.rasterFps1440p / g.tdpWatts) * 100).toFixed(1))
        : 0,
    formatValue: (v) => `${v.toFixed(1)}`,
  },
];

export type HyperProjectionMode = 'parallel' | 'glyph' | 'radviz';

export interface HyperEvaluatedItem {
  gpu: RankedGpu;
  utilities: Record<HyperDimKey, number>;
  dominators: RankedGpu[];
  isNDOptimal: boolean;
  passesGates: boolean;
  hyperScore: number;
}
