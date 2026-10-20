// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  downloadDataFile,
  escapeCsvField,
  exportRankedGpusToCsv,
  exportRankedGpusToJson,
} from '../exportData';
import { RankedGpu } from '../../lib/math/types';

function createMockRankedGpu(
  rank: number,
  id: string,
  name: string,
  price: number,
  isPareto: boolean,
): RankedGpu {
  return {
    rank,
    id,
    name,
    price,
    rasterFps1440p: 100,
    rtFps1440p: 50,
    vramGb: 12,
    tdpWatts: 200,
    isParetoOptimal: isPareto,
    isDominated: !isPareto,
    dominatedBy: isPareto ? [] : ['gpu-better'],
    paretoDominatedBy: isPareto ? [] : ['gpu-better'],
    dominanceReasons: isPareto
      ? []
      : [
          {
            dominatorId: 'gpu-better',
            dominatorName: 'Better GPU',
            priceSaved: 50,
            metricGains: {},
            summaryText: 'Better GPU is $50 cheaper',
          },
        ],
    topsisScore: isPareto ? 0.85 : 0.45,
    topsisScorePct: isPareto ? 85.0 : 45.0,
    distanceToBest: 0.1,
    distanceToWorst: 0.4,
    normalizedMetrics: {
      price: 0.5,
      rasterFps1440p: 0.5,
      rtFps1440p: 0.5,
      vramGb: 0.5,
      tdpWatts: 0.5,
    },
    weightedMetrics: {
      price: 0.1,
      rasterFps1440p: 0.1,
      rtFps1440p: 0.1,
      vramGb: 0.1,
      tdpWatts: 0.1,
    },
    frontierRank: isPareto ? 1 : null,
    valuation: {
      fairPrice: 480,
      residualUsd: -20,
      residualPct: -4.1,
      valueTier: 'bargain',
    },
  };
}

describe('exportData utilities ([UX-08])', () => {
  it('escapes CSV fields properly according to RFC 4180', () => {
    expect(escapeCsvField('Simple Text')).toBe('Simple Text');
    expect(escapeCsvField('Text, with comma')).toBe('"Text, with comma"');
    expect(escapeCsvField('Text with "quotes"')).toBe('"Text with ""quotes"""');
    expect(escapeCsvField('Text with\nnewline')).toBe('"Text with\nnewline"');
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
    expect(escapeCsvField(1234)).toBe('1234');
  });

  it('exports ranked GPUs to RFC 4180 compliant CSV', () => {
    const mockGpus: RankedGpu[] = [
      createMockRankedGpu(
        1,
        'gpu-1',
        'GeForce RTX 4070, Super Edition',
        599,
        true,
      ),
      createMockRankedGpu(2, 'gpu-2', 'Radeon RX "XT"', 499, false),
    ];

    const csv = exportRankedGpusToCsv(mockGpus, 'USD', 'en-US');
    const lines = csv.split('\r\n');

    expect(lines.length).toBe(3); // Header + 2 data rows
    expect(lines[0]).toContain('Rank,Model,Verdict,TOPSIS_Score_Pct,Price_USD');

    // Row 1: name with comma should be quoted
    expect(lines[1]).toContain('"GeForce RTX 4070, Super Edition"');
    expect(lines[1]).toContain('Pareto Frontier (Best Value)');
    expect(lines[1]).toContain('599.00');

    // Row 2: name with quotes should be escaped
    expect(lines[2]).toContain('"Radeon RX ""XT"""');
    expect(lines[2]).toContain('Dominated (Bad Value Trap)');
  });

  it('exports ranked GPUs to structured JSON', () => {
    const mockGpus: RankedGpu[] = [
      createMockRankedGpu(1, 'gpu-1', 'GeForce RTX 4070', 599, true),
    ];
    const weights = {
      price: 35,
      rasterFps1440p: 30,
      rtFps1440p: 15,
      vramGb: 12,
      tdpWatts: 8,
    };

    const jsonStr = exportRankedGpusToJson(mockGpus, weights, 'BRL');
    const parsed = JSON.parse(jsonStr);

    expect(parsed.currency).toBe('BRL');
    expect(parsed.totalCandidates).toBe(1);
    expect(parsed.paretoCount).toBe(1);
    expect(parsed.activeWeights.price).toBe(35);
    expect(parsed.candidates[0].name).toBe('GeForce RTX 4070');
    expect(parsed.candidates[0].valuation.valueTier).toBe('bargain');
  });

  it('triggers browser download via DOM link', () => {
    const clickMock = vi.fn();
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue({
        set href(_val: string) {},
        set download(_val: string) {},
        click: clickMock,
      } as unknown as HTMLElement);

    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node) => node);
    const removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation((node) => node);
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test-url');
    const revokeObjectURLMock = vi.fn();

    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    downloadDataFile('test.csv', 'col1,col2\nval1,val2', 'text/csv');

    expect(clickMock).toHaveBeenCalled();
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:test-url');

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
