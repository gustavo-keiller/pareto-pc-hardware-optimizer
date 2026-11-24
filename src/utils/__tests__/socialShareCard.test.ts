import { describe, expect, it } from 'vitest';
import {
  buildAffiliateStoreUrl,
  buildGpuSocialCardSvg,
  buildPcBuildSocialCardSvg,
  formatSocialPostCaption,
  getBuildPriorityPercentages,
  normalizePriorityPercentages,
} from '../socialShareCard';
import { RankedGpu } from '../../lib/math/types';
import {
  assemblePcBuild,
  BuildWorkloadProfile,
} from '../../lib/math/buildTypes';
import {
  SEED_CASES,
  SEED_COOLERS,
  SEED_CPUS,
  SEED_MOTHERBOARDS,
  SEED_PSUS,
  SEED_RAM_KITS,
  SEED_STORAGES,
} from '../../data/seedComponents';
import { REAL_WORLD_GPUS } from '../../data/realGpus';

const MOCK_RANKED_GPU: RankedGpu = {
  id: 'arc-b580',
  name: 'Intel Arc B580 & Special <Edition>',
  price: 2499,
  rasterFps1440p: 74,
  rtFps1440p: 48,
  vramGb: 12,
  tdpWatts: 190,
  vendor: 'Intel',
  store: 'KaBuM!',
  currency: 'BRL',
  isDominated: false,
  dominatedBy: [],
  paretoDominatedBy: [],
  dominanceReasons: [],
  isParetoOptimal: true,
  topsisScore: 0.94,
  topsisScorePct: 94,
  distanceToBest: 0.06,
  distanceToWorst: 0.94,
  normalizedMetrics: {
    price: 0.8,
    rasterFps1440p: 0.75,
    rtFps1440p: 0.65,
    vramGb: 0.75,
    tdpWatts: 0.5,
  },
  weightedMetrics: {
    price: 0.24,
    rasterFps1440p: 0.3,
    rtFps1440p: 0.03,
    vramGb: 0.19,
    tdpWatts: 0,
  },
  rank: 1,
  frontierRank: 1,
};

