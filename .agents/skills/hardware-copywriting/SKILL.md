---
name: hardware-copywriting
description: Unslop and human-readable copywriting guidelines for ParetoPC. Use when writing ANY user-facing text, UI copy, trap diagnostics, slider labels, tooltips, preset descriptions, or READMEs. Eliminates AI buzzwords and translates MCDM math into clear PC-builder language.
---

# Hardware Copywriting & Unslop

Write for PC builders and hardware buyers who want to spend their budget wisely without needing a degree in Operations Research. Keep the math rigorous under the hood, and make the UI explanations sharp, direct, and concrete.

---

## 1. The Unslop Rules

Cut all robotic AI patterns, corporate pitch phrases, and empty filler.

### Banned AI Vocabulary

Delete these words on sight:
- *boasts, crucial, delve, elevate, enduring, enhance, fostering, intricate, paramount, pivotal, seamless, silky-smooth, showcase, state-of-the-art, tapestry, testament, underscore, vibrant, cutting-edge, comprehensive suite, game-changer, empower, streamline, holistic, synergy.*

### Banned Sentence Structures

- **No superficial `-ing` phrases.** Never write *"empowering builders to make informed decisions"*. Write *"flags overpriced GPUs when a faster, cheaper card exists"*.
- **No "Not only X, but Y".** State facts directly: *"TheRX 770 XT is $30 cheaper and has twice the VRAM"*, not *"Not only is the RX 770 XT cheaper, but it also boasts double the VRAM."*
- **No vague adjectives without numbers.** Never write *"significantly better performance"* when you have the exact numbers: write *"11.5% faster (+7 FPS) and $35 cheaper"*.
- **No em dashes in UI microcopy.** Use colons, periods, or commas.
- **Sentence case headings.** Write *"Hard constraint dealbreakers"*, not *"Hard Constraint Dealbreakers"*.
- **Straight quotes only.** Use `'` and `"`, never curly quotes.

---

## 2. Project Dictionary: Math Term to PC Buyer Language

The math-term → beginner → Pro dictionary (English and pt-BR) lives in [`.agents/GLOSSARY.md`](../../GLOSSARY.md). Use the beginner column in Simple mode and the Pro column in Explorer/Pro. Add a row there when you introduce a new term.

---

## 3. Verification Checklist

Before finishing any UI or copy change:
- [ ] Every trap diagnostic names the specific dominating card and the exact `$` / `FPS` / `GB` / `W` difference.
- [ ] Zero banned AI vocabulary words appear in the diff.
- [ ] Simple-mode text uses only the beginner wording from `.agents/GLOSSARY.md`.
- [ ] Units are always explicit (`$`, `FPS`, `GB`, `W`, `mm`).
