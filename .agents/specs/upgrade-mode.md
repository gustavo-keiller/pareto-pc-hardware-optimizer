# Spec: [BLD-06] Upgrade Mode ("I Already Have...")

## Problem Statement

Most hardware buyers do not build a completely new PC from scratch; instead, they own existing components (e.g., an AM4 motherboard, DDR4 memory kit, 550W power supply, or a graphics card) and want to know:
1. What is the single best component or combination of components to upgrade for their budget?
2. Will the new parts physically fit their existing motherboard socket, RAM generation, case dimensions, and PSU wattage headroom?
3. What is the exact performance leap (+FPS or productivity boost) relative to the money spent?

Currently, ParetoPC only optimizes greenfield 8-component builds from scratch. Users who already own parts cannot lock their hardware, meaning they see recommendations containing components they do not need to buy, distorting the budget allocation.

---

## Mathematical & Technical Solution

### 1. Data Model (`OwnedHardwareProfile`)

An owned hardware profile identifies the components the user already possesses:

```typescript
export interface OwnedHardwareProfile {
  cpu?: CpuCandidate;
  gpu?: GpuCandidate;
  motherboard?: MotherboardCandidate;
  ram?: RamCandidate;
  psu?: PsuCandidate;
  storage?: StorageCandidate;
  pcCase?: CaseCandidate;
  cooler?: CoolerCandidate;
}
```

### 2. Upgrade Cost Accounting

For any full 8-component build candidate $B = (c, g, m, r, p, s, k, cl)$:
- If component $X$ is identical to the owned component (by ID), its new expenditure is $\$0$.
- If component $X$ is upgraded (new part from catalog), its new expenditure is $X.\text{price}$.
- $\text{upgradeCost}(B) = \sum_{X \in \text{new parts}} X.\text{price}$.
- Budget constraint: $\text{upgradeCost}(B) \le \text{maxUpgradeBudget}$.

### 3. Physical Compatibility Enforcement

When components are owned and retained:
- **Motherboard Retained:** Enforces CPU socket match ($c.\text{socket} == m.\text{socket}$), RAM generation match ($r.\text{generation} == m.\text{ramGeneration}$), cooler socket bracket compatibility, and M.2 NVMe slot limits.
- **CPU Retained:** Enforces motherboard socket match, cooler socket compatibility, and cooler TDP capability ($\text{cooler}.\text{maxTdpWatts} \ge c.\text{tdpWatts}$).
- **PSU Retained:** Enforces total system power safety:
  $$\text{estimatedWatts} = c.\text{tdpWatts} + g.\text{tdpWatts} + 80\text{W}$$
  $$\text{recommendedWatts} = \text{calculateRecommendedPsuWattage}(\text{estimatedWatts})$$
  $$\text{psu}.\text{wattage} \ge \text{recommendedWatts}$$
  If a candidate GPU would overload the owned PSU, that combination is disqualified unless the user unlocks/replaces the PSU.
- **Case Retained:** Enforces motherboard form factor compatibility, GPU clearance ($g.\text{lengthMm} \le \text{case}.\text{maxGpuLengthMm}$), and cooler clearance ($\text{cooler}.\text{heightMm} \le \text{case}.\text{maxCoolerHeightMm}$).
- **Cooler Retained:** Enforces CPU socket mounting bracket match and TDP rating $\ge c.\text{tdpWatts}$.
- **RAM Retained:** Enforces motherboard RAM generation match.

### 4. Baseline & Performance Delta Calculation

- **Baseline Score ($S_{\text{base}}$):**
  - If the user provides at least CPU and GPU from their current setup, compute $S_{\text{base}}$ using `calculateEffectiveGamingFps` or `calculateWorkloadPerformanceScore`.
  - If the user only specifies partial parts (e.g. only motherboard + PSU), $S_{\text{base}}$ is 0 (relative gains shown as absolute scores).
- **Upgrade Score ($S_{\text{upgraded}}$):**
  - Workload score evaluated across the assembled upgraded system.
  - $\Delta S = \max(0, S_{\text{upgraded}} - S_{\text{base}})$.
  - $\% \text{ Gain} = \frac{\Delta S}{S_{\text{base}}} \times 100\%$ (when $S_{\text{base}} > 0$).

### 5. Multi-Objective Upgrade Pareto Frontier

Evaluate the 2D Pareto frontier:
- Objective 1: Minimize $\text{upgradeCost}$ ($C_{\text{upgrade}}$).
- Objective 2: Maximize $\text{upgradedScore}$ ($S_{\text{upgraded}}$).

An upgrade candidate $A$ strictly dominates $B$ if:
$$C_{\text{upgrade}}(A) \le C_{\text{upgrade}}(B) \quad \land \quad S(A) \ge S(B)$$
with at least one strict inequality.

---

## Implementation Decisions

1. **Pure Math Engine (`src/lib/math/upgradeOptimizer.ts`):**
   - Independent pure module (preserves `combinatorial.ts` under 800-line limit).
   - Functions: `optimizeUpgradePaths`, `evaluateUpgradeParetoFrontier`, `validateOwnedHardwareCompatibility`.
   - Comprehensive Vitest unit tests in `src/lib/math/__tests__/upgradeOptimizer.test.ts`.

2. **UI Integration (`src/components/UpgradePlannerModal.tsx` & `FullBuildExplorer.tsx`):**
   - In `FullBuildExplorer.tsx`, add an "Upgrade Mode" / "Modo Upgrade" toggle switch.
   - When active, allows locking owned parts directly from seed component pickers or quick presets (e.g. "Popular AM4 Base: B550 + 16GB DDR4 + 550W PSU").
   - Displays upgrade cost, FPS gain delta (+XX% over existing setup), and component swap badges ("Keep" vs. "New").

3. **Plain-Language Copywriting:**
   - Unslop, shopping-centric copy in both `pt-BR` and `en-US` ("Manter Peça Atual" vs. "Comprar Nova", "Ganho de FPS", "Custo do Upgrade").

---

## Testing Decisions

- **Test Suite (`src/lib/math/__tests__/upgradeOptimizer.test.ts`):**
  1. *Zero-cost accounting:* Retained parts contribute $0 to `upgradeCost`.
  2. *Socket preservation:* Locking an AM4 motherboard permits only AM4 CPUs.
  3. *PSU wattage guard:* Locking a 550W PSU rejects power-hungry GPUs (e.g. RTX 4080 / RX 7900 XTX) that would overload it.
  4. *Case clearance guard:* Locking a compact case rejects oversized triple-fan GPUs.
  5. *Pareto frontier:* Higher upgrade cost must deliver strictly higher performance.
  6. *Boundary cases:* Empty catalog, all parts locked (cost = $0), impossible constraints (no valid upgrades).
- **UI Tests (`src/__tests__/App.ui.test.tsx`):**
  - Verify Upgrade Mode toggle renders, owned parts can be selected, and upgrade recommendations update.

---

## Out of Scope

- Live real-time hardware scanning via local OS agents (users pick their parts from catalog).
- Used/second-hand market valuation of replaced parts (focus is on new retail upgrade cost).
