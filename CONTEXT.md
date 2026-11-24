# PROJECT SPECIFICATION: ParetoPC — Multi-Objective Hardware & PC Build Optimizer

## 1. Project Overview & Core Philosophy
We are building an interactive hardware decision-support and data visualization web application inspired by Antoine Mayerowitz's "Mario Meets Pareto" study.

Hardware buyers (starting with GPUs, expanding to full PC builds) face a Multi-Criteria Decision Making (MCDM) problem: they must simultaneously minimize Cost and Power Consumption (TBP) while maximizing Rasterization FPS, Ray Tracing FPS, and VRAM capacity.

Our system solves this using a 4-stage mathematical pipeline:
1. **Hard-Constraint Pruning** (Step-function dealbreakers like budget, minimum VRAM, physical dimensions, and wattage limits).
2. **Pareto Dominance Analysis** (Identifying the Pareto Frontier and flagging strictly dominated "bad-value trap" hardware).
3. **TOPSIS Multi-Objective Ranking** (Using user-defined preference weights to calculate the geometric distance to the Positive and Negative Ideal Solutions).
4. **Combinatorial System Optimization** (Combining CPU + GPU + RAM + Motherboard + PSU into full PC builds using pre-pruned Pareto components and CPU-GPU bottleneck modeling).

---

## 2. Recommended Tech Stack
- **Frontend Framework:** Vite + React with TypeScript.
- **Styling & UI:** Tailwind CSS + Lucide icons + custom accessible components.
- **2D & Multi-Dimensional Visualization:** Apache ECharts (`echarts` + `echarts-for-react`) for 2D Pareto scatter plots, step-function dominance boundaries, Radar charts, and Parallel Coordinates plots.
- **State & Math Engine:** Pure, modular TypeScript functions in `/src/lib/math/` with zero UI coupling, backed by Vitest unit tests.

---

## 3. Mathematical Engine Specifications

### 3.1 Directionality of Objectives
Every hardware metric $j$ has an optimization direction:
- **Minimize ($\min$):** `price` ($), `tdpWatts` (W), `lengthMm` (mm).
- **Maximize ($\max$):** `rasterFps1440p`, `rtFps1440p`, `vramGb`, `computeScore`.

### 3.2 Stage 1: Hard-Constraint Filtering
Given a candidate set $S$ and user constraints $C$:
$$S_{\text{valid}} = \{ x \in S \mid x.\text{price} \le C.\text{maxPrice} \land x.\text{vramGb} \ge C.\text{minVram} \land x.\text{tdpWatts} \le C.\text{maxWatts} \}$$

### 3.3 Stage 2: Pareto Dominance & Frontier Identification
Given a subset of active objectives $M$ chosen by the user:
A candidate $A$ **Pareto-dominates** candidate $B$ ($A \succ B$) if and only if:
1. For ALL active objectives $m \in M$, $A$ is at least as good as $B$:
   - If $m$ is maximized: $A_m \ge B_m$
   - If $m$ is minimized: $A_m \le B_m$
2. For AT LEAST ONE active objective $m \in M$, $A$ is strictly better than $B$:
   - If $m$ is maximized: $A_m > B_m$
   - If $m$ is minimized: $A_m < B_m$

- **Pareto Optimal Set (The Frontier):** All candidates $x \in S_{\text{valid}}$ that are NOT dominated by any other candidate in $S_{\text{valid}}$.
- **Dominance Depth / Trap Diagnostic:** For every dominated item $B$, store an array `dominatedBy: string[]` listing the IDs of all candidates (and specifically Pareto-optimal items) that strictly beat it.

### 3.4 Stage 3: TOPSIS Ranking (Technique for Order of Preference by Similarity to Ideal Solution)
To rank candidates according to user slider weights $w = [w_1, w_2, \dots, w_k]$ where $\sum w_j = 1$:

1. **Vector Normalization:** For each candidate $i$ and metric $j$:
   $$r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{i=1}^{N} x_{ij}^2}}$$
