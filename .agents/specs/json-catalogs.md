# Spec: Versioned JSON Hardware Catalogs with Schema Validation (`[DATA-01]`)

## Problem Statement

Hardware catalogs (`SEED_CPUS`, `SEED_GPUS`, `SEED_MOTHERBOARDS`, `SEED_RAM_KITS`, `SEED_STORAGES`, `SEED_CASES`, `SEED_COOLERS`, `SEED_PSUS`, and `REAL_GPUS`) currently live as hardcoded TypeScript object literals in `src/data/seedComponents.ts` and `src/data/realGpus.ts`.

This design has three critical limitations:
1. **No Data Provenance:** Rows lack audit metadata documenting benchmark sources, price origins, and verification dates, making it impossible to audit where numbers came from.
2. **High Friction for Updates:** Updating prices or adding new hardware requires editing TypeScript source code and rebuilding the app, preventing future automated ingestion (`[DATA-04]`, `[DATA-06]`).
3. **No Automated Schema Validation at Build Time:** A typo in a spec attribute (e.g., misspelled form factor or missing socket) is only caught if a test happens to hit that branch.

## Mathematical & Technical Solution

### 1. Catalog JSON Schema & Structure

Create `src/data/catalogs/` containing 8 versioned JSON files:
- `cpus.json`
- `gpus.json`
- `motherboards.json`
- `ram.json`
- `storage.json`
- `coolers.json`
- `cases.json`
- `psus.json`

Every component object conforms to its category candidate schema (`CpuCandidate`, `GpuCandidate`, etc.) and includes mandatory provenance metadata:
- `source`: Non-empty string citing the benchmark or price origin (e.g., `"TechPowerUp 2024 GPU Benchmark / MSRP"`, `"AMD Ark / Retail"`, `"Tom's Hardware Cooler Test"`)
- `checkedAt`: ISO 8601 date string (e.g., `"2026-10-20"`)

### 2. Validation Engine (`scripts/validate-catalogs.cjs`)

A standalone Node.js validation script that validates all JSON catalogs during `npm run check` and `npm run check:catalogs`:
- **Schema conformance:** Checks that every entry has all mandatory fields for its category.
- **Value bounds & numeric sanity:** Validates prices ($ > 0$), clock speeds, wattages, dimensions, and capacities are finite positive numbers.
- **Provenance integrity:** Asserts `source` is a non-empty string and `checkedAt` is a valid ISO date on every single item.
- **ID uniqueness:** Verifies all component IDs are unique within their category.
- **Enum sanity:** Verifies CPU sockets (`'AM4' | 'AM5' | 'LGA1700' | 'LGA1851'`), RAM generations (`'DDR4' | 'DDR5'`), cooler types (`'Air' | 'AIO'`), and motherboard form factors (`'ATX' | 'Micro-ATX' | 'Mini-ITX'`).

### 3. TypeScript Loader Layer

`src/data/seedComponents.ts` and `src/data/realGpus.ts` will import the validated JSON files, cast them through typed validation guards, and re-export `SEED_CPUS`, `SEED_GPUS`, etc., with 100% backwards compatibility so no consumer code breaks.

## Implementation Decisions

- **Files to create:**
  - `src/data/catalogs/cpus.json`
  - `src/data/catalogs/gpus.json`
  - `src/data/catalogs/motherboards.json`
  - `src/data/catalogs/ram.json`
  - `src/data/catalogs/storage.json`
  - `src/data/catalogs/coolers.json`
  - `src/data/catalogs/cases.json`
  - `src/data/catalogs/psus.json`
  - `scripts/validate-catalogs.cjs`
  - `src/data/__tests__/catalogs.test.ts`
- **Files to modify:**
  - `src/lib/math/buildTypes.ts`: Add optional `source?: string` and `checkedAt?: string` to component candidate interfaces (or base candidate).
  - `src/lib/math/types.ts`: Add optional `source?: string` and `checkedAt?: string` to `GpuCandidate`.
  - `src/data/seedComponents.ts`: Re-export data imported from JSON.
  - `package.json`: Add `"check:catalogs"` script and integrate it into `"check"`.
  - `CODEMAP.md`: Document `src/data/catalogs/` and `scripts/validate-catalogs.cjs`.

## Testing Decisions

- `src/data/__tests__/catalogs.test.ts`:
  - Asserts all 8 catalogs load properly in Node/Vitest.
  - Asserts all components have non-empty `source` and valid `checkedAt` dates.
  - Asserts no duplicate IDs exist across any catalog.
  - Asserts compatibility cross-references (e.g. CPU sockets match motherboard sockets).
- `scripts/validate-catalogs.cjs`:
  - Runs in `npm run check`, failing with non-zero exit code on malformed JSON or invalid schema values.

## Out of Scope

- Live price scraping (deferred to `[DATA-04]` and `[DATA-06]`).
- YouTube benchmark ingestion pipeline (deferred to `[DATA-02]`).