describe('Social Share Card & Creator Attribution Engine (SHARE-01)', () => {
  const cpu = SEED_CPUS.find((c) => c.id === 'cpu-ryzen-5600')!;
  const gpu = REAL_WORLD_GPUS.find((g) => g.id === 'rtx-4070-super')!;
  const mobo = SEED_MOTHERBOARDS.find((m) => m.id === 'mobo-msi-b550-a-pro')!;
  const ram = SEED_RAM_KITS.find((r) => r.id === 'ram-corsair-32gb-d4-3600')!;
  const psu = SEED_PSUS.find((p) => p.id === 'psu-corsair-rm750e')!;
  const storage = SEED_STORAGES.find((s) => s.id === 'storage-wd-sn770-1tb')!;
  const pcCase = SEED_CASES.find((c) => c.id === 'case-deepcool-cc560')!;
  const cooler = SEED_COOLERS.find(
    (c) => c.id === 'cooler-thermalright-assassin-x',
  )!;

  const testBuild = assemblePcBuild(
    cpu,
    gpu,
    ram,
    mobo,
    psu,
    storage,
    pcCase,
    cooler,
    0.5,
    'sweetspot-1440p',
  );

  describe('normalizePriorityPercentages', () => {
    it('always sums to exactly 100 across arbitrary non-negative weights', () => {
      const cases = [
        {
          price: 30,
          rasterFps1440p: 40,
          rtFps1440p: 5,
          vramGb: 25,
          tdpWatts: 0,
        },
        {
          price: 7,
          rasterFps1440p: 13,
          rtFps1440p: 3,
          vramGb: 19,
          tdpWatts: 1,
        },
        {
          price: 0,
          rasterFps1440p: 100,
          rtFps1440p: 0,
          vramGb: 0,
          tdpWatts: 0,
        },
        { price: 1, rasterFps1440p: 1, rtFps1440p: 1, vramGb: 0, tdpWatts: 0 },
      ];

      for (const w of cases) {
        const slices = normalizePriorityPercentages(w, 'en-US');
        const sum = slices.reduce((acc, s) => acc + s.pct, 0);
        expect(sum).toBe(100);
        expect(slices.every((s) => Number.isInteger(s.pct) && s.pct >= 0)).toBe(
          true,
        );
      }
    });

    it('falls back to uniform 20% slices when all weights are zero', () => {
      const slices = normalizePriorityPercentages(
        {
          price: 0,
          rasterFps1440p: 0,
          rtFps1440p: 0,
          vramGb: 0,
          tdpWatts: 0,
        },
        'pt-BR',
      );
      expect(slices).toHaveLength(5);
      expect(slices.every((s) => s.pct === 20)).toBe(true);
    });
  });

  describe('getBuildPriorityPercentages', () => {
    it('sums to 100% for every workload profile', () => {
      const profiles: BuildWorkloadProfile[] = [
        'esports-1080p',
        'sweetspot-1440p',
        'enthusiast-4k',
        'creator-ai',
      ];
      for (const profile of profiles) {
        const b = assemblePcBuild(
          cpu,
          gpu,
          ram,
          mobo,
          psu,
          storage,
          pcCase,
          cooler,
          0.5,
          profile,
        );
        const slices = getBuildPriorityPercentages(b, 'pt-BR');
        expect(slices.reduce((acc, s) => acc + s.pct, 0)).toBe(100);
      }
    });
  });

  describe('buildAffiliateStoreUrl', () => {
    it('attaches Amazon tag cleanly and rejects unsafe schemes', () => {
      expect(
        buildAffiliateStoreUrl(
          'https://www.amazon.com.br/dp/B0XXXXXX',
          'canal-20',
        ),
      ).toBe('https://www.amazon.com.br/dp/B0XXXXXX?tag=canal-20');

      expect(
        buildAffiliateStoreUrl(
          'https://www.amazon.com/dp/B0YYYYYY?tag=existing-20',
          'canal-20',
        ),
      ).toBe('https://www.amazon.com/dp/B0YYYYYY?tag=existing-20');

      expect(
        buildAffiliateStoreUrl('javascript:alert(1)', 'canal-20'),
      ).toBeUndefined();
    });
  });

  describe('SVG card generation', () => {
    it('builds valid escaped SVG for a GPU with price, priority %, site watermark, and creator handle', () => {
      const svg = buildGpuSocialCardSvg({
        gpu: MOCK_RANKED_GPU,
        weights: {
          price: 30,
          rasterFps1440p: 40,
          rtFps1440p: 5,
          vramGb: 25,
          tdpWatts: 0,
        },
        shoppingReason: 'Melhor custo-benefício com 12 GB VRAM.',
        currency: 'BRL',
        locale: 'pt-BR',
        creator: {
          refTag: '@Ofertas&Tech',
          siteName: 'ParetoPC',
          siteDomain: 'paretopc.com',
        },
        shareUrl: 'https://paretopc.com/?mode=simple&gpu=arc-b580',
      });

      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain('viewBox="0 0 1200 630"');
      expect(svg).toContain('paretopc.com');
      expect(svg).toContain('PARETOPC');
      expect(svg).toContain('R$ 2.499');
      expect(svg).toContain('40%');
      expect(svg).toContain('30%');
      expect(svg).toContain('25%');
      expect(svg).toContain('94% MATCH');
      // Escaped XML entities prevent malformed markup
      expect(svg).toContain('Special &lt;Edition&gt;');
      expect(svg).not.toContain('Special <Edition>');
      expect(svg).toContain('@OfertasTech');
    });

    it('builds valid SVG for a complete 8-component PC build', () => {
      const svg = buildPcBuildSocialCardSvg({
        build: testBuild,
        currency: 'USD',
        locale: 'en-US',
        creator: {
          refTag: '@PCDealsUSA',
          siteName: 'ParetoPC',
          siteDomain: 'paretopc.com',
        },
        shareUrl: 'https://paretopc.com/?mode=builds',
      });

      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(svg).toContain('paretopc.com');
      expect(svg).toContain(cpu.name);
      expect(svg).toContain(gpu.name);
      expect(svg).toContain('PARETO FRONTIER');
      expect(svg).toContain('40%');
      expect(svg).toContain('@PCDealsUSA');
    });
  });

  describe('formatSocialPostCaption', () => {
    it('generates ready-to-post caption with specs, priority %, affiliate store link, and ParetoPC URL', () => {
      const captionPt = formatSocialPostCaption({
        target: {
          kind: 'gpu',
          gpu: MOCK_RANKED_GPU,
          weights: {
            price: 30,
            rasterFps1440p: 40,
            rtFps1440p: 5,
            vramGb: 25,
            tdpWatts: 0,
          },
          reason: 'Excelente negócio em 1440p.',
        },
        currency: 'BRL',
        locale: 'pt-BR',
        creator: {
          refTag: '@GrupoHardware',
          amazonTag: 'grupohw-20',
          customStoreUrl: 'https://www.amazon.com.br/dp/B0TEST',
          siteName: 'ParetoPC',
        },
        shareUrl: 'https://paretopc.com/?mode=simple&gpu=arc-b580',
      });

      expect(captionPt).toContain('R$ 2.499');
      expect(captionPt).toContain('74 FPS (1440p)');
      expect(captionPt).toContain('FPS Jogos 40%');
      expect(captionPt).toContain(
        'https://www.amazon.com.br/dp/B0TEST?tag=grupohw-20',
      );
      expect(captionPt).toContain(
        'https://paretopc.com/?mode=simple&gpu=arc-b580',
      );

      const captionBuildEn = formatSocialPostCaption({
        target: { kind: 'build', build: testBuild },
        currency: 'USD',
        locale: 'en-US',
        creator: { siteName: 'ParetoPC' },
        shareUrl: 'https://paretopc.com/?mode=builds',
      });

      expect(captionBuildEn).toContain('Pareto Frontier Full PC Build');
      expect(captionBuildEn).toContain('Priority Split (%)');
      expect(captionBuildEn).toContain('https://paretopc.com/?mode=builds');
    });
  });
});
