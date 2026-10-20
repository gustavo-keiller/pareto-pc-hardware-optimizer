# Spec: [BLD-08] Optional Constraints for Enthusiasts (SFF, Cooler Type, RGB & Ecosystems)

## Problem Statement

Hardware builders and enthusiasts frequently have non-negotiable physical and aesthetic constraints when selecting a complete PC build:
1. **Form Factor (SFF / Mini-ITX vs. Micro-ATX vs. Standard ATX):** Living room, dorm, or minimalist desk setups often require compact Small Form Factor (SFF / Mini-ITX) cases, whereas budget builders favor Micro-ATX, and expansion-focused users prefer standard ATX towers.
2. **Cooling Preference (Air Cooling vs. AIO Liquid Cooler):** Some users demand zero-maintenance, zero-leak air coolers (e.g. dual-tower air sinks), while others insist on sleek 240mm/360mm All-In-One (AIO) liquid coolers for lower thermal throttling on 200W+ CPUs.
3. **Aesthetics (Stealth Blackout vs. RGB Lighting):** Buyers frequently build around a visual theme — either clean, stealthy, blackout (No-RGB) workstations or vibrant RGB battle-stations.
4. **CPU Vendor Ecosystem (AMD Ryzen vs. Intel Core):** Brand loyalty, platform upgrade longevity (e.g. AM5 through 2027+), or Intel-specific instruction sets (QuickSync, AVX-512 / E-core workload scheduling) lead users to restrict the build to AMD or Intel CPUs.

Currently, ParetoPC allows selecting CPU Socket, RAM Generation, and GPU Vendor in the Full Build Explorer, but lacks direct controls for Form Factor, Cooler Type, Aesthetics, and CPU Vendor.

---

## Mathematical & Technical Solution

### 1. Domain Types (`src/lib/math/buildTypes.ts`)

Extend existing component schemas and filter criteria:

```typescript
export type FormFactorPreference = 'ALL' | 'SFF' | 'Micro-ATX' | 'ATX';
export type CoolerTypePreference = 'ALL' | 'Air' | 'AIO';
export type AestheticPreference = 'ALL' | 'RGB' | 'Stealth';
export type CpuVendorPreference = 'ALL' | 'AMD' | 'Intel';

export interface BuildFilterCriteria {
  minBudget?: number;
  maxBudget?: number;
  minEffectiveFps?: number;
  preferredSocket?: CpuSocket;
  preferredRamGeneration?: RamGeneration;
  preferredGpuVendor?: HardwareVendor;
  preferredCpuVendor?: CpuVendorPreference;
  preferredFormFactor?: FormFactorPreference;
  preferredCoolerType?: CoolerTypePreference;
  preferredAesthetic?: AestheticPreference;
  workloadProfile?: BuildWorkloadProfile;
}
```

### 2. Component Schema Extensions

- **`CaseCandidate`:**
  - `isSff?: boolean;` (true if dedicated Small Form Factor case <= 20L volume)
  - `rgb?: boolean;` (true if pre-installed fans / case has addressable RGB)
- **`CoolerCandidate`:**
  - `type: CoolerType;` ('Air' | 'AIO')
  - `rgb?: boolean;` (true if radiator/fan has ARGB lighting)
- **`RamCandidate`:**
  - `rgb?: boolean;`
- **`MotherboardCandidate`:**
  - `formFactor: MotherboardFormFactor;` ('ATX' | 'Micro-ATX' | 'Mini-ITX')
  - `rgb?: boolean;`

### 3. Constraint Filtering in Combinatorial Engine (`src/lib/math/combinatorial.ts`)

Before combinatorial backtracking and intra-category pruning:
1. **CPU Vendor:**
   If `preferredCpuVendor && preferredCpuVendor !== 'ALL'`, filter `catalogs.cpus` to `cpu.vendor === preferredCpuVendor`.
