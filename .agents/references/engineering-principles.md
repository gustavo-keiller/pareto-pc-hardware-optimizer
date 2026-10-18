# 21 Foundational Engineering Principles

Extracted and adapted from `pstack` (by Lauren Tan, React Core Team / Meta / Netflix / Cursor).

---

## Core Principles

### 1. Laziness Protocol (`principle-laziness-protocol`)

- **When to apply:** Refactoring, sizing a diff, or tempted to add abstractions, layers, or signal threading.
- **Rule:** Bias toward deletion and the smallest change that solves the problem. If deleting code makes the architecture simpler while preserving behavior, delete it.

### 2. Foundational Thinking (`principle-foundational-thinking`)

- **When to apply:** Before writing logic: choosing core types and data structures (`GpuCandidate`, `MetricDefinition`, `RankedGpu`), sequencing scaffold-vs-feature work.
- **Rule:** Get the data structures right so downstream code becomes obvious.

### 3. Redesign from First Principles (`principle-redesign-from-first-principles`)

- **When to apply:** Integrating a new requirement into an existing design.
- **Rule:** Redesign as if the requirement had been a foundational assumption from day one, instead of bolting on edge-case flags or conditionals.

### 4. Subtract Before You Add (`principle-subtract-before-you-add`)

- **When to apply:** Sequencing an addition, refactor, or rewrite.
- **Rule:** Remove dead weight, redundant validators, and stub references first, then build on the simpler base.

### 5. Minimize Reader Load (`principle-minimize-reader-load`)

- **When to apply:** Reviewing or shaping code that is hard to trace.
- **Rule:** Count layers between question and answer, and hidden state in the reader's head; collapse one-caller wrappers and shrink mutable scope.

### 6. Outcome-Oriented Execution (`principle-outcome-oriented-execution`)

- **When to apply:** Planned rewrites and migrations with explicit phase boundaries.
- **Rule:** Converge on the target architecture; do not preserve smooth intermediate states with throwaway compatibility code.

### 7. Experience First (`principle-experience-first`)

- **When to apply:** Product, UX, or feature-scope tradeoffs.
- **Rule:** Choose user delight over implementation convenience; ship fewer polished features over more rough ones.

### 8. Exhaust the Design Space (`principle-exhaust-the-design-space`)

- **When to apply:** A novel interaction or architectural decision with no precedent.
- **Rule:** Build 2-3 competing interfaces/designs and compare side by side before committing.

### 9. Build the Lever (`principle-build-the-lever`)

- **When to apply:** Any non-trivial work, not just bulk work: edits, migrations, analyses, checks.
- **Rule:** Build the tool that does it or proves it (script, property test, or verification harness) instead of working by hand. The tool is the artifact a reviewer can rerun.

---

## Architecture Principles

### 10. Model the Domain (`principle-model-the-domain`)

- **When to apply:** Writing stateful logic, or code that branches a lot or repeats a shape assumption across files.
- **Rule:** Encode the domain in a structure (typed registry like `METRIC_DEFINITIONS`, discriminated union, pure reducer) instead of scattered conditionals.

### 11. Boundary Discipline (`principle-boundary-discipline`)

- **When to apply:** Wiring validation, error handling, or storage/data adapters.
- **Rule:** Concentrate guards at system boundaries (`localStorage`, imported JSON, URL params); trust internal types and keep business/math logic in pure functions.

### 12. Type System Discipline (`principle-type-system-discipline`)

- **When to apply:** Designing types or a signature in TypeScript.
- **Rule:** Make illegal states unrepresentable, brand semantic primitives when needed, parse external data at boundaries, refuse to lie to the compiler (`no as`), exhaust variants (`_exhaustive: never`).

### 13. Make Operations Idempotent (`principle-make-operations-idempotent`)

- **When to apply:** Designing migrations, state normalizers, or scripts.
- **Rule:** Converge to the same end state regardless of partial prior runs.

### 14. Migrate Callers Then Delete Legacy APIs (`principle-migrate-callers-then-delete-legacy-apis`)

- **When to apply:** Introducing a new internal API while old callers exist.
- **Rule:** Migrate callers and delete the old API in the same wave instead of preserving compatibility layers indefinitely.

### 15. Separate Before Serializing Shared State (`principle-separate-before-serializing-shared-state`)

- **When to apply:** Multiple components or hooks reading/writing shared state.
- **Rule:** Keep derived state (`evaluateParetoFrontier`, `rankByTopsis`) computed purely via `useMemo` rather than synchronizing duplicate state copies.

---

## Verification Principles

### 16. Prove It Works (`principle-prove-it-works`)

- **When to apply:** After completing a task, before declaring done.
- **Rule:** Verify against the real artifact (run the tests, inspect the output/diff), not a proxy, self-report, or "it compiles".

### 17. Fix Root Causes (`principle-fix-root-causes`)

- **When to apply:** Debugging defects or performance regressions.
- **Rule:** Trace each symptom to its root cause and fix it there; reproduce first, ask why until you reach it, resist null-check guards that silence bugs.

### 18. Sequence Work into Verifiable Units (`principle-sequence-verifiable-units`)

- **When to apply:** Multi-step work and how you stack commits.
- **Rule:** Break work into small units that each end in a verifiable state, check each before the next, and order delivery so the sequence proves itself.

---

## Delegation & Meta Principles

### 19. Guard the Context Window (`principle-guard-the-context-window`)

- **When to apply:** Large outputs, long files, repeated reads, fan-out planning.
- **Rule:** Route bulk exploration to subagents; keep concise summaries in the main thread.

### 20. Never Block on the Human (`principle-never-block-on-the-human`)

- **When to apply:** Reversible choices during execution.
- **Rule:** Pick the safer/simpler default, log the assumption in `.agents/CURRENT_STATE.md`, proceed, and let the human course-correct; reserve blocking for irreversible actions.

### 21. Encode Lessons in Structure (`principle-encode-lessons-in-structure`)

- **When to apply:** Catching a repeated mistake or rule violation.
- **Rule:** Encode the rule as a code-level guardrail (a shared type, property test, or `scripts/check-docs.cjs` rule) instead of adding more text to an instruction file.
