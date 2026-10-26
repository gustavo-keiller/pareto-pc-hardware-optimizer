import { describe, expect, it } from 'vitest';
import { REAL_WORLD_GPUS } from '../../../data/realGpus';
import {
  DEFAULT_TARGETS,
  PriorityEntry,
  ScoringContext,
  ValueScale,
  beatsWithTolerance,
  findBetterAlternatives,
  rawForValue,
  resolveParameters,
  scoreByPriorities,
  valueOnScale,
  weightShares,
  weightsFromChoices,
} from '../priorityModel';
import {
  explainTopChange,
  findFlipPoint,
  isPracticalTie,
  pickConfidence,
} from '../priorityInsights';
import {
  USE_CASE_PRESETS,
  applyTopsisWeights,
  parsePriorityProfile,
  profileForUseCase,
  profileToTopsisWeights,
} from '../priorityProfiles';
import { GpuCandidate } from '../types';

const CTX: ScoringContext = {
  budget: 1800,
  priceUnit: 1,
  targets: DEFAULT_TARGETS,
};
const USE_CASES = Object.keys(
  USE_CASE_PRESETS,
) as (keyof typeof USE_CASE_PRESETS)[];

function rank(gpus: GpuCandidate[], entries: PriorityEntry[], ctx = CTX) {
  const params = resolveParameters(
    { entries, targets: ctx.targets, custom: [] },
    ctx,
  );
  return scoreByPriorities(gpus, params, entries);
}

const SCALES: ValueScale[] = [
  { worst: 30, best: 144, curve: 'linear' },
  { worst: 30, best: 144, curve: 'saturating' },
  { worst: 450, best: 120, curve: 'linear' },
  { worst: 1000, best: 300, curve: 'saturating' },
];

describe('value scales', () => {
  it('stay within [0, 1] and never get worse as the raw value improves', () => {
    for (const scale of SCALES) {
      const dir = Math.sign(scale.best - scale.worst);
      let prev = -1;
      for (let i = -20; i <= 120; i++) {
        const x = scale.worst + ((scale.best - scale.worst) * i) / 100;
        const v = valueOnScale(x, scale);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
        expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
        prev = v;
      }
      expect(dir).not.toBe(0);
    }
  });

  it('rawForValue inverts continuous scales', () => {
    for (const scale of SCALES) {
      for (const v of [0, 0.1, 0.37, 0.5, 0.9, 1]) {
        expect(valueOnScale(rawForValue(v, scale), scale)).toBeCloseTo(v, 9);
      }
    }
  });

  it('threshold scales are yes/no', () => {
    const s: ValueScale = { worst: 0, best: 1, curve: 'threshold' };
    expect(valueOnScale(0, s)).toBe(0);
    expect(valueOnScale(0.99, s)).toBe(0);
    expect(valueOnScale(1, s)).toBe(1);
  });
});

describe('scoreByPriorities', () => {
  it('scores lie in [0, 10] and per-parameter points add up to the score', () => {
    for (const uc of USE_CASES) {
      for (const s of rank(REAL_WORLD_GPUS, USE_CASE_PRESETS[uc].entries)) {
        expect(s.score).toBeGreaterThanOrEqual(0);
        expect(s.score).toBeLessThanOrEqual(10 + 1e-9);
        const sum = s.contributions.reduce((a, c) => a + c.points, 0);
        expect(sum).toBeCloseTo(s.score, 9);
      }
    }
  });

  it('never reorders the other cards when one card is added or removed (no rank reversal)', () => {
    const entries = USE_CASE_PRESETS['sweetspot-1440p'].entries;
    const base = rank(REAL_WORLD_GPUS, entries).map((s) => s.gpu.id);
    for (const removed of REAL_WORLD_GPUS) {
      const without = rank(
        REAL_WORLD_GPUS.filter((g) => g.id !== removed.id),
        entries,
      ).map((s) => s.gpu.id);
      expect(without).toEqual(base.filter((id) => id !== removed.id));
    }
    const junk: GpuCandidate = {
      id: 'junk',
      name: 'Junk',
      price: 1700,
      rasterFps1440p: 60,
      rtFps1440p: 30,
      vramGb: 8,
      tdpWatts: 400,
    };
    const withJunk = rank([...REAL_WORLD_GPUS, junk], entries)
      .map((s) => s.gpu.id)
      .filter((id) => id !== 'junk');
    expect(withJunk).toEqual(base);
  });

  it('falls back to equal shares when every weight is 0', () => {
    const shares = weightShares([
      { id: 'price', weight: 0 },
      { id: 'vramGb', weight: 0 },
    ]);
    expect(shares.price).toBeCloseTo(0.5);
    expect(shares.vramGb).toBeCloseTo(0.5);
  });

  it('is linear in each share: moving weight changes a score by share × value', () => {
    const a = rank(REAL_WORLD_GPUS, [
      { id: 'price', weight: 50 },
      { id: 'vramGb', weight: 50 },
    ]);
    const b = rank(REAL_WORLD_GPUS, [
      { id: 'price', weight: 30 },
      { id: 'vramGb', weight: 70 },
    ]);
    for (const s of a) {
      const t = b.find((x) => x.gpu.id === s.gpu.id);
      const vPrice = s.contributions.find((c) => c.id === 'price')?.value ?? 0;
      const vVram = s.contributions.find((c) => c.id === 'vramGb')?.value ?? 0;
      expect(t?.score).toBeCloseTo(s.score + 10 * 0.2 * (vVram - vPrice), 9);
    }
  });

  it('flags cards that lack a must-have feature', () => {
    const scored = rank(REAL_WORLD_GPUS, [
      { id: 'price', weight: 50 },
      { id: 'cuda', weight: 50, mustHave: true },
    ]);
    for (const s of scored) {
      const hasCuda = s.contributions.find((c) => c.id === 'cuda')?.value === 1;
      expect(s.missingMustHaves.length === 0).toBe(hasCuda);
    }
  });

  it('treats a missing custom rating as neutral', () => {
    const profile = {
      entries: [{ id: 'custom:mine', weight: 100 }],
      targets: DEFAULT_TARGETS,
      custom: [
        {
          kind: 'manual-rating' as const,
          id: 'custom:mine',
          label: 'Mine',
          ratings: { a: 10 },
        },
      ],
    };
    const gpus: GpuCandidate[] = [
      {
        id: 'a',
        name: 'A',
        price: 300,
        rasterFps1440p: 60,
        rtFps1440p: 30,
        vramGb: 8,
        tdpWatts: 200,
      },
      {
        id: 'b',
        name: 'B',
        price: 300,
        rasterFps1440p: 60,
        rtFps1440p: 30,
        vramGb: 8,
        tdpWatts: 200,
      },
    ];
    const scored = scoreByPriorities(
      gpus,
      resolveParameters(profile, CTX),
      profile.entries,
    );
    expect(scored[0].gpu.id).toBe('a');
    expect(scored[0].score).toBeCloseTo(10);
    expect(scored[1].score).toBeCloseTo(5);
    expect(scored[1].contributions[0].missing).toBe(true);
  });
});