2. **Weighted Normalized Matrix:**
   $$v_{ij} = w_j \cdot r_{ij}$$
3. **Determine Ideal Best ($A^+$) and Ideal Worst ($A^-$):**
   - For maximized metrics: $A_j^+ = \max_i(v_{ij})$, $A_j^- = \min_i(v_{ij})$
   - For minimized metrics: $A_j^+ = \min_i(v_{ij})$, $A_j^- = \max_i(v_{ij})$
4. **Euclidean Distances to Ideal Best and Worst:**
   $$d_i^+ = \sqrt{\sum_{j=1}^{k} (v_{ij} - A_j^+)^2}, \quad d_i^- = \sqrt{\sum_{j=1}^{k} (v_{ij} - A_j^-)^2}$$
5. **Relative Closeness Score ($C_i \in [0, 1]$):**
   $$C_i = \frac{d_i^-}{d_i^+ + d_i^-}$$
   Sort candidates descending by $C_i$. A score closest to 1.0 is the optimal match for the user's sliders.

TOPSIS is relative to the current list: adding or removing any card moves $A^+$/$A^-$ and can reorder the others (rank reversal), and a weight's real pull depends on how spread out that column is. Explorer and Pro keep it as a second opinion; Simple mode ranks with §3.5.

### 3.5 Stage 3b: Priority Score on Fixed Scales (Simple mode, `priorityModel.ts`)
Each priority $j$ has a scale with anchors that never come from the other cards: `worst` (0) and `best` (1), set by constants or by the user's own settings (budget, FPS goal, VRAM goal).

1. **Value:** $t = \mathrm{clamp}\big((x_{ij} - \text{worst}_j)/(\text{best}_j - \text{worst}_j), 0, 1\big)$; linear $v = t$, saturating $v = 1 - (1-t)^2$ ("good enough"), threshold $v = [t \ge 1]$ (yes/no features). If worst > best, lower is better, so direction is built into the scale.
2. **Score:** $S_i = 10 \sum_j s_j v_{ij}$ with $s_j = w_j / \sum w$ (uniform when all $w_j = 0$). Points per priority $10 s_j v_{ij}$ add up exactly to $S_i$.
3. **No rank reversal:** $S_i$ uses only card $i$'s numbers, so adding or removing other cards never reorders the rest.
4. **Better alternative (set aside):** $A$ beats $B$ when, on every priority with $w_j > 0$, $A$ is no worse than $B$ by more than 3% (exact for yes/no) and is better by more than 3% on at least one. Falls back to exact comparison if nothing would remain.
5. **Flip point:** the sign of $S_w - S_c$ is the sign of $N = \sum_j w_j (v_{wj} - v_{cj})$, which is linear in each $w_k$, so the smallest whole-number weight at which challenger $c$ passes winner $w$ is exact: $w_k^\* = (N - w_k \Delta_k)/(-\Delta_k)$ with $\Delta_k = v_{wk} - v_{ck}$.
6. **Practical tie:** $|S_1 - S_2| < 0.2$ points (about the noise of the benchmarks).

---

## 4. Phased Implementation Roadmap

### PHASE 1: Synthetic GPU Sandbox
Build the complete math engine and interactive dashboard using a controlled dataset of 10 synthetic "Custom GPUs" (see Section 5).
- **Deliverables:**
  1. `/src/lib/math/pareto.ts` & `/src/lib/math/topsis.ts` with 100% unit test coverage.
  2. Interactive 2D Scatter Plot (X-axis selector, Y-axis selector, bubble size = VRAM) that draws the Pareto Frontier curve and shades the dominated region.
  3. Hover inspection showing exact trade-offs and highlighting which specific cards dominate a hovered "trap" card.
  4. Dynamic Preference Sliders (Price, Raster FPS, Ray Tracing, VRAM, Power Efficiency) that recalculate TOPSIS scores in real time and highlight the #1 recommended card on the frontier.
  5. Radar / Parallel Coordinates comparison drawer when selecting 2–4 GPUs.

