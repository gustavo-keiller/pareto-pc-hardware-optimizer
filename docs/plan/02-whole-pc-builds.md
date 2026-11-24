# 02 — Whole-PC Builds: one Pareto choice from eight parts

> Phase C: **Mon 2026-12-07 → Fri 2027-02-26.** The math lives in [`CONTEXT.md`](../../CONTEXT.md); this file is the plan for what to add and in what order.

## 1. What already exists (don't rebuild it)

- 8 categories with compatibility specs (`src/lib/math/buildTypes.ts`), 124 parts (`src/data/catalogs/*.json`).
- 12 hard checks in `checkBuildCompatibility`: socket, RAM generation, CPU↔RAM, PSU wattage, RAM slot count, case form factor, GPU length, cooler height, cooler socket, cooler TDP, M.2 slots.
- Per-category dominance pruning (`intraCategoryPruning.ts`), combination search in a Web Worker (`combinatorial.ts`), build frontier, workload models for 1080p / 1440p / 4K / creator / AI (`workloadModels.ts`), upgrade mode, enthusiast constraints.

The gap is not "can we combine parts". It is: **(1)** compatibility that a builder on Reddit would trust, **(2)** letting the user say what they care about at the build level, **(3)** modelling how much a technology matters, and **(4)** scaling past 124 parts.

## 2. The model in four layers

```
 Layer 1  Hard rules         → a build is possible or not (never a score)
 Layer 2  Part pruning       → drop parts that are worse in every way that matters for builds
 Layer 3  Build objectives   → each surviving build gets a vector: price, performance, longevity, noise, power, size
 Layer 4  User priorities    → percentages turn the frontier into one pick + 2 alternatives
```

### Layer 1 — Compatibility v2 (target: Fri 2026-12-18)

Add the checks that most often break real builds. Each one becomes a `CompatibilityViolation` code with a plain-language message in i18n.

| Check | Data needed | Research |
|---|---|---|
| CPU needs a BIOS update on this board (e.g. new CPU on an older chipset) | `minBiosForCpuFamily` per board | 🔬 R-10 which boards ship with "BIOS ready" labels in BR/US stores |
| CPU without integrated graphics and no GPU selected | `hasIntegratedGraphics` per CPU | — |
| GPU power connectors vs PSU (8-pin count, 12V-2x6) | connectors per GPU and PSU | — |
| GPU thickness (slots) vs case / SFF | `slotWidth` per GPU, `maxGpuSlots` per case | — |
| RAM height vs big air coolers | `ramHeightMm`, `coolerRamClearanceMm` | — |
| Radiator size vs case mounts (AIO) | `radiatorMm`, `caseRadiatorSupport` | — |
| M.2 slot sharing disables SATA ports or slows the GPU slot | lane-sharing table per board | 🔬 R-11 hard to source; start with the 16 boards in the catalog |
| PCIe generation: x8 GPUs on PCIe 3.0 boards lose performance | `pcieLanes` per GPU, `pcieGen` per board | — |
| PSU headroom for GPU power spikes | multiplier per GPU family | 🔬 R-12 creator measurements of transient spikes |

Rule: when data for a check is missing, show a **"check this yourself"** warning, never a silent pass.

### Layer 2 — Pruning (keep the invariant)

Keep the AGENTS.md rule: prune a part only if another part is at least as good on every attribute **any** build objective uses, and fits every build it fits. When Layer 3 adds objectives (noise, longevity), the pruning attributes must grow with them, or the faster engine starts returning different answers. The existing brute-force equality test in `combinatorial.test.ts` guards this; extend it for each new objective.

### Layer 3 — Build objectives

| Objective | Direction | How it's computed | Status |
|---|---|---|---|
| Total price | min | sum of chosen offers (+ shipping later) | exists |
| Performance for the user's use | max | workload model (CPU↔GPU balance per resolution, creator/AI index) | exists, labelled estimate |
| **Longevity / upgrade path** | max | platform age + socket future + VRAM headroom + PSU headroom (see Layer 3b) | new |
| Noise / thermals | min | cooler class vs CPU TDP, case airflow class | new, coarse |
| Power use | min | estimated draw (exists) × local electricity price (BR tariffs are high) | partly exists |
| Size | min | case volume (only when the user cares) | new, optional |

