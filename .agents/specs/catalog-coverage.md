# Specification — Hardware Catalog Coverage Expansion (`[DATA-03]`)

> **Status:** Approved / In Implementation  
> **Phase:** Phase 3 ("Real, fresh data")  
> **Scope:** Expansion of all 8 physical hardware catalogs (`cpus.json`, `gpus.json`, `motherboards.json`, `ram.json`, `storage.json`, `coolers.json`, `cases.json`, `psus.json`) to provide broad market coverage across current and previous hardware generations.

---

## 1. Context & Objectives

Currently, ParetoPC ships with seed catalogs containing 72 components:
- 18 GPUs
- 12 CPUs (AM4, AM5, LGA1700)
- 13 Motherboards
- 9 RAM kits
- 3 Storage drives
- 5 Coolers
- 5 Cases
- 7 PSUs

To provide real, dependable build recommendations and upgrade evaluations for any user entering the site, we need comprehensive market coverage across:
1. **GPUs:** Current gen (RTX 50 series, RTX 40 series, RX 7000 series, Arc B-series Battlemage) and previous gen (RTX 30 series, RX 6000 series, Arc A-series Alchemist) covering $150 entry up to $1,999 flagship.
2. **CPUs:** Modern AM5 (9000 and 7000 series), legacy value champion AM4 (5000 and 3000 series), Intel LGA1700 (14th, 13th, and 12th gen), and newest Intel LGA1851 (Core Ultra 200S / Arrow Lake).
3. **Motherboards:** Sockets AM4 (A520, B550), AM5 (A620, B650, X670), LGA1700 (H610, B760, Z790), and LGA1851 (B860, Z890) across ATX, Micro-ATX, and Mini-ITX form factors.
4. **RAM:** DDR4 (16GB, 32GB @ 3200-3600MHz) and DDR5 (32GB, 64GB @ 6000-6400MHz CL30/CL32) with RGB and low-profile non-RGB stealth variants.
5. **Storage:** NVMe PCIe 4.0 and PCIe 3.0 SSDs across 500GB, 1TB, 2TB, and 4TB with rated read speeds.
6. **Coolers:** Budget single-tower air coolers, dual-tower heavy air coolers, compact low-profile coolers, and 240mm/360mm AIO liquid coolers with brackets covering AM4, AM5, LGA1700, and LGA1851.
7. **Cases:** High-airflow ATX mid-towers, compact Micro-ATX towers, and Mini-ITX SFF chassis with explicit clearance specs.
8. **Power Supplies:** 550W to 1000W 80+ Bronze and Gold ATX 3.0 power supplies with modularity options.

---

## 2. Invariants & Rules
1. **Zero Broken Compatibility (Rule 6):** Every CPU socket MUST have at least 2 matching motherboards across different form factors and at least 2 compatible coolers.
2. **Every RAM generation (DDR4, DDR5)** must be supported by matching CPUs and motherboards.
3. **Physical Clearances:** Cooler heights, GPU lengths, and case allowances must strictly reflect real manufacturer specifications.
4. **Benchmark & Spec Provenance:** Every row must include `source` (TechPowerUp, Hardware Unboxed, manufacturer specs) and valid `checkedAt` date (`2026-10-20`).
5. **Execution Speed Guard:** Combinatorial build search on expanded catalogs must preserve branch-and-bound lower bound budget pruning and execution time budgets.

---

## 3. Validation & Testing
- Automated schema validation via `npm run check:catalogs` (`scripts/validate-catalogs.cjs`).
- Referential integrity asserting every socket has motherboards and coolers in `src/data/__tests__/catalogs.test.ts`.
- End-to-end combinatorial builder property tests verifying builds can be generated for all platforms.
