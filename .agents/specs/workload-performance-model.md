# Spec: Performance Model Per Use Case & Full-Build Workload Engine (`[BLD-03]`)

**Status:** Ready to Implement  
**Date:** 2026-10-19  
**Tasks Covered:** `[BLD-03]` (Phase 2 Roadmap Milestone)  

---

## 1. Problem Statement

Currently, the combinatorial build engine (`src/lib/math/combinatorial.ts` and `src/lib/math/buildTypes.ts`) evaluates every full PC build strictly on a single metric: **1440p Raster Gaming FPS with fixed elasticity $\alpha = 0.50$**.

This causes serious domain inaccuracies:
1. **Creator & AI Blindness:** A user selecting *"Creator & AI"* is recommended a gaming build with 16 GB of RAM and an 8 GB GPU, because 32 GB RAM costs more and provides 0 extra 1440p raster FPS in the model, causing the 16 GB build to strictly dominate the 32 GB build on price vs. gaming FPS.
2. **Competitive 1080p Under-valuing CPU:** At 1080p high refresh (240+ Hz esports), CPU draw call throughput and cache are the primary bottleneck, but the current model treats 1080p identically to 1440p.
3. **4K Ultra RT Over-penalizing CPU:** At 4K Ultra with Ray Tracing, the GPU is 99% saturated, so CPU bottleneck penalties are much milder, but the current fixed $\alpha = 0.50$ penalizes budget CPUs as if they were running at 1080p.

---

## 2. Mathematical & Technical Solution

### 2.1 Workload Profile Domain Schema (`BuildWorkloadProfile`)

Define 4 workload profiles matching the beginner intake options:
- `'esports-1080p'`: 1080p Competitive / High Refresh (CPU-bound, high frame rates)
- `'sweetspot-1440p'`: 1440p AAA Gaming Sweet Spot (Balanced CPU/GPU load)
- `'enthusiast-4k'`: 4K UHD & Ray Tracing (Heavily GPU-bound, high VRAM)
- `'creator-ai'`: Video Editing, 3D Rendering & Local AI (Multi-core CPU, 32GB+ RAM, 16GB+ VRAM, CUDA/Tensor preference)

### 2.2 Workload-Specific Performance Calculation

For any build and workload profile, compute:
1. **Effective Workload Performance Score ($P_{\text{workload}}$):**
   - **`esports-1080p`:**
     - Scaling factor: $1.38 \times \text{rasterFps1440p}$.
     - Required CPU Score: $\min(100, \max(35, \text{round}(30 + \text{fps}_{1080p} \times 0.40)))$.
     - Bottleneck Elasticity: $\alpha = 0.70$ (steeper CPU penalty).
     - $\text{EffectiveScore} = \text{EffectiveFPS}_{1080p}$.
   - **`sweetspot-1440p`:**
     - Standard baseline ($1.0 \times \text{rasterFps1440p}$).
     - Required CPU Score: $\min(100, \max(30, \text{round}(25 + \text{fps}_{1440p} \times 0.45)))$.
     - Bottleneck Elasticity: $\alpha = 0.50$.
     - $\text{EffectiveScore} = \text{EffectiveFPS}_{1440p}$.
   - **`enthusiast-4k`:**
     - Combined 4K index: $0.58 \times \text{rasterFps1440p} \times 0.60 + 0.55 \times \text{rtFps1440p} \times 0.40$.
     - VRAM bonus/penalty: $16\text{GB}+ \implies 1.0\times$, $12\text{GB} \implies 0.92\times$, $8\text{GB} \implies 0.75\times$ (due to 4K texture paging).
     - Bottleneck Elasticity: $\alpha = 0.30$ (GPU-bound).
     - $\text{EffectiveScore} = \text{EffectiveFPS}_{4\text{k}}$.
   - **`creator-ai`:**
     - Composite productivity index (0–100):
       - $\text{RAM Score}$: $\ge 64\text{GB} \to 25$, $\ge 32\text{GB} \to 22$, $16\text{GB} \to 10$, $< 16\text{GB} \to 2$.
       - $\text{VRAM Score}$: $\ge 24\text{GB} \to 30$, $\ge 16\text{GB} \to 25$, $\ge 12\text{GB} \to 18$, $8\text{GB} \to 8$.
       - $\text{GPU AI Bonus}$: $\text{NVIDIA} \to +10$ (CUDA / Tensor cores / OptiX).
       - $\text{CPU Compute}$: $\text{gamingScore} \times 0.15 + (\text{cores} \ge 8 ? 15 : \text{cores} \times 1.8)$.
       - $\text{Storage Speed}$: $\ge 5000\text{ MB/s} \to 5$, else $2$.
       - $\text{EffectiveScore} = \text{RAM Score} + \text{VRAM Score} + \text{GPU AI Bonus} + \text{CPU Compute} + \text{Storage Speed}$.

