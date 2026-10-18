---
name: mcdm-math-engine
description: Mathematical invariants, directionality rules, numerical stability guards, and testing requirements for ParetoPC's 4-stage MCDM pipeline (Hard Constraints, Pareto Dominance, TOPSIS, Hedonic OLS Regression, and Combinatorial System Optimization). Use whenever editing or adding files in src/lib/math/.
---

# MCDM Math Engine Skill (`src/lib/math/`)

Playbook for authoring and modifying the mathematical decision engine in `src/lib/math/`.

---

## 1. Non-Negotiable Invariants

1. **Zero UI Coupling:** Files in `src/lib/math/` must never import React, DOM APIs, `localStorage`, or ECharts. They take plain typed objects and return plain typed objects.
2. **Directionality Authority (`METRIC_DEFINITIONS`):**
   - Never assume a metric is maximized or minimized via hardcoded `<` or `>` branches.
   - Always lookup `const dir = METRIC_DEFINITIONS[metric].direction` (`'min' | 'max'`).
   - Minimized metrics (`'min'`): `price`, `tdpWatts`, `lengthMm`.
   - Maximized metrics (`'max'`): `rasterFps1440p`, `rtFps1440p`, `vramGb`, `computeScore`.
3. **Degenerate Input Guards (No `NaN` / `Infinity`):**
   - **Empty Candidates (`candidates.length === 0`):** Return `[]` (or `{ frontierGpus: [], stepLineCoords: [] }`) immediately.
   - **Single Candidate (`candidates.length === 1`):** Candidate is Pareto-optimal (`isParetoOptimal: true`, `rank: 1`, `frontierRank: 1`, `topsisScore: 1.0`).
   - **All-Zero Weights:** `normalizeWeights()` must fall back to uniform weights `1 / ALL_METRIC_KEYS.length` when $\sum w_j \le 0$.
   - **Zero Column Norm / Identical Metric Values:** In TOPSIS vector normalization, if $\sqrt{\sum x_{ij}^2} = 0$, set $r_{ij} = 0$. If $d_i^+ + d_i^- = 0$, set $C_i = 1.0$.
4. **Deterministic Tie-Breaking:**
   - When comparing `topsisScore` ($C_i$), treat differences $\le 10^{-9}$ (`1e-9`) as tied.
   - Break ties by: (1) `isParetoOptimal` first, (2) lower `price`, (3) lexicographical `id`.

---

## 2. Stage-by-Stage Mathematical Contracts

### Stage 1: Hard-Constraint Filtering (`filterByHardConstraints`)
$$S_{\text{valid}} = \{ x \in S \mid x.\text{price} \le C.\text{maxPrice} \land x.\text{vramGb} \ge C.\text{minVram} \land x.\text{tdpWatts} \le C.\text{maxWatts} \}$$
- Missing/undefined constraint fields default to non-restrictive bounds (`maxPrice = Infinity`, `minVram = 0`, `maxWatts = Infinity`).

### Stage 2: Pareto Dominance (`dominates`, `evaluateParetoFrontier`)
Candidate $A$ dominates $B$ ($A \succ B$) across active objectives $M$ iff:
1. $\forall m \in M$: $A$ is at least as good as $B$ ($A_m \ge B_m$ for `'max'`, $A_m \le B_m$ for `'min'`).
2. $\exists m \in M$: $A$ is strictly better than $B$ ($A_m > B_m$ for `'max'`, $A_m < B_m$ for `'min'`).
- **Transitivity Rule:** For finite candidate sets, every dominated candidate $B$ is dominated by at least one **Pareto-optimal** candidate. `dominatedBy` and `dominanceReasons` must prioritize Pareto-optimal dominators so users are never told to buy another dominated card.

### Stage 3: TOPSIS (`rankByTopsis`)
1. Normalize weights: $w_j = \max(0, W_j) / \sum \max(0, W_k)$.
2. Vector normalize: $r_{ij} = x_{ij} / \sqrt{\sum_{i=1}^N x_{ij}^2}$.
3. Weight: $v_{ij} = w_j \cdot r_{ij}$.
4. Ideal Best $A_j^+$ and Ideal Worst $A_j^-$:
   - If `direction === 'max'`: $A_j^+ = \max_i v_{ij}$, $A_j^- = \min_i v_{ij}$.
   - If `direction === 'min'`: $A_j^+ = \min_i v_{ij}$, $A_j^- = \max_i v_{ij}$.
5. Euclidean distances $d_i^+$, $d_i^-$ and Closeness $C_i = d_i^- / (d_i^+ + d_i^-) \in [0, 1]$.

### Phase 2: Hedonic OLS Regression (`regression.ts`)
- Fit $\ln(\text{Price}_i) = \beta_0 + \sum_k \beta_k X_{ik} + \epsilon_i$.
- Predicted fair price: $\hat{P}_i = \exp(\hat{y}_i)$.
- Value residual: $\text{residualUsd} = P_i - \hat{P}_i$ (negative = undervalued bargain; positive = overpriced).
- Guard matrix inversion ($X^T X$) against collinearity or $N \le p + 1$.

### Phase 3: Combinatorial Full-System Builder (`combinatorial.ts`)
1. **Pre-prune** each component list (`CPU`, `GPU`, `RAM`, `Motherboard`, `PSU`) individually before Cartesian combination.
2. **Compatibility checks:**
   - `cpu.socket === motherboard.socket`
   - `ram.generation === motherboard.ramGeneration`
   - `(cpu.tdpWatts + gpu.tdpWatts + 75) * 1.25 <= psu.wattage`
3. **Bottleneck Effective FPS:**
   $$\text{EffectiveFPS} = \text{GPU}_{\text{FPS}} \times \min\left(1.0, \left(\frac{\text{CPU}_{\text{GamingScore}}}{\text{GPU}_{\text{RequiredCpuScore}}}\right)^\alpha\right)$$

---

## 3. Verification Step

After any edit to `src/lib/math/`:

```bash
npx vitest run src/lib/math/__tests__/math.test.ts
npx tsc --noEmit
```
