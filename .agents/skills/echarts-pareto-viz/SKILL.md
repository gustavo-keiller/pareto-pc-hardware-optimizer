---
name: echarts-pareto-viz
description: Guidelines for building and updating Apache ECharts visualizations in ParetoPC (2D Pareto scatter plots, step-function dominance boundaries, radar charts, and parallel coordinates). Use when editing ParetoScatterPlot.tsx, ComparisonDrawer.tsx, or adding new charts.
---

# ECharts Pareto Visualization Skill

Rules and coordinate conventions for rendering multi-objective hardware visualizations in `src/components/ParetoScatterPlot.tsx` and `src/components/ComparisonDrawer.tsx`.

---

## 1. 2D Pareto Frontier Staircase Geometry (`ParetoScatterPlot.tsx`)

When plotting a 2D slice `(xMetric, yMetric)`:

1. **Slice-Specific Frontier:** The 2D frontier curve (`get2DParetoFrontierCurve(candidates, xMetric, yMetric)`) evaluates Pareto dominance strictly on the 2 plotted axes `[xMetric, yMetric]`, while point colors/badges can reflect either the 2D slice or the N-dimensional active objective set.
2. **Sorting Along X-Axis:**
   - Read `xDir = METRIC_DEFINITIONS[xMetric].direction` and `yDir = METRIC_DEFINITIONS[yMetric].direction`.
   - Sort 2D frontier points along `xMetric` from "best X" to "worst X" (`a[xMetric] - b[xMetric]` when `xDir === 'min'`, or descending when `xDir === 'max'`).
3. **Step-Function Direction (`step` in ECharts):**
   - For standard `Price (min)` on X vs. `FPS (max)` on Y, moving left-to-right (increasing price) requires higher FPS to enter the frontier -> step transitions hold the previous Y level until the next higher-FPS card is reached (`step: 'end'`).
   - Always verify that the shaded dominated region (`areaStyle`) lies on the **dominated side** of the staircase, never covering the utopia corner.

---

## 2. Hover & Selection Interaction Contracts

1. **Hovering a Dominated ("Trap") Card:**
   - Highlight the hovered card in red/amber.
   - Highlight all Pareto-optimal cards in `gpu.dominatedBy` on the scatter plot with a pulsing ring or connector line so the user immediately sees *which* cards beat it.
2. **Top #1 TOPSIS Recommendation:**
   - Visually distinguish the `rank === 1` GPU (gold/emerald halo or star badge) so slider adjustments produce immediate visual feedback on the chart.
3. **Bubble Sizing:**
   - Map `symbolSize` monotonically to `vramGb` (clamped to a readable pixel range, e.g. `14px` to `34px`) so 8GB vs. 16GB vs. 24GB differences are visible at a glance.

---

## 3. Radar & Parallel Coordinates (`ComparisonDrawer.tsx`)

1. **Direction-Aware Normalization for Radar Axes:**
   - Users intuitively read "outer edge of radar = better".
   - For maximized metrics (`FPS`, `VRAM`), higher raw values map toward the outer ring.
   - For minimized metrics (`Price`, `TBP Watts`), **invert the radar axis or normalize as Efficiency/Savings** (or clearly label `Lower is better` with inverted `max`/`min` bounds) so a cheaper, lower-power card expands outward rather than shrinking inward.
2. **Comparison Count Cap:**
   - Keep Radar / Parallel comparison between **2 and 4 GPUs** (`MAX_COMPARE = 4`). More than 4 overlapping polygons become unreadable.

---

## 4. Verification Step

After editing any chart component:

```bash
npm run check
```

If running the dev server (`npm run dev`), test all 4 axis combinations:
- `min` X vs `max` Y (e.g. Price vs. 1440p Raster FPS)
- `min` X vs `min` Y (e.g. Price vs. Power TBP)
- `max` X vs `max` Y (e.g. 1440p Raster FPS vs. 1440p RT FPS)
- Empty state (set `maxPrice` slider below the cheapest GPU) to confirm ECharts renders without console errors.
