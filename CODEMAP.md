# CODEMAP — ParetoPC (Program Skeleton)

> Agent GPS. Read this instead of traversing directories.
> For mathematical formulas and roadmap specifications, read [`CONTEXT.md`](CONTEXT.md).
> **Maintenance:** Update in the same commit that adds, moves, or splits a module. See `preflight` skill.

---

## 1. Mathematical Engine & Data Layer (`src/lib/` & `src/data/`)

Pure TypeScript modules with zero React/DOM/ECharts dependencies:

| Path | Purpose |
| :--- | :--- |
| `src/lib/math/types.ts` | **Domain Types & Metric Registry** — `GpuCandidate`, `MetricKey`, `OptimizationDirection` (`'min' \| 'max'`), `METRIC_DEFINITIONS`, `HardConstraints`, `PreferenceWeights`, `ParetoEvaluatedGpu`, `GpuValuation`, `HedonicModelSummary`, `RankedGpu` |
| `src/lib/math/buildTypes.ts` | **Phase 3 Multi-Component Domain Schemas & Compatibility Engine** — `CpuCandidate`, `MotherboardCandidate`, `RamCandidate`, `PsuCandidate`, `PcBuild`, `checkBuildCompatibility`, `computeCpuGpuBottleneck`, `estimateGpuRequiredCpuScore`, `assemblePcBuild` |
| `src/lib/math/__tests__/buildTypes.test.ts` | **Vitest Build Types & Multi-Component Suite** — 20 unit tests covering socket matching, RAM generation compatibility, PSU wattage safety headroom, bottleneck elasticity, and seed catalog integrity |
| `src/lib/math/combinatorial.ts` | **Phase 3 Combinatorial PC Optimization Engine** — `pruneDominatedCpus`, `pruneDominatedRam`, `pruneDominatedMotherboards`, `pruneDominatedPsus`, `generateCompatibleBuilds` (backtracking constraint propagation), `evaluateBuildParetoFrontier` (total price vs. effective FPS), `optimizeFullSystemBuilds` |
| `src/lib/math/__tests__/combinatorial.test.ts` | **Vitest Combinatorial Suite** — 10 unit tests for intra-category pruning, constraint propagation, build-level Pareto optimality, and full-catalog optimization |
| `src/lib/math/pareto.ts` | **Stages 1 & 2: Hard-Constraint Pruning & Pareto Dominance** — `filterByHardConstraints`, `dominates`, `buildDominanceReason` (human-readable trap diagnostics), `evaluateParetoFrontier`, `get2DParetoFrontierCurve` (staircase coordinates) |
| `src/lib/math/topsis.ts` | **Stage 3: TOPSIS Multi-Objective Ranking** — `ALL_METRIC_KEYS`, `DEFAULT_PREFERENCE_WEIGHTS`, `normalizeWeights` (with uniform fallback when sum is 0), `rankByTopsis` (vector normalization, $A^+$/$A^-$ ideal solutions, Euclidean distances $d^+$/$d^-$, closeness $C_i \in [0, 1]$) |
| `src/lib/math/regression.ts` | **Phase 2: Hedonic OLS Regression Engine** — `solveLinearSystem` (Gaussian elimination with partial pivoting), `classifyValueTier`, `computeHedonicRegression` ($\ln(\text{Price})$ vs. performance specs, fair market price $\hat{P}_i$, dollar/percent residuals, and $R^2$) |
| `src/lib/math/extrapolation.ts` | **Linear Value Extrapolation Engine** — `ExtrapolationConfig`, `evaluateLinearExtrapolation` (anchors a linear $/unit margin ray $y = (Y_0 / X_0) \cdot x$ on a selected GPU or custom target like `$1000` for `10 GB` = `$100/GB` and flags GPUs below the margin), `getClippedExtrapolationLine` |
| `src/lib/math/capabilities.ts` | **Hardware Capabilities & Ecosystem Technology Engine** — pure TypeScript inference of GPU vendors (`NVIDIA`, `AMD`, `Intel`), architectures (`Blackwell`, `Ada`, `RDNA 3`, `Battlemage`), and proprietary ecosystem features (`DLSS 3+ Frame Gen`, `FSR 3 Frame Gen`, `AV1 Video Encode`, `Hardware Ray Tracing`, `CUDA / OptiX AI & 3D`), plus dynamic facet counts |
| `src/lib/math/__tests__/capabilities.test.ts` | **Vitest Capabilities Suite** — unit tests for vendor, architecture, and technology feature inference and live facet counting |
| `src/lib/parser/gpuListingParser.ts` | **E-Commerce GPU Listing Parser Engine** — pure TypeScript parser for Portuguese and international store copy (Pichau, Terabyte, KaBuM!, PCYes, Amazon), extracts cash/PIX discounts, card installment plans, VRAM, store names, URLs, and matches benchmark specs |
| `src/lib/parser/__tests__/gpuListingParser.test.ts` | **Vitest Parser Suite** — comprehensive unit tests verifying tokenization and extraction across single and batch listings |
| `src/data/knownGpuBenchmarks.ts` | **40+ Desktop GPU Benchmark Reference Database** — 1440p Ultra raster FPS, ray tracing FPS, TDP Watts, VRAM, and chip matching aliases (`matchKnownGpuChip`) |
| `src/data/realGpus.ts` | **Phase 2 Real-World GPU Dataset** — 18 desktop GPUs (`REAL_WORLD_GPUS`) across NVIDIA, AMD, and Intel with 1440p Raster/RT geomean FPS, VRAM, TBP Watts, and retail street pricing |
| `src/data/seedComponents.ts` | **Phase 3 Seed Component Catalogs** — typed real-world CPU, Motherboard, RAM, and PSU candidates (`SEED_CPUS`, `SEED_MOTHERBOARDS`, `SEED_RAM_KITS`, `SEED_PSUS`) across AM4, AM5, LGA1700, and LGA1851 platforms |
| `src/data/seedGpus.ts` | **Phase 1 Seed Dataset** — 10 synthetic GPUs (`PHASE1_SEED_GPUS`) with known Pareto anchors and dominated `[TRAP]` cards for deterministic verification |
| `src/utils/storage.ts` | **Safe LocalStorage Layer** — `safeGetJSON`, `safeSetJSON`, `safeGetInt`, `safeGetBool`, `safeGetString`, and versioned schema migrations (`runStorageMigrations`) |
| `src/utils/currency.ts` | **Currency Formatter** — formats BRL (`R$ 3.899,99`) and USD (`$250`) |

