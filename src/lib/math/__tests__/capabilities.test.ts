import { describe, it, expect } from 'vitest';
import {
  computeGpuFacets,
  inferGpuArchitecture,
  inferGpuFeatures,
  inferGpuVendor,
  KNOWN_GPU_TECHNOLOGIES,
} from '../capabilities';
import { REAL_WORLD_GPUS } from '../../../data/realGpus';
import { PHASE1_SEED_GPUS } from '../../../data/seedGpus';

describe('Hardware Capabilities & Ecosystem Technology Engine', () => {
  describe('inferGpuVendor', () => {
    it('accurately identifies NVIDIA, AMD, and Intel from naming conventions', () => {
      expect(inferGpuVendor({ name: 'GeForce RTX 4070 Super 12GB' })).toBe(
        'NVIDIA',
      );
      expect(inferGpuVendor({ name: 'Radeon RX 7800 XT 16GB' })).toBe('AMD');
      expect(inferGpuVendor({ name: 'Intel Arc B580 12GB' })).toBe('Intel');
      expect(inferGpuVendor({ name: 'Palit RTX 5060' })).toBe('NVIDIA');
      expect(inferGpuVendor({ name: 'PowerColor RX 9060 XT' })).toBe('AMD');
    });

    it('preserves explicitly assigned vendor when present', () => {
      expect(inferGpuVendor({ name: 'Custom Card', vendor: 'AMD' })).toBe(
        'AMD',
      );
    });
  });

  describe('inferGpuArchitecture', () => {
    it('maps desktop chips to proper architecture generations', () => {
      expect(inferGpuArchitecture({ chip: 'RTX 5080' })).toBe(
        'Blackwell (RTX 50)',
      );
      expect(inferGpuArchitecture({ chip: 'RTX 4060' })).toBe(
        'Ada Lovelace (RTX 40)',
      );
      expect(inferGpuArchitecture({ chip: 'RTX 3060' })).toBe(
        'Ampere (RTX 30)',
      );
      expect(inferGpuArchitecture({ chip: 'GTX 1660 Super' })).toBe('Turing');
      expect(inferGpuArchitecture({ chip: 'RX 7600' })).toBe(
        'RDNA 3 (RX 7000)',
      );
      expect(inferGpuArchitecture({ chip: 'RX 6600' })).toBe(
        'RDNA 2 (RX 6000)',
      );
      expect(inferGpuArchitecture({ chip: 'Arc B580' })).toBe(
        'Battlemage (Xe2)',
      );
    });
  });

  describe('inferGpuFeatures', () => {
    it('correctly isolates brand-attached technologies', () => {
      // Modern NVIDIA (Ada Lovelace) has DLSS 3 Frame Gen, AV1, and Ray Tracing
      const rtx4070Features = inferGpuFeatures({
        name: 'GeForce RTX 4070 12GB',
        chip: 'RTX 4070',
        vendor: 'NVIDIA',
      });
      expect(rtx4070Features).toContain('DLSS 3+ Frame Gen');
      expect(rtx4070Features).toContain('AV1 Video Encode');
      expect(rtx4070Features).toContain('Hardware Ray Tracing');
      expect(rtx4070Features).toContain('CUDA / OptiX AI & 3D');

      // Older NVIDIA Ampere (RTX 30) has RT & CUDA, but lacks DLSS 3 Frame Gen and AV1
      const rtx3060Features = inferGpuFeatures({
        name: 'GeForce RTX 3060 12GB',
        chip: 'RTX 3060',
        vendor: 'NVIDIA',
      });
      expect(rtx3060Features).not.toContain('DLSS 3+ Frame Gen');
      expect(rtx3060Features).not.toContain('AV1 Video Encode');
      expect(rtx3060Features).toContain('Hardware Ray Tracing');
      expect(rtx3060Features).toContain('CUDA / OptiX AI & 3D');

      // Legacy NVIDIA Turing (GTX 16) lacks RT, DLSS 3, and AV1
      const gtx1660Features = inferGpuFeatures({
        name: 'GeForce GTX 1660 Super 6GB',
        chip: 'GTX 1660 Super',
        vendor: 'NVIDIA',
        rtFps1440p: 0,
      });
      expect(gtx1660Features).not.toContain('Hardware Ray Tracing');
      expect(gtx1660Features).not.toContain('DLSS 3+ Frame Gen');
      expect(gtx1660Features).not.toContain('AV1 Video Encode');
      expect(gtx1660Features).toContain('CUDA / OptiX AI & 3D');

      // Modern AMD RDNA 3 has FSR 3, AV1, and RT
      const rx7800Features = inferGpuFeatures({
        name: 'Radeon RX 7800 XT 16GB',
        chip: 'RX 7800 XT',
        vendor: 'AMD',
      });
      expect(rx7800Features).toContain('FSR 3 Frame Gen');
      expect(rx7800Features).toContain('AV1 Video Encode');
      expect(rx7800Features).toContain('Hardware Ray Tracing');
      expect(rx7800Features).not.toContain('CUDA / OptiX AI & 3D');

      // Older AMD RDNA 2 lacks AV1
      const rx6600Features = inferGpuFeatures({
        name: 'Radeon RX 6600 8GB',
        chip: 'RX 6600',
        vendor: 'AMD',
      });
      expect(rx6600Features).toContain('FSR 3 Frame Gen');
      expect(rx6600Features).not.toContain('AV1 Video Encode');
      expect(rx6600Features).toContain('Hardware Ray Tracing');

      // Intel Battlemage has AV1 and RT
      const arcB580Features = inferGpuFeatures({
        name: 'Intel Arc B580 12GB',
        chip: 'Arc B580',
        vendor: 'Intel',
      });
      expect(arcB580Features).toContain('AV1 Video Encode');
      expect(arcB580Features).toContain('Hardware Ray Tracing');
    });
  });

  describe('computeGpuFacets', () => {
    it('computes live vendor and technology facets with correct counts', () => {
      const facets = computeGpuFacets(REAL_WORLD_GPUS, {
        maxPrice: 2000,
        minVram: 0,
        maxWatts: 500,
      });

      expect(facets).toHaveLength(2);
      const [vendorFacet, techFacet] = facets;

      expect(vendorFacet.id).toBe('vendors');
      const nvidiaOpt = vendorFacet.options.find((o) => o.id === 'NVIDIA');
      const amdOpt = vendorFacet.options.find((o) => o.id === 'AMD');
      const intelOpt = vendorFacet.options.find((o) => o.id === 'Intel');

      expect(nvidiaOpt?.count).toBe(8);
      expect(amdOpt?.count).toBe(9);
      expect(intelOpt?.count).toBe(1);

      expect(techFacet.id).toBe('technologies');
      const dlssOpt = techFacet.options.find(
        (o) => o.id === 'DLSS 3+ Frame Gen',
      );
      const av1Opt = techFacet.options.find((o) => o.id === 'AV1 Video Encode');
      expect(dlssOpt?.count).toBeGreaterThan(0);
      expect(av1Opt?.count).toBeGreaterThan(0);
    });

    it('dynamically adapts counts when budget constraints restrict the candidate pool', () => {
      const budgetCapped = computeGpuFacets(REAL_WORLD_GPUS, {
        maxPrice: 300,
        minVram: 8,
        maxWatts: 200,
      });

      const vendorFacet = budgetCapped.find((f) => f.id === 'vendors');
      const nvidiaOpt = vendorFacet?.options.find((o) => o.id === 'NVIDIA');
      // At <= $300, only RTX 4060 and RTX 3060 12GB are under $300
      expect(nvidiaOpt?.count).toBeLessThanOrEqual(2);
    });

    it('defines distinct technologies with valid descriptions and badges', () => {
      expect(KNOWN_GPU_TECHNOLOGIES.length).toBeGreaterThanOrEqual(4);
      expect(
        KNOWN_GPU_TECHNOLOGIES.every((t) => t.id && t.label && t.badge),
      ).toBe(true);
    });

    it('works on synthetic seed data as well', () => {
      const facets = computeGpuFacets(PHASE1_SEED_GPUS, { maxPrice: 1000 });
      expect(facets[0].options.length).toBeGreaterThan(0);
    });
  });
});
