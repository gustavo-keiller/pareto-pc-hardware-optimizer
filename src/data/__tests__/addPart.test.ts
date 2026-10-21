import { describe, it, expect } from 'vitest';
// @ts-expect-error CJS module import in vitest
import addPartModule from '../../../scripts/add-part.cjs';

const { CATEGORY_MAP, validateCandidateObject, appendPartToCatalog } =
  addPartModule;

describe('Maintainer Tooling — add-part (`scripts/add-part.cjs`) [DATA-06]', () => {
  it('defines all 8 BLD-01 hardware categories with valid target files', () => {
    const expectedCategories = [
      'cpu',
      'gpu',
      'motherboard',
      'ram',
      'storage',
      'cooler',
      'case',
      'psu',
    ];

    expect(Object.keys(CATEGORY_MAP).sort()).toEqual(expectedCategories.sort());

    for (const cat of expectedCategories) {
      expect(CATEGORY_MAP[cat].file).toMatch(/\.json$/);
      expect(typeof CATEGORY_MAP[cat].label).toBe('string');
    }
  });

  it('rejects candidate with invalid base attributes', () => {
    // Non-object
    expect(validateCandidateObject('cpu', null)).toContain(
      'Item must be an object',
    );

    // Missing/spaced ID
    const badId = validateCandidateObject('cpu', {
      id: 'bad id with spaces',
      name: 'Valid Name',
      price: 200,
      source: 'Test',
      checkedAt: '2026-10-20',
      vendor: 'AMD',
      socket: 'AM5',
      cores: 8,
      threads: 16,
      tdpWatts: 120,
      gamingScore: 90,
      supportedRamGenerations: ['DDR5'],
    });
    expect(badId.some((e: string) => e.includes('without spaces'))).toBe(true);

    // Negative price
    const badPrice = validateCandidateObject('cpu', {
      id: 'valid-id',
      name: 'Valid Name',
      price: -50,
      source: 'Test',
      checkedAt: '2026-10-20',
      vendor: 'AMD',
      socket: 'AM5',
      cores: 8,
      threads: 16,
      tdpWatts: 120,
      gamingScore: 90,
      supportedRamGenerations: ['DDR5'],
    });
    expect(badPrice.some((e: string) => e.includes('positive number'))).toBe(
      true,
    );

    // Bad date format
    const badDate = validateCandidateObject('cpu', {
      id: 'valid-id',
      name: 'Valid Name',
      price: 200,
      source: 'Test',
      checkedAt: '20-10-2026',
      vendor: 'AMD',
      socket: 'AM5',
      cores: 8,
      threads: 16,
      tdpWatts: 120,
      gamingScore: 90,
      supportedRamGenerations: ['DDR5'],
    });
    expect(badDate.some((e: string) => e.includes('ISO date'))).toBe(true);
  });

  it('detects duplicate IDs in existing catalog', () => {
    const existing = [{ id: 'cpu-existing-part' }];
    const errors = validateCandidateObject(
      'cpu',
      {
        id: 'cpu-existing-part',
        name: 'Another Name',
        price: 200,
        source: 'Test',
        checkedAt: '2026-10-20',
        vendor: 'AMD',
        socket: 'AM5',
        cores: 8,
        threads: 16,
        tdpWatts: 120,
        gamingScore: 90,
        supportedRamGenerations: ['DDR5'],
      },
      existing,
    );

    expect(
      errors.some((e: string) => e.includes('already exists in catalog')),
    ).toBe(true);
  });

  it('enforces category-specific schema constraints', () => {
    // CPU: gamingScore > 100 or threads < cores
    const badCpu = validateCandidateObject('cpu', {
      id: 'cpu-test',
      name: 'Test CPU',
      price: 200,
      source: 'Test',
      checkedAt: '2026-10-20',
      vendor: 'AMD',
      socket: 'AM5',
      cores: 8,
      threads: 4, // threads < cores
      tdpWatts: 120,
      gamingScore: 120, // > 100
      supportedRamGenerations: ['DDR5'],
    });
    expect(
      badCpu.some((e: string) => e.includes('threads must be >= cores')),
    ).toBe(true);
    expect(
      badCpu.some((e: string) =>
        e.includes('gamingScore must be between 0 and 100'),
      ),
    ).toBe(true);

    // GPU: negative RT FPS or 0 raster FPS
    const badGpu = validateCandidateObject('gpu', {
      id: 'gpu-test',
      name: 'Test GPU',
      price: 300,
      source: 'Test',
      checkedAt: '2026-10-20',
      vendor: 'NVIDIA',
      rasterFps1440p: 0,
      rtFps1440p: -5,
      vramGb: 8,
      tdpWatts: 150,
    });
    expect(
      badGpu.some((e: string) => e.includes('rasterFps1440p must be > 0')),
    ).toBe(true);
    expect(
      badGpu.some((e: string) => e.includes('rtFps1440p must be >= 0')),
    ).toBe(true);

    // RAM: capacity < 8 or speed < 2133
    const badRam = validateCandidateObject('ram', {
      id: 'ram-test',
      name: 'Test RAM',
      price: 80,
      source: 'Test',
      checkedAt: '2026-10-20',
      generation: 'DDR5',
      capacityGb: 4,
      speedMhz: 1800,
      modulesCount: 2,
    });
    expect(
      badRam.some((e: string) => e.includes('capacityGb must be >= 8')),
    ).toBe(true);
    expect(
      badRam.some((e: string) => e.includes('speedMhz must be >= 2133')),
    ).toBe(true);

    // PSU: wattage < 300 or invalid efficiency
    const badPsu = validateCandidateObject('psu', {
      id: 'psu-test',
      name: 'Test PSU',
      price: 50,
      source: 'Test',
      checkedAt: '2026-10-20',
      wattage: 200,
      efficiencyRating: '80+ Wood',
      modular: 'Full',
    });
    expect(
      badPsu.some((e: string) => e.includes('wattage must be >= 300')),
    ).toBe(true);
    expect(
      badPsu.some((e: string) => e.includes('efficiencyRating must be one of')),
    ).toBe(true);
  });

  it('validates and succeeds on dryRun for real catalog addition', () => {
    const candidateCpu = {
      id: 'cpu-ryzen-9900x-sample',
      name: 'AMD Ryzen 9 9900X Sample',
      vendor: 'AMD',
      price: 449,
      socket: 'AM5',
      cores: 12,
      threads: 24,
      tdpWatts: 120,
      gamingScore: 92,
      supportedRamGenerations: ['DDR5'],
      source: 'AMD Launch Specs',
      checkedAt: '2026-10-20',
    };

    const res = appendPartToCatalog('cpu', candidateCpu, { dryRun: true });
    expect(res.success).toBe(true);
    expect(res.targetPath).toMatch(/cpus\.json$/);
  });

  it('returns clean error on unknown category or missing catalog file', () => {
    const resBadCat = appendPartToCatalog('invalid-cat', {}, { dryRun: true });
    expect(resBadCat.success).toBe(false);
    expect(resBadCat.error).toContain("Invalid category 'invalid-cat'");

    const resMissingDir = appendPartToCatalog(
      'cpu',
      { id: 'test' },
      { dryRun: true, catalogsDir: '/nonexistent-directory' },
    );
    expect(resMissingDir.success).toBe(false);
    expect(resMissingDir.error).toContain('Catalog file not found');
  });
});