describe('better-alternative (bad deal) test', () => {
  const params = resolveParameters(profileForUseCase('sweetspot-1440p'), CTX);

  it('is never mutual and never beats itself', () => {
    for (const a of REAL_WORLD_GPUS) {
      expect(beatsWithTolerance(a, a, params)).toBe(false);
      for (const b of REAL_WORLD_GPUS) {
        expect(
          beatsWithTolerance(a, b, params) && beatsWithTolerance(b, a, params),
        ).toBe(false);
      }
    }
  });

  it('only uses parameters the user gave weight to', () => {
    const entries: PriorityEntry[] = [
      { id: 'price', weight: 50 },
      { id: 'rasterFps1440p', weight: 50 },
      { id: 'vramGb', weight: 0 },
    ];
    const p = resolveParameters(
      { entries, targets: DEFAULT_TARGETS, custom: [] },
      CTX,
    );
    const cheapFast: GpuCandidate = {
      id: 'x',
      name: 'X',
      price: 300,
      rasterFps1440p: 90,
      rtFps1440p: 40,
      vramGb: 8,
      tdpWatts: 200,
    };
    const pricierSlowBigVram: GpuCandidate = {
      id: 'y',
      name: 'Y',
      price: 400,
      rasterFps1440p: 80,
      rtFps1440p: 40,
      vramGb: 16,
      tdpWatts: 200,
    };
    const result = findBetterAlternatives(
      [cheapFast, pricierSlowBigVram],
      p,
      entries,
    );
    expect(result.get('y')).toBe('x');
    const withVram = entries.map((e) =>
      e.id === 'vramGb' ? { ...e, weight: 20 } : e,
    );
    const result2 = findBetterAlternatives(
      [cheapFast, pricierSlowBigVram],
      p,
      withVram,
    );
    expect(result2.get('y')).toBeNull();
  });

  it('a card within benchmark noise (3%) does not count as better', () => {
    const entries: PriorityEntry[] = [
      { id: 'price', weight: 50 },
      { id: 'rasterFps1440p', weight: 50 },
    ];
    const p = resolveParameters(
      { entries, targets: DEFAULT_TARGETS, custom: [] },
      CTX,
    );
    const a: GpuCandidate = {
      id: 'a',
      name: 'A',
      price: 300,
      rasterFps1440p: 100,
      rtFps1440p: 40,
      vramGb: 8,
      tdpWatts: 200,
    };
    const b: GpuCandidate = {
      ...a,
      id: 'b',
      name: 'B',
      price: 305,
      rasterFps1440p: 99,
    };
    expect(beatsWithTolerance(a, b, p)).toBe(false);
    const c: GpuCandidate = {
      ...a,
      id: 'c',
      name: 'C',
      price: 340,
      rasterFps1440p: 99,
    };
    expect(beatsWithTolerance(a, c, p)).toBe(true);
  });

  it('keeps at least one card standing', () => {
    for (const uc of USE_CASES) {
      const profile = profileForUseCase(uc);
      const p = resolveParameters(profile, CTX);
      const res = findBetterAlternatives(REAL_WORLD_GPUS, p, profile.entries);
      expect([...res.values()].some((v) => v === null)).toBe(true);
    }
  });
});