Each objective must be registered in `METRIC_DEFINITIONS` with a direction (Rule 2), so Pareto, scoring and charts pick it up automatically.

### Layer 3b — Technology relevance (the "how much does this tech matter" problem)

Make it **data, not code**: a reviewed table `src/data/techRelevance.json` that gustavo can edit and that cites its sources.

```json
{
  "id": "upscaling-frame-gen",
  "appliesTo": "gpu",
  "feature": "DLSS 4 / FSR 4 frame generation",
  "relevance": { "esports-1080p": 0.1, "aaa-1440p": 0.7, "aaa-4k": 0.9, "creator": 0.1, "ai": 0.0 },
  "why": { "en-US": "…", "pt-BR": "…" },
  "sources": ["<creator test URL>"],
  "reviewedOn": "2026-12-10",
  "reviewEvery": "quarter"
}
```

- Relevance is 0–1 per workload: "how much would a buyer doing X notice this feature in the next 3 years".
- A part's **technology score** = weighted sum of the features it has. It feeds the Longevity objective and is shown as chips ("Has AV1 encoding — matters for streaming").
- Never hide it inside the performance score: users and creators must be able to see and argue with it. Pro mode shows the table.
- Start with ~15 features: VRAM ≥ 12/16 GB, upscaling + frame gen, ray tracing strength, AV1 encode, CUDA (AI/creator), DDR5, AM5 / LGA1851 socket future, PCIe 5.0 SSD (usually low for gaming), PCIe gen of GPU slot, Wi-Fi 7 / 2.5 GbE, USB4, ATX 3.1 PSU, 80+ rating, warranty years.
- 🔬 R-13: for each feature, find 1–2 measured sources (Hardware Unboxed, Gamers Nexus, TechPowerUp, Digital Foundry). Budget: ~1 evening per 5 features.
- 💡 Let creators publish their own relevance profile ("Fulano's priorities") — a shareable preset that is just different numbers in the same table. Great creator hook.

### Layer 4 — From frontier to one build

1. **No priorities set →** pick the **knee point** of the price/performance frontier (where the next R$ 500 buys the least extra performance) and say so: "Spending more than this gives little extra".
2. **Priorities set →** reuse PR #9's fixed-scale score (0–10, `priorityModel.ts`), extended from GPU metrics to build objectives. One stored profile feeds GPU and build modes.
3. **Always show three:** *Cheaper* (−15–25% price, what you lose), *Recommended*, *Stretch* (+15–25% price, what you gain). Each with one sentence.
4. **Explain per part:** "Why this CPU" + "Upgrade this part for +R$ X → +Y%". The part swapper already computes deltas.
5. **Confidence:** if the top two builds are within the score's noise (e.g. < 0.3 points), say "both are good, pick by looks/store".

## 3. Scaling past 124 parts (target: catalog ≥ 300 by Fri 2027-02-26)

Cartesian search grows fast. Plan in order, stop when fast enough:

1. Better pruning per budget band (already structured for it).
2. **Branch and bound:** build in order GPU → CPU → board → RAM → PSU → case → cooler → storage; drop a partial build when its best possible completion is dominated by a finished build.
3. **Budget split prior:** typical gaming builds spend 35–45% on GPU; try those splits first so good builds are found early and bounds tighten.
4. Keep the < 300 ms worker budget test, and add one at 300 parts.

## 4. Validation (how we know builds are good)

- 🔬 R-14: collect 30 human-made builds (creator "best PC for R$ X" videos, r/buildapc wiki builds) and compare: is ours within ±5% price for ≥ equal estimated performance? Any compatibility we flag that they missed, or vice versa?
- Add each mismatch as a test case or a data fix.
- Track "feedback: this build is wrong" reports from the footer modal.

## 5. Dates

| Week of | Deliverable |
|---|---|
| 2026-12-07 | Merge PR #9 (guided priorities) onto the launched main; spec for Layers 1–4 in `.agents/specs/` |
| 2026-12-14 | Compatibility v2 (first 6 checks) |
| 2027-01-04 | `techRelevance.json` with 15 features + sources (R-13) |
| 2027-01-18 | Longevity + noise objectives; knee-point default; three-build view |
| 2027-02-01 | Branch and bound; catalog to 200 parts (CES launches added) |
| 2027-02-22 | Catalog 300 parts; R-14 validation report |
