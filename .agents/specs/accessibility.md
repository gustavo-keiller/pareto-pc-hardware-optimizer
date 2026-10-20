# Spec: Accessibility & Accessible Chart Alternatives ([UX-09])

## Problem Statement

Screen readers (NVDA, VoiceOver, JAWS) and keyboard-only users face critical accessibility barriers in ParetoPC:
1. **Charts are Inaccessible:** Apache ECharts (`<canvas>`) and custom SVG scatter plots cannot be parsed by screen readers. A blind or low-vision user navigating Simple Guide or Explorer mode receives zero information about which hardware components are on the Pareto frontier or which are bad value traps.
2. **Missing Table Alternatives:** WCAG 2.1 Success Criterion 1.1.1 (Non-text Content) and 1.3.1 (Info and Relationships) require a text/table alternative for data visualizations.
3. **Keyboard Focus & Landmarks:** Visual focus rings must be clear and unobstructed across all interactive elements, and major page landmarks must be identifiable.

## Solution

### 1. Screen-Reader Table Alternative for `SimpleGuideScatterPlot.tsx`
- Render an accessible `<table className="sr-only">` within `SimpleGuideScatterPlot.tsx` with caption and table headers:
  - Caption: Summary of axes (X: Price in active currency, Y: 1440p Raster FPS), total candidate count, and active budget ceiling.
  - Columns: Model name, Price, 1440p Raster FPS, Match/Verdict category (Best Value / Good Deal / Bad Value Trap).
  - Screen reader users can navigate through data points with standard table reading shortcuts (e.g. `Ctrl+Alt+Arrows`).

### 2. ECharts Canvas Landmark & Accessible Description
- In `ParetoScatterPlot.tsx`:
  - Mark chart container with `role="region"`, `aria-label={t('chartAriaScatterPlot', locale)}`, and `aria-describedby="gpu-leaderboard-table"`.
  - Provide an accessible note for assistive tech indicating that complete tabular data is available immediately in the leaderboard table below.
- In `ValueResidualsChart.tsx`:
  - Embed an accessible `<table className="sr-only">` with caption, listing each GPU's actual price, fair market price from OLS regression, residual delta, and valuation tier (`bargain` / `fair` / `overpriced`).

### 3. Landmark & Keyboard Focus Polish
- Add a visually-hidden `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>` link at the top of the application shell in `App.tsx`.
- Wrap the main application layout in `<main id="main-content" tabIndex={-1}>`.
- Add explicit `aria-label` to navigation regions and level toggle buttons.
- Ensure all interactive buttons, selects, and checkboxes provide clear `focus-visible:ring-2 focus-visible:ring-emerald-500` styles.

## Implementation Decisions

1. `src/utils/locales/`:
   - Add localized keys for chart aria-labels, captions, and table alternatives in `types.ts`, `ptBR.ts`, and `enUS.ts`.
2. `src/components/SimpleGuideScatterPlot.tsx`:
   - Add `<table className="sr-only">` with full GPU candidate details.
3. `src/components/ValueResidualsChart.tsx`:
   - Add `<table className="sr-only">` with OLS regression residual details.
4. `src/components/ParetoScatterPlot.tsx`:
   - Add accessibility region attributes and descriptive hint for screen readers.
5. `src/App.tsx`:
   - Add Skip to Content link and semantic `<main>` landmark.

## Testing Decisions

- Test in `src/__tests__/App.ui.test.tsx`:
  - Assert existence of accessible skip-link (`screen.getByRole('link', { name: /pular para o conteúdo|skip to content/i })`).
  - Assert existence of screen-reader accessible tables for `SimpleGuideScatterPlot` and `ValueResidualsChart`.
  - Verify semantic `<main>` landmark with role `"main"`.
