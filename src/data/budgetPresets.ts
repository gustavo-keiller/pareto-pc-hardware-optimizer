export interface BudgetPreset {
  id: string;
  label: string;
  budget: number;
  shortDesc: string;
}

export const BUDGET_PRESETS_USD: BudgetPreset[] = [
  {
    id: 'entry-750',
    label: '$750 Entry',
    budget: 750,
    shortDesc: 'Smooth 1080p / 1440p entry gaming',
  },
  {
    id: 'sweet-1000',
    label: '$1,000 Sweet Spot',
    budget: 1000,
    shortDesc: 'Maximum value-per-dollar 1440p',
  },
  {
    id: 'high-1500',
    label: '$1,500 High-FPS',
    budget: 1500,
    shortDesc: 'High-refresh 1440p & modern Ray Tracing',
  },
  {
    id: 'enthusiast-2200',
    label: '$2,200 Enthusiast',
    budget: 2200,
    shortDesc: 'Ryzen 7800X3D + Tier-1 GPU powerhouse',
  },
  {
    id: 'extreme-3200',
    label: '$3,200 Extreme',
    budget: 3200,
    shortDesc: 'Unconstrained 4K / high-fps flagship setup',
  },
];

export const BUDGET_PRESETS_BRL: BudgetPreset[] = [
  {
    id: 'entry-4500',
    label: 'R$ 4.500 Entrada',
    budget: 4500,
    shortDesc: '1080p / 1440p econômico balanceado',
  },
  {
    id: 'sweet-6000',
    label: 'R$ 6.000 Ponto Ideal',
    budget: 6000,
    shortDesc: 'Melhor custo-benefício em 1440p',
  },
  {
    id: 'high-8500',
    label: 'R$ 8.500 Alto FPS',
    budget: 8500,
    shortDesc: 'Alto FPS 1440p e Ray Tracing',
  },
  {
    id: 'enthusiast-12000',
    label: 'R$ 12.000 Entusiasta',
    budget: 12000,
    shortDesc: 'Ryzen 7800X3D + GPU topo de linha',
  },
  {
    id: 'extreme-18000',
    label: 'R$ 18.000 Extremo',
    budget: 18000,
    shortDesc: 'Máximo 4K e alto FPS sem concessões',
  },
];