### 2.3 System-Level Pareto Evaluation Per Workload

In `evaluateBuildParetoFrontier(builds, workloadProfile)`:
- Evaluate Pareto dominance on:
  - Objective 1: `totalPrice` (min).
  - Objective 2: `workloadScore` (max).
- A 32 GB RAM build in `creator-ai` will now naturally sit on the Pareto frontier against a cheaper 16 GB build, because its `workloadScore` is significantly higher!
- Similarly, a 7800X3D high-cache CPU will sit on the frontier for `esports-1080p` against a cheaper 6-core chip.

### 2.4 User Interface Integration

- `FullBuildExplorer`: Add a 4-button workload pill selector (`1080p Esports`, `1440p Sweet Spot`, `4K RT Enthusiast`, `Creator & AI`) in the controls section.
- `SimpleParetoGuide`: Pass `useCase` directly into `optimizeFullSystemBuilds`.
- When switching use case in Simple Guide (Step 2) or FullBuildExplorer, the recommended build dynamically adapts:
  - Under `creator-ai`: picks 32GB RAM + high VRAM GPU (e.g. RTX 4070 Ti Super 16GB / RX 7900 XT 20GB / RTX 4060 Ti 16GB).
  - Under `esports-1080p`: picks high-refresh CPU (e.g. Ryzen 7 7800X3D / i5-13600K).

---

## 3. Implementation Steps

1. **`src/lib/math/buildTypes.ts`**:
   - Add `BuildWorkloadProfile` type.
   - Add `computeBuildWorkloadScore(build: PcBuild, profile: BuildWorkloadProfile): { workloadScore: number; bottleneckFactor: number; bottleneckPct: number; metricLabel: string }`.
   - Update `PcBuild` to carry `workloadScore?: number` and `workloadProfile?: BuildWorkloadProfile`.
2. **`src/lib/math/combinatorial.ts`**:
   - Update `evaluateBuildParetoFrontier` and `optimizeFullSystemBuilds` to accept `workloadProfile: BuildWorkloadProfile`.
   - Pareto dominance compares `candidate.totalPrice` and `candidate.workloadScore`.
3. **`src/lib/math/__tests__/combinatorial.test.ts`**:
   - Add unit tests verifying:
     - Under `creator-ai`, 32GB RAM builds are Pareto-optimal and score higher than 16GB RAM builds.
     - Under `esports-1080p`, high CPU gaming scores are favored with steeper $\alpha = 0.70$.
     - Under `enthusiast-4k`, RT performance and 16GB+ VRAM are prioritized.
4. **`src/components/FullBuildExplorer.tsx` & `src/components/SimpleParetoGuide.tsx`**:
   - Wire `workloadProfile` state and pass to optimizer.
   - Display active workload badge and score in `BuildHeroCard`.

---

## 4. Testing Decisions

- Mathematical invariants:
  - Monotonicity: Higher specs on relevant workload never reduce `workloadScore`.
  - Transitivity: If Build A dominates Build B and Build B dominates Build C on the workload frontier, Build A dominates Build C.
  - Non-negativity: `workloadScore > 0` for all compatible builds.