### PHASE 2: Real-World GPU Dataset & Value Regression
- Replace synthetic data with normalized outcome benchmarks (1440p/4K Raster Geomean FPS, RT Geomean FPS, VRAM capacity, TBP Watts, and retail pricing).
- Add **Hedonic OLS Regression** ($\ln(\text{Price})$ vs. Performance metrics) to compute fair-market baseline price and flag undervalued vs. overpriced GPUs based on residuals.

### PHASE 3: Combinatorial Full-System Builder ("Mario Kart Mode")
Treat a PC build as a tuple: `Build = (CPU, GPU, RAM, Motherboard, PSU)`.
- **Pre-Pruning:** Eliminate dominated components within each category before generating combinations.
- **Compatibility Constraints:**
  - `CPU.socket === Motherboard.socket`
  - `RAM.generation === Motherboard.ramGeneration`
  - `(CPU.tdp + GPU.tdp + 75) * 1.25 <= PSU.wattage`
- **System Bottleneck Formula:**
  $$\text{EffectiveFPS} = \text{GPU}_{\text{FPS}} \times \min\left(1.0, \left(\frac{\text{CPU}_{\text{GamingScore}}}{\text{GPU}_{\text{RequiredCpuScore}}}\right)^\alpha\right)$$

---

## 5. Phase 1 Seed Data: Synthetic "Custom GPUs" for Verification

```json
[
  { "id": "gpu-1", "name": "Apex 4050 Lite", "price": 220, "rasterFps1440p": 52, "rtFps1440p": 25, "vramGb": 8, "tdpWatts": 115, "notes": "Entry Pareto anchor (cheapest)" },
  { "id": "gpu-2", "name": "Vortex RX 760", "price": 260, "rasterFps1440p": 68, "rtFps1440p": 32, "vramGb": 8, "tdpWatts": 145, "notes": "Budget Pareto optimal" },
  { "id": "gpu-3", "name": "Apex 3060 Legacy [TRAP]", "price": 295, "rasterFps1440p": 61, "rtFps1440p": 29, "vramGb": 8, "tdpWatts": 170, "notes": "Strictly dominated by Vortex RX 760" },
  { "id": "gpu-4", "name": "Vortex RX 770 XT", "price": 380, "rasterFps1440p": 94, "rtFps1440p": 54, "vramGb": 16, "tdpWatts": 195, "notes": "Mid-range sweet spot Pareto optimal" },
  { "id": "gpu-5", "name": "Apex 4065 Ti 8GB [TRAP]", "price": 410, "rasterFps1440p": 88, "rtFps1440p": 52, "vramGb": 8, "tdpWatts": 165, "notes": "Overpriced 8GB trap; dominated on price/FPS/VRAM by RX 770 XT" },
  { "id": "gpu-6", "name": "Nova Arc B850", "price": 330, "rasterFps1440p": 82, "rtFps1440p": 48, "vramGb": 12, "tdpWatts": 180, "notes": "Pareto optimal bridge card" },
  { "id": "gpu-7", "name": "Apex 4075 Super", "price": 560, "rasterFps1440p": 122, "rtFps1440p": 86, "vramGb": 16, "tdpWatts": 220, "notes": "High-tier Pareto optimal (strong RT & efficiency)" },
  { "id": "gpu-8", "name": "Vortex RX 7850 [TRAP]", "price": 590, "rasterFps1440p": 118, "rtFps1440p": 64, "vramGb": 16, "tdpWatts": 265, "notes": "Strictly dominated by Apex 4075 Super" },
  { "id": "gpu-9", "name": "Vortex RX 7900 Pro", "price": 680, "rasterFps1440p": 142, "rtFps1440p": 88, "vramGb": 20, "tdpWatts": 290, "notes": "Pareto optimal raster/VRAM monster" },
  { "id": "gpu-10", "name": "Apex 4085 Ultra", "price": 950, "rasterFps1440p": 168, "rtFps1440p": 124, "vramGb": 24, "tdpWatts": 320, "notes": "Flagship Pareto anchor (highest performance)" }
]
```