2. **Form Factor:**
   - If `'SFF'`: filter motherboards to `m.formFactor === 'Mini-ITX'` and cases to `c.supportedFormFactors.includes('Mini-ITX') && (c.isSff || !c.supportedFormFactors.includes('ATX'))`.
   - If `'Micro-ATX'`: filter motherboards to `m.formFactor === 'Micro-ATX'`.
   - If `'ATX'`: filter motherboards to `m.formFactor === 'ATX'`.
3. **Cooler Type:**
   If `preferredCoolerType && preferredCoolerType !== 'ALL'`, filter `catalogs.coolers` to `cooler.type === preferredCoolerType`.
4. **Aesthetics:**
   - If `'RGB'`: require key visual components (e.g. Case or Cooler) to feature RGB (`case.rgb === true || cooler.rgb === true`).
   - If `'Stealth'`: exclude flashy RGB components (`case.rgb !== true && cooler.rgb !== true && ram.rgb !== true`).

### 4. Backtracking & Pareto Integrity

All intra-category pruning (`pruneDominatedCpus`, `pruneDominatedMotherboards`, etc.) and branch-and-bound budget searches run safely on the filtered catalog partition. The 2D Pareto dominance evaluation on $(Price, Score)$ outputs optimal builds strictly conforming to the enthusiast constraints.

---

## Implementation Decisions

1. **`src/lib/math/buildTypes.ts`:**
   Add `FormFactorPreference`, `CoolerTypePreference`, `AestheticPreference`, `CpuVendorPreference`, and update `BuildFilterCriteria`.
2. **`src/data/seedComponents.ts`:**
   - Add Mini-ITX motherboards (`B650I`, `B550I`, `B760I`).
   - Add SFF cases (`Cooler Master NR200P`, `Lian Li A4-H2O`) and Micro-ATX cases (`Asus Prime AP201`).
   - Add AIO liquid coolers (`Thermalright Frozen Prism 240 ARGB`, `Arctic Liquid Freezer III 240 Black`, `Thermalright Aqua Elite 360 ARGB`).
   - Tag RGB vs. Stealth across cases, coolers, and RAM.
3. **`src/lib/math/combinatorial.ts` & `src/lib/math/buildSearch.ts`:**
   Enforce enthusiast constraint pre-filtering.
4. **`src/utils/shareBuild.ts`:**
   Support optional enthusiast filter parameters in URL serialization and deserialization.
5. **`src/utils/locales/`:**
   Add typed i18n keys for all enthusiast filter labels, options, and tooltips in both `pt-BR` and `en-US`.
6. **`src/components/BuildFilterControls.tsx`:**
   Add collapsible "Enthusiast Options / Filtros Avançados" drawer with button groups for Form Factor, Cooler Type, Aesthetic, and CPU Vendor.

---

## Testing Decisions

- **Unit Property Tests (`src/lib/math/__tests__/combinatorial.test.ts`):**
  - Verify `preferredFormFactor: 'SFF'` only generates builds with Mini-ITX motherboards and SFF-compatible cases.
  - Verify `preferredCoolerType: 'AIO'` only generates builds with AIO liquid coolers.
  - Verify `preferredCoolerType: 'Air'` only generates builds with Air coolers.
  - Verify `preferredAesthetic: 'Stealth'` rejects builds with RGB cases or coolers.
  - Verify `preferredCpuVendor: 'Intel'` only generates Intel CPU builds.
  - Verify `preferredCpuVendor: 'AMD'` only generates AMD CPU builds.
  - Verify that applying constraints preserves the 2D Pareto frontier property within the conforming subspace.
- **UI Tests (`src/__tests__/App.ui.test.tsx`):**
  - Verify toggling SFF filter in Full Builds mode updates leaderboard and top pick to an ITX/SFF build.
  - Verify URL sharing round-trips enthusiast filter options.

---

## Out of Scope

- Custom water loops / open loop tubing simulation (out of scope for mass PC buyers).
- Fan curve RPM / noise decibel modeling (will come with DATA-02 physical telemetry).
