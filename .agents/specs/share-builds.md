# Spec: Save & Share Builds (URL Encoding & Copy Parts List) (`[BLD-07]`)

**Status:** Ready to Implement  
**Date:** 2026-10-19  
**Tasks Covered:** `[BLD-07]` (Phase 2 Roadmap Milestone)  

---

## 1. Problem Statement

Hardware builders and buyers frequently consult friends, communities (Reddit r/buildapc, Discord servers, WhatsApp groups, Adrenaline/Hardware.com.br forums) before spending $1,000+ or R$ 5.000+.

Currently:
1. There is no way to save a build or send it to someone else without manually taking screenshots or retyping all 8 components.
2. URL state is empty, so refreshing or copying the browser link resets the app back to defaults.
3. No formatted copyable parts list exists for posting to online hardware forums or chat apps.

---

## 2. Technical Design

### 2.1 Pure URL Encoding & Decoding Engine (`src/utils/shareBuild.ts`)

Pure TypeScript module with zero DOM/React dependencies for encoding, decoding, and formatting:

```typescript
export interface BuildShareParams {
  cpuId?: string;
  gpuId?: string;
  moboId?: string;
  ramId?: string;
  psuId?: string;
  storageId?: string;
  caseId?: string;
  coolerId?: string;
  budget?: number;
  workload?: BuildWorkloadProfile;
  currency?: 'USD' | 'BRL';
  buildId?: string;
}

export function encodeBuildShareUrl(
  params: BuildShareParams,
  baseUrl = window.location.origin,
): string;

export function decodeBuildShareUrl(search: string): BuildShareParams | null;

export function formatBuildShareText(
  build: PcBuild,
  shareUrl: string,
  currency: 'USD' | 'BRL',
  locale: AppLocale,
): string;
```

### 2.2 Text / Markdown Formatting Rules (Unslop)

Formatted specifically for multi-platform sharing (Discord markdown formatting with bolding, Reddit tables/lists, WhatsApp bolding `*`):

- **Header:** Emphasizes verified value and Pareto optimality:
  `🖥️ ParetoPC Build Recommendation`
  `💰 Total: R$ 6.120,00 | 🎯 Workload: 1440p Sweet Spot (112 FPS) | ⚡ Power: 410W (650W PSU)`
- **8-Component List:** Clean bullet list with verified model names, key capacity specs, and sockets.
- **Footer:** Direct clickable link back to ParetoPC.

### 2.3 URL Parameter Schema

Compact, standard query string:
`?mode=builds&cpu=cpu-ryzen-5600&gpu=rtx-4070-super&mobo=mobo-b550m-vdh&ram=ram-32gb-ddr4-3600&psu=psu-650w-gold&storage=ssd-1tb-nvme-fast&case=case-montech-air100&cooler=cooler-ak400&workload=sweetspot-1440p&budget=6000&curr=BRL`

### 2.4 UI Integration

1. **`BuildHeroCard.tsx`:**
   - Add a "Share / Compartilhar" button in the hero card header banner.
   - Clicking reveals a share modal or dropdown with:
     - 1-click **Copy Share Link** (with visual feedback: "Copied! / Copiado!").
     - 1-click **Copy Forum / Discord List** (with formatted parts list).
2. **`App.tsx` & `FullBuildExplorer.tsx`:**
   - Detect query parameters on boot:
     - If query contains `mode=builds` or component parameters, initialize `uiMode` to `'builds'` and restore `workload`, `currency`, `maxBudget`, and preselect the shared build.

---

## 3. Invariants & Safety

- **Strict Validation (Rule 5 & Rule 7):** `decodeBuildShareUrl` parses incoming search params safely using type guards; malformed query strings or invalid component IDs fallback cleanly without throwing or crashing.
- **Safe Storage (Rule 6):** URL restoration does not overwrite user's saved local custom GPUs or preferences unless explicitly navigating via link.
- **Copy Fallback:** Robust clipboard copy utility using `navigator.clipboard.writeText` with legacy `document.execCommand('copy')` fallback for restrictive iframe environments or older mobile web views.