---

## 2. Frontend UI, Hooks & Visualization Layer (`src/`)

Vite + React 18 + Tailwind CSS v4 + Apache ECharts:

| Path | Purpose |
| :--- | :--- |
| `src/main.tsx` | React DOM entry point mounting `<App />` |
| `src/hooks/useOptimizerState.ts` | **Central Optimizer State & Persistence Hook** — manages dataset mode (`'real' \| 'custom' \| 'synthetic'`), UI mode (`'simple' \| 'explorer' \| 'pro' \| 'builds'`), chart view (`'2d' \| '3d' \| 'hyper' \| 'axes' \| 'residuals'`), Stage 1–3 state, non-linear/linear extrapolation config, Hedonic OLS valuation attachment, user custom GPU database (`customGpus`), and `localStorage` persistence |
| `src/App.tsx` | **Main Optimizer Workspace** — responsive layout shell with 4-tier experience switcher (`1. Simple Guide`, `2. Explorer`, `3. Pro Lab`, `4. Full Builds`), dataset switcher with My Deals, + Import Deals modal trigger, Step 1/2 controls, and chart view switcher |
| `src/components/TopWinnerBanner.tsx` | **#1 TOPSIS Winner Banner** — top showcase banner for highest scoring GPU under active constraints and weights |
| `src/components/FullBuildExplorer.tsx` | **Phase 3 Full-Build Pareto Explorer UI ("Mario Kart Mode")** — interactive complete PC build optimizer with budget presets, custom budget slider, platform/socket filters, RAM generation filters, GPU vendor filters, hero card, trade-off alternatives, and leaderboard |
| `src/components/BuildHeroCard.tsx` | **Top Recommended Build Hero Card** — full component breakdown (CPU, GPU, RAM, Motherboard, PSU), total price, effective FPS, bottleneck telemetry, power load & headroom, and visual budget distribution bar |
| `src/components/BuildLeaderboardTable.tsx` | **Pareto Build Leaderboard Table** — complete table of Pareto-optimal and candidate full PC builds with component specs, bottleneck telemetry, and select/inspect actions |
| `src/components/GpuDealImporterModal.tsx` | **Interactive GPU Deal Importer & Validator Modal** — 3-tab modal featuring Smart Paste (with one-click templates for Pichau, Terabyte, KaBuM, PCYes), Inspect & Validate card previews (cash/PIX vs. installment selector, benchmark links, editable specs), and My Deals database manager |
| `src/components/HardwareFilterPanel.tsx` | **Brand & Ecosystem Technology Filters** — multi-select brand chips (`NVIDIA`, `AMD`, `Intel`) and proprietary technology toggles (`DLSS 3+ Frame Gen`, `FSR 3 Frame Gen`, `AV1 Video Encode`, `Hardware Ray Tracing`, `CUDA / OptiX AI & 3D`) with live candidate counts |
| `src/components/SimpleParetoGuide.tsx` | **Interactive Smart Buyer Guide** — 5-step interactive tutorial (`1. One Spec`, `2. Trade-Offs`, `3. Avoid Bad Deals`, `4. Value Frontier`, `5. Priorities & Top Picks`), inline sentence variable dropdowns, 2-variable tug-of-war & 3-variable split priority bars, live SVG Max-Utility Iso-Curve, and Top Value recommendation cards |
| `src/components/HyperDimensionalExplorer.tsx` | **4D–7D Hyper-Space Explorer** — compares 3 to 7 hardware dimensions simultaneously (`Price`, `1440p FPS`, `Ray Tracing`, `VRAM`, `Power Draw`, `FPS/$100`, `FPS/100W`) with dynamic N-D Pareto dominance evaluation and 3 interactive projections: `1. ND Parallel Dominance` (Top=100% utility pillars, Dominance Proof Ribbon, and Hypercube Gate Slicers), `2. ND Star-Glyph Scatter` (embedded $K$-pointed radar polygon glyphs at each 2D coordinate), and `3. ND RadViz Gravity Arena` (360° spring-force dimensional equilibrium) |
| `src/components/ExtrapolationToolbar.tsx` | **Linear & Non-Linear Value Extrapolation Toolbar** — interactive control bar to toggle $/unit extrapolation rules (`Linear`, `Power-Law`, `Logarithmic`, `Sweet-Spot`), switch between GPU anchor and Custom Ratio (`$1000` for `10 GB` = `$100/GB`), and repaint GPUs below the margin as bad |
| `src/components/ParetoScatterPlot.tsx` | **2D Pareto Frontier ECharts Scatter Plot** — plots valid GPUs (X/Y metric selectors, bubble size = VRAM), renders the step-function Pareto frontier curve and extrapolation curve, repaints nodes by active 2D/extrapolation status, and projects dominance vectors on hover |
| `src/components/Pareto3DCloud.tsx` | **Interactive 3D Multi-Objective Frontier Cube** — rotatable 3D perspective/orthographic projection (`Price` × `Raster FPS` × `VRAM / RT / Power`) with view-aware repainting, Utopia-corner-checked Voxel-Union Dominated Volume Hull, camera axis-pair presets (`X×Y`, `Z×Y`, `X×Z`), zoom, and pan |
| `src/components/AxisViewsGrid.tsx` | **Multi-Axis Matrix & Single-Axis Inspector** — 4-panel `2×2` grid showing Price vs. every hardware spec simultaneously with per-axis repainting, unified unoptimized shading, extrapolation rays, and a 1D Single-Axis Measurement Inspector |
| `src/components/ValueResidualsChart.tsx` | **Phase 2 Hedonic OLS Value Residuals Chart** — ECharts horizontal diverging bar chart ranking GPUs from most undervalued bargain (`-$`) to most overpriced (`+$`) against the OLS market baseline |
| `src/components/GpuLeaderboardTable.tsx` | **Ranked Leaderboard & Fair-Value Matrix** — live-sorted table displaying Pareto status, TOPSIS match score, street price, OLS Fair Market Value delta, and comparison toggles |
| `src/components/ComparisonDrawer.tsx` | **Multi-GPU Comparison Drawer** — side-by-side ECharts Radar chart, Parallel Coordinates view, and head-to-head spec delta table for 2–4 selected GPUs |
| `src/index.css` | Tailwind v4 imports, `content-visibility: auto` containment boundaries, and custom dark scrollbar |

