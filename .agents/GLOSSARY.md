# Glossary — math term → beginner words → Pro words

> The one home for ParetoPC vocabulary. Use it whenever you write UI copy, tooltips, or docs.
> **Simple mode** uses only the *Beginner* columns (no "Pareto", "frontier", "utility", "dominated", "TOPSIS").
> **Explorer/Pro** use the *Pro* column, with the beginner wording as a hover definition.
> The UI starts in pt-BR with English second (decision D-1), so beginner wording is given in both.
> When you add a metric, stage, or part category, add its row here in the same commit.

## Core ranking terms

| Math / code (`src/lib/math/`) | Beginner (en) | Beginner (pt-BR) | Pro |
| :--- | :--- | :--- | :--- |
| Hard constraints, `filterByHardConstraints()` | Your limits: budget, minimum memory, power supply | Seus limites: orçamento, memória mínima, fonte | Dealbreakers / hard constraints |
| Pareto-optimal, `isParetoOptimal` | Good deal: nothing else is better at everything for less | Bom negócio: nenhuma outra é melhor em tudo por menos | Frontier pick (Pareto-optimal) |
| Pareto frontier | The best-deal line: the cards worth considering | A linha dos bons negócios | Pareto frontier |
| Dominated, `isDominated` / value trap | Skip it: another card is cheaper *and* faster | Evite: outra placa é mais barata *e* mais rápida | Dominated (value trap) |
| `buildDominanceReason()` | "Skip X: Y is $35 cheaper and 11% faster" (always name the card and the numbers) | "Evite X: Y custa R$ 180 a menos e é 11% mais rápida" | Dominated by Y (Δ$, ΔFPS) |
| 2D frontier (`frontier2D`) | Best deals when you only compare these two things | Melhores negócios comparando só essas duas coisas | 2D slice frontier |
| N-D frontier (`paretoOptimalND`), 5D specialist | Good deal because of something else (more memory, better ray tracing, less power) | Bom negócio por outro motivo (mais memória, ray tracing, menos consumo) | N-D optimal / 5D specialist |
| Preference weights, `PreferenceWeights` | What matters most to you | O que mais importa para você | Weights $w_j$ |
| Priority profile, `PriorityProfile` / importance stars | What matters to you (0–5 stars) | O que importa para você (0–5 estrelas) | Priority weights $w_j$ on fixed scales |
| Priority score $S_i$, `scoreByPriorities()` | "7.8/10 for you" (always out of 10, never a %) | "Nota 7,8/10 para você" | Weighted value score (MAUT) |
| `findBetterAlternatives()` | Set aside: another card is as good or better on everything you picked | Deixada de lado: outra placa é igual ou melhor em tudo o que você escolheu | Dominated on weighted criteria (3% tolerance) |
| Flip point, `findFlipPoint()` | "Raise Ray tracing to 35% and X takes the lead" | "Suba Ray tracing para 35% e a X passa à frente" | Weight sensitivity / stability interval |
| `isPracticalTie()` | Practically tied | Praticamente empatada | Within benchmark noise (< 0.2 pts) |
| TOPSIS closeness $C_i$, `topsisScorePct` | Match: how well it fits what you asked for (0–100%) | Combina: o quanto atende ao que você pediu (0–100%) | TOPSIS closeness $C_i$ |
| Ideal best / worst $A^+$ / $A^-$ | — (don't show) | — (não mostrar) | Positive / negative ideal solution |
| Utility $u_{i,d}$ (normalized 0–1) | Score on this spec (100% = best on the market) | Nota neste item (100% = melhor do mercado) | Normalized utility |
| Hedonic OLS fair price $\hat{P}$ | Usual price for what it offers | Preço justo pelo que entrega | Hedonic OLS fair value |
| OLS residual (negative / positive) | Below / above its usual price (−$45 / +$60) | Abaixo / acima do preço justo (−R$ 200) | Residual (Δ$ vs $\hat{P}$) |
| Extrapolation margin (`ExtrapolationConfig`) | Your price-per-spec rule ("at most $100 per GB") | Sua regra de preço por item ("no máximo R$ 500 por GB") | Linear / power-law extrapolation |
| Metric direction `'min'` / `'max'` | Lower is better / Higher is better | Menor é melhor / Maior é melhor | Direction (min/max) |

## Hardware terms

| Code | Beginner (en) | Beginner (pt-BR) | Pro |
| :--- | :--- | :--- | :--- |
| `rasterFps1440p` | Gaming speed at 1440p | Desempenho em jogos (1440p) | 1440p raster FPS (geomean) |
| `rtFps1440p` | Ray tracing speed (realistic lighting) | Desempenho com ray tracing | 1440p RT FPS |
| `vramGb` | Video memory (more lasts longer) | Memória de vídeo (VRAM) | VRAM (GB) |
| `tdpWatts` | Power use (affects power supply and heat) | Consumo de energia | TBP / TDP (W) |
| `price`, `priceCash` | Price / cash (PIX) price | Preço / preço à vista (PIX) | Street price |
| `selectedVendors`, `inferGpuVendor()` | Brand (NVIDIA, AMD, Intel) | Marca (NVIDIA, AMD, Intel) | Vendor filter |
| `requiredFeatures`, `KNOWN_GPU_TECHNOLOGIES` | Must-have features (frame generation, AV1 streaming, CUDA for AI/3D) | Recursos obrigatórios (geração de quadros, streaming AV1, CUDA para IA/3D) | Ecosystem technology filter |
| `inferGpuArchitecture()` | Generation (e.g. RTX 40, RX 7000) | Geração (ex.: RTX 40, RX 7000) | Architecture |

## Full-build terms (Phase 2 builder, planned)

| Math / code | Beginner (en) | Beginner (pt-BR) | Pro |
| :--- | :--- | :--- | :--- |
| Build tuple `(CPU, GPU, RAM, Motherboard, PSU)` | Your PC | Seu PC | Build |
| Intra-category pre-pruning | We drop bad-value parts first, then try full PCs | Descartamos peças ruins antes de montar os PCs | Per-category Pareto pre-pruning |
| Compatibility rejection | "This case is 18 mm too short for that card" (always the reason) | "Este gabinete é 18 mm curto demais para essa placa" | Constraint violation |
| CPU↔GPU bottleneck, `EffectiveFPS` | The processor holds the graphics card back | O processador limita a placa de vídeo | Bottleneck-adjusted FPS |
