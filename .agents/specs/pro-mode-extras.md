# Spec: Pro-Mode Extras ([UX-08])

## Problem Statement

Power users and hardware analysts in Level 3 ("Pro Lab") need fine-grained control and transparency over the TOPSIS MCDM engine:
1. **Named Weight Profiles:** Power users spend time fine-tuning weights across the 5 objectives (Price, Raster FPS, RT FPS, VRAM, TDP). When switching between testing workloads or refreshing the page, their custom calibrations are lost unless they can save named profiles.
2. **Data Export (CSV / JSON):** Analysts cannot currently extract the ranked Pareto evaluation, TOPSIS metrics ($C_i, d^+, d^-$), and OLS hedonic residuals into external data science tools (Python, Excel, R) without manual scraping.
3. **Full Multi-Criteria Score Breakdown:** The composite TOPSIS score $C_i \in [0, 1]$ feels like a black box without inspecting the individual Euclidean distance vectors $(v_{ij} - v_j^+)^2$ and $(v_{ij} - v_j^-)^2$, preventing power users from seeing *why* a specific GPU ranked higher (e.g. was it driven by VRAM headroom or raster price-efficiency?).

## Mathematical & Technical Solution

### 1. Named Weight Profiles (`localStorage` + State Hook)
- Type definition:
  ```ts
  export interface SavedWeightProfile {
    id: string;
    name: string;
    createdAt: number;
    weights: PreferenceWeights;
  }
  ```
- Safe storage via `safeGetJSON<SavedWeightProfile[]>` and `safeSetJSON` in key `'paretopc_saved_weight_profiles_v1'`.
- Operations: Save current weights under a user-defined name, Load profile (sets weights and marks active), and Delete profile.
- UI: Modular component `CustomWeightProfilesManager` integrated cleanly inside `TopsisWeightsPanel.tsx`.

### 2. Result Data Export (CSV & JSON)
- Pure utility module `src/utils/exportData.ts`:
  - `exportRankedGpusToCsv(gpus: RankedGpu[], currency: Currency, locale: AppLocale): string`: RFC 4180 compliant CSV generator with headers (`Rank,Model,Verdict,Score,Price,FairPrice,Residual,RasterFps,RtFps,VramGb,TdpWatts,IsParetoOptimal,DominanceReasons`).
  - `exportRankedGpusToJson(gpus: RankedGpu[], weights: PreferenceWeights, currency: Currency): string`: Structured JSON schema with timestamp, criteria weights, currency, and ranked GPU candidates.
  - `downloadDataFile(filename: string, content: string, mimeType: string): void`: Browser blob download trigger.
- UI: Download buttons `[CSV]` and `[JSON]` rendered in the leaderboard table toolbar and Pro Lab view.

### 3. Multi-Criteria TOPSIS Score Breakdown
- Pure math function in `src/lib/math/topsis.ts`:
  ```ts
  export interface MetricScoreBreakdown {
    metric: MetricKey;
    direction: 'min' | 'max';
    rawVal: number;
    normalizedVal: number; // r_ij
    weight: number; // normalized w_j
    weightedVal: number; // v_ij = w_j * r_ij
    idealBest: number; // v_j^+
    idealWorst: number; // v_j^-
    diffBestSq: number; // (v_ij - v_j^+)^2
    diffWorstSq: number; // (v_ij - v_j^-)^2
    closenessPct: number; // Metric proximity to best [0, 100]
  }

  export interface TopsisScoreBreakdown {
    gpuId: string;
    gpuName: string;
    topsisScore: number;
    topsisScorePct: number;
    distanceToBest: number;
    distanceToWorst: number;
    metrics: MetricScoreBreakdown[];
  }
  ```
- Computes exact contribution of each metric to $d^+$ and $d^-$, exposing whether a metric pulled the card towards $A^+$ or pushed it towards $A^-$.
- UI: Third tab (`'radar' | 'parallel' | 'breakdown'`) in `ComparisonDrawer.tsx` rendering an interactive breakdown grid for compared GPUs.

## Implementation Decisions

1. `src/lib/math/topsis.ts`:
   - Implement `computeTopsisBreakdown(candidate: RankedGpu, allCandidates: RankedGpu[], rawWeights: Partial<PreferenceWeights>): TopsisScoreBreakdown`.
2. `src/lib/math/__tests__/topsisBreakdown.test.ts`:
   - Unit tests verifying Euclidean reconstruction identity: $\sqrt{\sum \text{diffBestSq}} = d_i^+$ and $\sqrt{\sum \text{diffWorstSq}} = d_i^-$.
3. `src/utils/exportData.ts` & `src/utils/__tests__/exportData.test.ts`:
   - Pure CSV and JSON serialization utilities, tested with edge-case characters, commas, and quotes.
4. `src/components/CustomWeightProfilesManager.tsx`:
   - Deep module (< 250 lines) managing saved profiles, safe `localStorage` synchronization, and i18n copy.
5. `src/components/TopsisWeightsPanel.tsx`:
   - Host `CustomWeightProfilesManager`.
6. `src/components/ComparisonDrawer.tsx`:
   - Add 'breakdown' tab with clear visual indicators for ideal best/worst distances.
7. `src/components/GpuLeaderboardTable.tsx`:
   - Add export buttons `[CSV]` and `[JSON]` for instant download.

## Testing Decisions

- Invariant test: Euclidean sum of square differences per metric must equal $(d_i^+)^2$ within `1e-9` floating-point tolerance.
- Monotonicity test: A candidate with identical specs except strictly better VRAM must have lower $\text{diffBestSq}$ for VRAM.
- CSV export test: Verify RFC 4180 quoting for names containing commas, quotes, and newlines.
- UI test in `App.ui.test.tsx`:
  - Saving a weight profile, modifying sliders, and restoring the saved profile.
  - Triggering CSV and JSON export functions.
  - Inspecting TOPSIS score breakdown in Comparison Drawer.

## Out of Scope

- Cloud server sync for profiles (strictly `localStorage` per D-2 serverless architecture).