---

## 3. Automated Tooling (`scripts/` & `.agents/scripts/`)

| Path | Purpose |
| :--- | :--- |
| `scripts/check-docs.cjs` | Validates `AGENTS.md` character cap (<12,000 chars), internal markdown links, `.agents/skills/` frontmatter, `.claude/skills/` stub parity, and the 600/800-line file cap (with a shrink-only allowlist) |
| `.github/workflows/check.yml` | CI: `npm ci`, `npm run check`, `npm run build`, plus the Playwright e2e job, on every push to `main` and every PR |
| `scripts/snap.mjs` | `npm run snap`: starts Vite and saves desktop + phone screenshots of each mode to `snapshots/` (gitignored) |
| `src/__tests__/App.ui.test.tsx` | UI smoke tests (jsdom + Testing Library): each mode renders, budget changes the Simple top pick |
| `e2e/beginner.spec.ts` | Playwright e2e (`npm run test:e2e`): "a beginner gets a recommendation" on desktop and phone |
| `eslint.config.js` / `.prettierrc.json` | Lint (zero `any`, zero type assertions except `as const`, hooks rules) and formatting, both part of `npm run check` |
| `scripts/sync-claude-skills.cjs` | Generates/updates `.claude/skills/<name>/SKILL.md` pointer stubs from `.agents/skills/` (`npm run sync:skills`) |
| `.agents/scripts/block-dangerous-git.cjs` | PreToolUse hook blocking destructive git commands (`reset --hard`, `clean -f`, `checkout .`, force-push) |
| `.agents/scripts/context-budget.cjs` | UserPromptSubmit hook warning when session context crosses 150K / 225K tokens or 8 / 24 hours |
