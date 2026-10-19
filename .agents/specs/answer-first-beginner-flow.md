# Spec: Answer-First Beginner Flow & Distraction-Free Simple Mode (`[UX-01]`, `[UX-02]`, `[UX-11]`)

**Status:** Ready to Implement  
**Date:** 2026-10-19  
**Tasks Covered:** `[UX-01]`, `[UX-02]`, `[UX-11]`, `[UX-03]`, `[UX-05]`  

---

## 1. Problem Statement

A beginner landing on ParetoPC today is confronted with:
1. **Tutorial before answer:** A 5-step lecture on microeconomics (indifference curves, Pareto frontiers, marginal trade-offs) requiring scrolling down ~4 screens on mobile before ever seeing a recommended part.
2. **Cognitive overload:** The top header displays dataset switchers (`Real GPUs`, `My Deals`, `Combined Sandbox`, `Synthetic Sandbox`), `+ Import Deals` modals, and 4 experience tiers with jargon like "Mario Kart Mode", "Combinatorial Engine", and "CPU-GPU bottleneck telemetry".
3. **Disjointed user journeys:** A user wanting a full PC must know to click "Level 4: Mario Kart Mode", which is presented as an expert workbench rather than the primary answer to "I want to build a whole PC".

---

## 2. Mathematical & Technical Solution

### 2.1 The 3-Question Intake Flow (`BeginnerIntakeCard`)

A clean, interactive questionnaire at the top of Simple Guide mode:
1. **Goal:** `[Just a Graphics Card]` vs `[A Complete PC Build]`
2. **Use Case & Resolution:**
   - `Competitive / 1080p Gaming` (Focus: Max Raster FPS per $, low latency)
   - `1440p Ultra & High Refresh` (Focus: 1440p Raster + 12GB+ VRAM sweet spot)
   - `4K & Ray Tracing Enthusiast` (Focus: Ray Tracing FPS, 16GB+ VRAM)
   - `Content Creation & AI Workloads` (Focus: 16GB+ VRAM, NVIDIA CUDA/Tensor cores)
3. **Budget Selector:**
   - Quick pills formatted in active currency:
     - USD: `[$350, $550, $800, $1200, $2000+]` (default: `$550` for GPU, `$1200` for Whole PC)
     - BRL: `[R$ 2.000, R$ 3.500, R$ 5.000, R$ 8.000, R$ 12.000+]` (default: `R$ 3.500` for GPU, `R$ 7.500` for Whole PC)

### 2.2 Immediate Answer (Above the Fold)

- **For GPU Seekers:**
  - **#1 Top Value Pick Hero Card:** Name, price, street image/icon, key shopping reason (e.g., *"Best 1440p value under $550: 16GB VRAM, 118 FPS, 0% bottleneck risk"*).
  - **2 Trade-Off Alternatives:**
    - *Step-Down Bargain:* *"Save $160 (costs $330) — still delivers 86 FPS"*
    - *Step-Up Boost:* *"Spend $50 more (costs $540) — adds +10 FPS in 1440p"*
- **For Whole-PC Seekers:**
  - Recommends the #1 Pareto Full Build for the selected budget and use case directly inside the Simple Guide, showing total price, parts breakdown (CPU, GPU, RAM, Motherboard, PSU), and bottleneck badge, with a 1-click button to *"Inspect & Swap Parts in Full Build Explorer"*.

### 2.3 Deep Mathematical Explanation as an Accordion ("Why this pick?")

The existing 5-step interactive tutorial (`SimpleParetoGuide`) and trade-off curves are preserved as an expandable, optional educational section:
- Default state: Collapsed (clean recommendation visible immediately on desktop and mobile).
- User clicks *"Learn the math behind this recommendation"*: expands the 5-step tutorial, 2-variable tug-of-war, and value curves.

### 2.4 Distraction-Free Header in Simple Mode (`[UX-02]`)

- When `uiMode === 'simple'`:
  - Hide dataset selector pills (`Synthetic`, `Custom`, `Combined`) — Simple mode always uses verified real-world benchmark data.
  - Hide `+ Import Deals` button (available in Explorer/Pro).
  - Streamline header to show only the branding, mode switcher, and active budget/currency.

---

## 3. Implementation Plan

1. **`src/components/BeginnerIntakeCard.tsx` (`[UX-01]`):**
   - Pure, accessible question stepper / tabs: Goal (`GPU` vs `PC`), Use Case, Budget.
   - Computes recommended weights and constraint overrides based on user answers.
2. **`src/components/SimpleGuidePickHero.tsx` (`[UX-01]`):**
   - Hero card for #1 pick + 2 alternative cards with plain-language shopping reasons.
3. **`src/components/SimpleParetoGuide.tsx` (`[UX-01]`, `[UX-11]`):**
   - Integrates `BeginnerIntakeCard` and `SimpleGuidePickHero` above the fold.
   - When Goal is `PC`, embeds the top recommended build from `FullBuildExplorer` with plain-language component summaries.
   - Puts the 5-step graphics/curves into an expandable accordion.
4. **`src/App.tsx` (`[UX-02]`):**
   - Conditionally render expert header controls only when `uiMode !== 'simple'`.
5. **`src/__tests__/App.ui.test.tsx` & `e2e/beginner.spec.ts`:**
   - Verify beginner sees 1 pick + 2 alternatives above the fold on mobile and desktop.
   - Verify expert controls are hidden in Simple mode.

---

## 4. Testing Decisions

- Assert that selecting `1080p Esports` prioritizes Raster FPS per dollar.
- Assert that selecting `4K & Ray Tracing` weights RT FPS and VRAM.
- Assert that selecting `Whole PC` renders full system build directly in Simple Guide.
- Verify zero regression in Explorer, Pro Lab, and Full Builds mode.