describe('flip points', () => {
  it('match a brute-force search over whole-number weights', () => {
    for (const uc of USE_CASES) {
      const entries = USE_CASE_PRESETS[uc].entries;
      const ranked = rank(REAL_WORLD_GPUS, entries);
      const winner = ranked[0];
      for (const challenger of ranked.slice(1, 6)) {
        const flip = findFlipPoint(winner, challenger, entries);
        let bruteBest: number | null = null;
        for (const e of entries) {
          for (let w = 0; w <= 100; w++) {
            if (w === e.weight) continue;
            const edited = entries.map((x) =>
              x.id === e.id ? { ...x, weight: w } : x,
            );
            const r = rank(REAL_WORLD_GPUS, edited);
            const sw = r.find((s) => s.gpu.id === winner.gpu.id)?.score ?? 0;
            const sc =
              r.find((s) => s.gpu.id === challenger.gpu.id)?.score ?? 0;
            if (sc > sw + 1e-12) {
              const d = Math.abs(w - e.weight);
              if (bruteBest === null || d < bruteBest) bruteBest = d;
            }
          }
        }
        if (bruteBest === null) {
          expect(flip).toBeNull();
        } else {
          expect(flip).not.toBeNull();
          expect(
            Math.abs((flip?.toWeight ?? 0) - (flip?.fromWeight ?? 0)),
          ).toBe(bruteBest);
        }
      }
    }
  });

  it('confidence is a close call when the top two are practically tied', () => {
    const entries = USE_CASE_PRESETS['sweetspot-1440p'].entries;
    const ranked = rank(REAL_WORLD_GPUS, entries);
    if (isPracticalTie(ranked[0], ranked[1])) {
      expect(pickConfidence(ranked, entries)).toBe('close-call');
    } else {
      expect(['confident', 'likely', 'close-call']).toContain(
        pickConfidence(ranked, entries),
      );
    }
  });
});

describe('explainTopChange', () => {
  it('names the parameter whose weight move helped the new #1', () => {
    const before: PriorityEntry[] = [
      { id: 'price', weight: 80 },
      { id: 'vramGb', weight: 20 },
    ];
    const after: PriorityEntry[] = [
      { id: 'price', weight: 20 },
      { id: 'vramGb', weight: 80 },
    ];
    const oldTop = rank(REAL_WORLD_GPUS, before)[0].gpu.id;
    const ranked = rank(REAL_WORLD_GPUS, after);
    const reason = explainTopChange(oldTop, ranked, before, after);
    if (ranked[0].gpu.id !== oldTop) {
      expect(reason?.paramId).toBeDefined();
      expect(['price', 'vramGb']).toContain(reason?.paramId);
    } else {
      expect(reason).toBeNull();
    }
  });
});

describe('profiles', () => {
  it('weightsFromChoices sums to about 100 and rewards winners', () => {
    const entries = weightsFromChoices(
      ['price', 'rasterFps1440p', 'vramGb'],
      ['price', 'price', 'vramGb'],
    );
    const sum = entries.reduce((a, e) => a + e.weight, 0);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(2);
    const w = Object.fromEntries(entries.map((e) => [e.id, e.weight]));
    expect(w.price).toBeGreaterThan(w.vramGb);
    expect(w.vramGb).toBeGreaterThan(w.rasterFps1440p);
  });

  it('migrates old five-metric weights and survives junk storage', () => {
    const migrated = parsePriorityProfile(null, {
      price: 35,
      rasterFps1440p: 30,
      rtFps1440p: 15,
      vramGb: 12,
      tdpWatts: 0,
    });
    expect(profileToTopsisWeights(migrated)).toEqual({
      price: 35,
      rasterFps1440p: 30,
      rtFps1440p: 15,
      vramGb: 12,
      tdpWatts: 0,
    });
    expect(parsePriorityProfile('garbage', 42).entries.length).toBeGreaterThan(
      0,
    );
    expect(
      parsePriorityProfile({ entries: [{ id: 'nope', weight: 3 }] }).entries
        .length,
    ).toBeGreaterThan(0);
  });

  it('round-trips through storage', () => {
    const p = {
      ...profileForUseCase('creator-ai'),
      custom: [
        {
          kind: 'manual-rating' as const,
          id: 'custom:brand',
          label: 'Brand',
          ratings: { x: 7 },
        },
      ],
    };
    p.entries.push({ id: 'custom:brand', weight: 10 });
    expect(parsePriorityProfile(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it('applying TOPSIS weights keeps non-metric parameters', () => {
    const p = profileForUseCase('creator-ai');
    const next = applyTopsisWeights(p, {
      price: 10,
      rasterFps1440p: 0,
      rtFps1440p: 5,
      vramGb: 40,
      tdpWatts: 5,
    });
    expect(next.entries.find((e) => e.id === 'cuda')?.weight).toBe(45);
    expect(next.entries.find((e) => e.id === 'rasterFps1440p')?.weight).toBe(0);
    expect(next.entries.find((e) => e.id === 'rtFps1440p')?.weight).toBe(5);
  });
});
