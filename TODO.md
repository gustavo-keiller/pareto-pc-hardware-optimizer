# ParetoPC — Roadmap & Task Board (`TODO.md`)

> Active engineering tasks, each with a stable ID. When an item ships, delete it from here and add a summary line to [`DONE.md`](DONE.md).

---

## 🧩 Phase 3: Combinatorial Full-System Builder ("Mario Kart Mode")

- **`[P3-02]` Pre-Pruned Combinatorial Engine & Bottleneck Model (`src/lib/math/combinatorial.ts`):**
  Eliminate dominated parts per category first, enforce socket (`CPU.socket === Motherboard.socket`), RAM generation, and PSU headroom (`(CPU.tdp + GPU.tdp + 75) * 1.25 <= PSU.wattage`), and compute system `EffectiveFPS` using the CPU-GPU bottleneck formula.
- **`[P3-03]` Full-Build Pareto Explorer UI:**
  Build the interactive "Mario Kart Mode" view allowing users to explore Pareto-optimal complete PC builds across total budget vs. effective system FPS.
