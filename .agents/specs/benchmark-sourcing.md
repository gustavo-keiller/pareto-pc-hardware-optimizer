# Spec: Public Creator Benchmark Sourcing & Relative Normalization (`[DATA-02]`)

## Problem Statement

Hardware performance metrics (1440p Raster FPS, Ray Tracing FPS, and CPU Gaming Scores) are currently synthetic or single-source estimates without formal provenance or cross-reviewer normalization.

Public hardware review outlets (Hardware Unboxed, TechPowerUp, Gamers Nexus, LTT Labs) test hardware under different game suites, CPU test benches (e.g., 7800X3D vs 14900K), driver versions, and reference anchors.

Without a rigorous mathematical normalization and aggregation engine:
1. Ratings cannot be combined across reviewers without introducing systematic bias.
2. Users have to take performance numbers on blind trust instead of verifiable creator citations.
3. Adding new hardware benchmarks requires manually estimating FPS rather than importing reviewer relative percentages.

## Mathematical & Technical Solution

### 1. Benchmark Data Structure (`src/data/benchmarks/`)

Define versioned JSON benchmark datasets:
- `src/data/benchmarks/gpuBenchmarks.json`: Public creator GPU benchmarks (TechPowerUp 25-game relative index, Hardware Unboxed 50-game geomean, Gamers Nexus ray tracing reviews).
- `src/data/benchmarks/cpuBenchmarks.json`: Public creator CPU gaming benchmarks (Hardware Unboxed 12-game index, TechPowerUp 14-game index, Gamers Nexus gaming tests).

Each dataset contains:
```ts
export interface CreatorBenchmarkRun {
  id: string;
  creator: 'Hardware Unboxed' | 'TechPowerUp' | 'Gamers Nexus' | 'LTT Labs';
  publicationTitle: string;
  url: string;
  date: string;
  resolution: '1080p' | '1440p' | '4K';
  metric: 'rasterFps' | 'rtFps' | 'relativePercent';
  testBenchCpu?: string;
  anchorItem: string; // e.g. "GeForce RTX 4070 12GB"
  anchorValue: number; // e.g. 100% or 112 FPS
  results: Record<string, number>; // chip/model ID -> score
}
```

### 2. Relative Normalization & Aggregation Algorithms (`src/lib/math/benchmarkNormalization.ts`)

#### A. Transitive Re-Centering (Anchor Aligning)
When Reviewer A anchors to `RTX 4070 = 100%` and Reviewer B anchors to `RTX 4090 = 100%`, re-center Reviewer B's scores to the canonical anchor $A^*$:

$$I_{B \to A^*}(X) = \frac{I_B(X)}{I_B(A^*)} \times 100$$

If Reviewer B did not test $A^*$ directly, chain through a bridge component $C$ present in both benchmarks:

$$I_{B \to A^*}(X) = I_B(X) \times \frac{I_A(C)}{I_B(C)} \times \frac{100}{I_A(A^*)}$$

#### B. Cross-Reviewer Geometric Mean
When $K$ reviewers test chip $X$, calculate the harmonized relative score using the geometric mean (which preserves ratio scale invariance, unlike arithmetic mean):

$$\text{HarmonizedIndex}(X) = \left( \prod_{k=1}^K I_k(X) \right)^{1/K}$$

#### C. Absolute FPS Calibration
Given a calibrated real-world average FPS for the canonical anchor card ($\text{FPS}_{\text{anchor}}$), determine the effective catalog FPS:

$$\text{FPS}(X) = \text{round}\left( \text{FPS}_{\text{anchor}} \times \frac{\text{HarmonizedIndex}(X)}{100} \right)$$

### 3. Implementation Decisions

- **Math module:** `src/lib/math/benchmarkNormalization.ts` (100% pure TypeScript, zero React/DOM imports).
- **Data files:** `src/data/benchmarks/gpuBenchmarks.json`, `src/data/benchmarks/cpuBenchmarks.json`.
- **Integrations:**
  - Catalog enrichment: GPUs and CPUs in `src/data/catalogs/` link to `benchmarkSourceId`.
  - UI inspection: In `BuildHeroCard.tsx` and `GpuLeaderboardTable.tsx`, expose creator citations and sample size (e.g. "TechPowerUp + Hardware Unboxed (75 games)").

## Testing Decisions

- **Unit tests in `src/lib/math/__tests__/benchmarkNormalization.test.ts`:**
  - Scale invariance: Multiplying input scores by constant $c$ produces identical re-centered ratios.
  - Transitivity: $A \to B \to C$ re-centering equals direct $A \to C$.
  - Single-reviewer identity: With 1 reviewer, harmonized index equals reviewer index.
  - Zero/negative score guards: Never throws `NaN` or `Infinity`.
  - Geometric mean bounds: $\min_k I_k \le \text{HarmonizedIndex} \le \max_k I_k$.

## Out of Scope

- Automated web scraping of YouTube descriptions (manual / curated JSON updates only).
