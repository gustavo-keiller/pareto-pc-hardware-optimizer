/**
 * i18n.ts — Lightweight typed dictionary and localization helper for ParetoPC.
 * Supports Brazil-first testing ('pt-BR' default) and English ('en-US').
 * Complies with GLOSSARY.md for beginner-friendly, jargon-free hardware copywriting.
 */

export type AppLocale = 'pt-BR' | 'en-US';

export function isAppLocale(val: unknown): val is AppLocale {
  return val === 'pt-BR' || val === 'en-US';
}

export const DEFAULT_LOCALE: AppLocale = 'pt-BR';

export interface Translations {
  // Navigation & Mode Bar
  modeSimple: string;
  modeExplorer: string;
  modePro: string;
  modeBuilds: string;
  datasetReal: string;
  datasetCustom: string;
  datasetSynthetic: string;
  datasetCombined: string;
  importDeals: string;
  languageToggle: string;

  // Beginner Intake
  intakeStep1Title: string;
  intakeGoalGpu: string;
  intakeGoalGpuDesc: string;
  intakeGoalPc: string;
  intakeGoalPcDesc: string;
  intakeStep2Title: string;
  intakeUc1080pTitle: string;
  intakeUc1080pDesc: string;
  intakeUc1440pTitle: string;
  intakeUc1440pDesc: string;
  intakeUc4kTitle: string;
  intakeUc4kDesc: string;
  intakeUcAiTitle: string;
  intakeUcAiDesc: string;
  intakeStep3Title: string;
  intakeBudgetMax: string;

  // Recommendations & Heroes
  heroTopPickBadge: string;
  heroTopBuildBadge: string;
  heroStepDownTitle: string;
  heroStepDownTag: string;
  heroStepUpTitle: string;
  heroStepUpTag: string;
  heroWhyThisPick: string;
  heroWhyThisPickInspect: string;
  heroExploreBuild: string;
  heroGoodDealBadge: string;
  heroMatchScore: string;
  heroCompareSpecs: string;
  heroInComparison: string;
  heroSelectedComparison: string;
  heroTotalBuildCost: string;
  heroEstimatedFps: string;
  heroPsuHeadroom: string;
  heroBottleneckBalanced: string;
  heroBottleneckCpu: string;
  heroTrapBadge: string;

  // Components & Parts
  partCpu: string;
  partGpu: string;
  partRam: string;
  partMotherboard: string;
  partPsu: string;
  partStorage: string;
  partCase: string;
  partCooler: string;

  // Math Guide Accordion
  mathGuideToggleShow: string;
  mathGuideToggleHide: string;
  mathGuideHeading: string;
  mathGuideSubheading: string;
}

export const TRANSLATIONS: Record<AppLocale, Translations> = {
  'pt-BR': {
    modeSimple: '1. Guia Simples',
    modeExplorer: '2. Explorador',
    modePro: '3. Laboratório Pro',
    modeBuilds: '4. Montar PC',
    datasetReal: 'GPUs Reais (18)',
    datasetCustom: 'Meus Preços',
    datasetSynthetic: 'Didático (10)',
    datasetCombined: 'Sandbox Brasil',
    importDeals: '+ Importar Preços',
    languageToggle: 'Idioma',

    intakeStep1Title: 'Passo 1 • O que você deseja montar?',
    intakeGoalGpu: 'Apenas Placa de Vídeo',
    intakeGoalGpuDesc:
      'Para quem já tem um computador e quer um upgrade gráfico.',
    intakeGoalPc: 'Um PC Completo',
    intakeGoalPcDesc:
      'Todos os 8 componentes balanceados prontos para ligar e jogar.',
    intakeStep2Title: 'Passo 2 • Estilo de Jogo & Resolução',
    intakeUc1080pTitle: '1080p Competitivo / Econômico',
    intakeUc1080pDesc:
      'Máximo FPS por real para Valorant, CS2, Fortnite e jogos rápidos.',
    intakeUc1440pTitle: '1440p Alta Resolução (Ponto Ideal)',
    intakeUc1440pDesc:
      'Melhor custo-benefício com 12GB+ de VRAM para lançamentos modernos.',
    intakeUc4kTitle: '4K & Ray Tracing Entusiasta',
    intakeUc4kDesc:
      'Visual impressionante com traçado de raios realista e 16GB+ de VRAM.',
    intakeUcAiTitle: 'Criação & Inteligência Artificial',
    intakeUcAiDesc:
      'Muito VRAM e núcleos CUDA para edição 4K, 3D e rodar IA localmente.',
    intakeStep3Title: 'Passo 3 • Limite Máximo de Orçamento',
    intakeBudgetMax: 'Limite de Orçamento',

    heroTopPickBadge: '#1 Recomendação • Melhor Custo-Benefício',
    heroTopBuildBadge: '#1 Recomendação • PC Completo Ideal',
    heroStepDownTitle: 'Alternativa Econômica',
    heroStepDownTag: 'Economize dinheiro',
    heroStepUpTitle: 'Opção Superior',
    heroStepUpTag: 'Mais desempenho',
    heroWhyThisPick: 'Por que recomendamos:',
    heroWhyThisPickInspect:
      'Por que esta escolha? Ver a curva de valor e opções',
    heroExploreBuild: 'Inspecionar & Trocar Peças no Montador →',
    heroGoodDealBadge: 'Bom Negócio',
    heroMatchScore: 'Combina',
    heroCompareSpecs: '+ Comparar',
    heroInComparison: 'Na Comparação',
    heroSelectedComparison: 'Selecionado para Comparação',
    heroTotalBuildCost: 'Custo Total do Hardware',
    heroEstimatedFps: 'Desempenho Estimado',
    heroPsuHeadroom: 'Folga da Fonte',
    heroBottleneckBalanced: 'Equilibrado (Sem gargalo)',
    heroBottleneckCpu: 'Limitado pelo Processador',
    heroTrapBadge: 'Evite: Preço Ruim',

    partCpu: 'Processador (CPU)',
    partGpu: 'Placa de Vídeo (GPU)',
    partRam: 'Memória RAM',
    partMotherboard: 'Placa-Mãe',
    partPsu: 'Fonte de Alimentação',
    partStorage: 'Armazenamento (SSD)',
    partCase: 'Gabinete',
    partCooler: 'Cooler da CPU',

    mathGuideToggleShow: 'Explorar Guia Didático ▼',
    mathGuideToggleHide: 'Ocultar Guia Didático ▲',
    mathGuideHeading:
      'Quer entender como funciona? Guia de 5 Passos e Gráfico Interativo',
    mathGuideSubheading:
      'Veja como compradores inteligentes descartam peças superfaturadas e ajustam prioridades.',
  },

  'en-US': {
    modeSimple: '1. Simple Guide',
    modeExplorer: '2. Explorer',
    modePro: '3. Pro Lab',
    modeBuilds: '4. Full Builds',
    datasetReal: 'Real GPUs (18)',
    datasetCustom: 'My Deals',
    datasetSynthetic: 'Synthetic (10)',
    datasetCombined: 'Combined Sandbox',
    importDeals: '+ Import Deals',
    languageToggle: 'Language',

    intakeStep1Title: 'Step 1 • What Are You Building?',
    intakeGoalGpu: 'Graphics Card Only',
    intakeGoalGpuDesc:
      'For buyers with an existing PC looking for a GPU upgrade.',
    intakeGoalPc: 'A Whole PC Build',
    intakeGoalPcDesc: 'All 8 balanced components ready to power on and game.',
    intakeStep2Title: 'Step 2 • Gaming Style & Workload',
    intakeUc1080pTitle: '1080p Esports / Budget',
    intakeUc1080pDesc:
      'Max FPS per dollar for Valorant, CS2, Fortnite, and low-latency gaming.',
    intakeUc1440pTitle: '1440p High Refresh (Sweet Spot)',
    intakeUc1440pDesc:
      'Optimal value with 12GB+ VRAM for modern AAA titles at 1440p.',
    intakeUc4kTitle: '4K & Ray Tracing Enthusiast',
    intakeUc4kDesc:
      'High visual fidelity, realistic Ray Tracing, and 16GB+ VRAM capacity.',
    intakeUcAiTitle: 'Creator & AI Workloads',
    intakeUcAiDesc:
      'High VRAM and CUDA cores for video editing, 3D render, and local LLMs.',
    intakeStep3Title: 'Step 3 • Maximum Budget Limit',
    intakeBudgetMax: 'Maximum Budget Limit',

    heroTopPickBadge: '#1 Top Recommended GPU • Best Value Pick',
    heroTopBuildBadge: '#1 Recommended PC Build',
    heroStepDownTitle: 'Step-Down Bargain',
    heroStepDownTag: 'Save money',
    heroStepUpTitle: 'Step-Up Upgrade',
    heroStepUpTag: 'More performance',
    heroWhyThisPick: 'Why we recommend this:',
    heroWhyThisPickInspect:
      'Why this pick? Inspect the value curve and trade-offs',
    heroExploreBuild: 'Inspect & Swap Parts in Full Build Explorer →',
    heroGoodDealBadge: 'Good Deal',
    heroMatchScore: 'Match',
    heroCompareSpecs: '+ Compare',
    heroInComparison: 'In Comparison',
    heroSelectedComparison: 'Selected for Spec Comparison',
    heroTotalBuildCost: 'Total Hardware Cost',
    heroEstimatedFps: 'Estimated Performance',
    heroPsuHeadroom: 'PSU Headroom',
    heroBottleneckBalanced: 'Balanced (No Bottleneck)',
    heroBottleneckCpu: 'CPU Bottleneck',
    heroTrapBadge: 'Bad Value Trap',

    partCpu: 'Processor (CPU)',
    partGpu: 'Graphics Card (GPU)',
    partRam: 'RAM Memory',
    partMotherboard: 'Motherboard',
    partPsu: 'Power Supply (PSU)',
    partStorage: 'Storage (SSD)',
    partCase: 'PC Case',
    partCooler: 'CPU Cooler',

    mathGuideToggleShow: 'Explore Math Guide ▼',
    mathGuideToggleHide: 'Hide Math Walkthrough ▲',
    mathGuideHeading:
      'Want to see the math? 5-Step Value Guide & Interactive Graph',
    mathGuideSubheading:
      'Explore how smart buyers eliminate overpriced hardware traps and adjust priorities.',
  },
};

/**
 * Returns translated string for a given key in the active locale.
 */
export function t(
  key: keyof Translations,
  locale: AppLocale = DEFAULT_LOCALE,
): string {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LOCALE];
  return dict[key] ?? TRANSLATIONS['en-US'][key] ?? key;
}
