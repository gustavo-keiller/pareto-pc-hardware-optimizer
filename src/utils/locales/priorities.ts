/**
 * priorities.ts — strings for the "What matters to you" panel and pick insights (PRI-07, PRI-10, PRI-11).
 * Plain words only (GLOSSARY.md): no Pareto, TOPSIS, frontier or dominated.
 * Placeholders like {name} are filled by `tp()` in i18n.ts.
 */
import { AppLocale } from './types';

export interface PriorityTranslations {
  panelTitle: string;
  panelSubtitle: string;
  level0: string;
  level1: string;
  level2: string;
  level3: string;
  level4: string;
  level5: string;
  shareOfScore: string;
  remove: string;
  mustHave: string;
  estimated: string;
  addButton: string;
  addLibraryTitle: string;
  addCustomTitle: string;
  addCustomPlaceholder: string;
  addCustomCreate: string;
  customRateHint: string;
  customDone: string;
  customEdit: string;
  goalsTitle: string;
  goalFps: string;
  goalVram: string;
  quizOpen: string;
  quizTitle: string;
  quizProgress: string;
  quizDone: string;
  quizCancel: string;
  quizResult: string;
  quizPriceVsFps: string;
  quizFpsVsVram: string;
  quizRtVsPrice: string;
  quizPowerVsFps: string;
  quizVramVsPrice: string;
  quizRtVsFps: string;
  scoreForYou: string;
  practicalTie: string;
  confident: string;
  likely: string;
  closeCall: string;
  pointsTitle: string;
  pointsHint: string;
  flipTitle: string;
  flipRaise: string;
  flipLower: string;
  flipTry: string;
  rankChangeRaised: string;
  rankChangeLowered: string;
  hiddenCards: string;
  missingMustHave: string;
  noData: string;
  pcGoalNote: string;
  // Parameter names and one-line explanations
  p_price: string;
  d_price: string;
  p_rasterFps1440p: string;
  d_rasterFps1440p: string;
  p_rtFps1440p: string;
  d_rtFps1440p: string;
  p_vramGb: string;
  d_vramGb: string;
  p_tdpWatts: string;
  d_tdpWatts: string;
  p_fpsPerPrice: string;
  d_fpsPerPrice: string;
  p_fpsPerWatt: string;
  d_fpsPerWatt: string;
  p_frameGen: string;
  d_frameGen: string;
  p_av1: string;
  d_av1: string;
  p_cuda: string;
  d_cuda: string;
  d_custom: string;
}

const enUS: PriorityTranslations = {
  panelTitle: 'What matters to you',
  panelSubtitle:
    'Tap the dots to say how much each thing matters. The recommendation below changes as you go.',
  level0: "Doesn't matter",
  level1: 'A little',
  level2: 'Somewhat',
  level3: 'Important',
  level4: 'Very important',
  level5: 'Top priority',
  shareOfScore: 'of the score',
  remove: 'Remove',
  mustHave: 'Must have',
  estimated: 'estimated',
  addButton: '+ Add what matters',
  addLibraryTitle: 'Pick something else to weigh',
  addCustomTitle: 'Or create your own rating',
  addCustomPlaceholder: 'e.g. Brand I trust',
  addCustomCreate: 'Create',
  customRateHint:
    "Rate each card from 0 to 10. Cards you don't rate count as 5.",
  customDone: 'Done',
  customEdit: 'Rate cards',
  goalsTitle: 'What is "enough" for you?',
  goalFps: 'FPS goal',
  goalVram: 'VRAM goal',
  quizOpen: 'Not sure? Answer 6 quick questions',
  quizTitle: 'Which matters more to you?',
  quizProgress: 'Question {n} of {total}',
  quizDone: 'Use my answers',
  quizCancel: 'Cancel',
  quizResult:
    'Your answers set the dots above. Change any of them at any time.',
  quizPriceVsFps: 'Paying less, or more FPS in games?',
  quizFpsVsVram: 'More FPS today, or more video memory for future games?',
  quizRtVsPrice: 'Realistic lighting (ray tracing), or a lower price?',
  quizPowerVsFps: 'A cooler, lower-power card, or more FPS?',
  quizVramVsPrice: 'More video memory, or a lower price?',
  quizRtVsFps: 'Ray tracing, or more FPS without it?',
  scoreForYou: '{score}/10 for you',
  practicalTie: 'Practically tied with {name}: pick the one you like',
  confident: 'Clear winner',
  likely: 'Likely winner',
  closeCall: 'Close call: compare the options',
  pointsTitle: 'Where the points come from',
  pointsHint:
    'Each bar is how many of the 10 points this card earns on that item.',
  flipTitle: 'What would change the pick?',
  flipRaise: 'Raise {param} to {to}% and {name} takes the lead.',
  flipLower: 'Lower {param} to {to}% and {name} takes the lead.',
  flipTry: 'Try it',
  rankChangeRaised: '{name} is now #1 because you raised {param}.',
  rankChangeLowered: '{name} is now #1 because you lowered {param}.',
  hiddenCards:
    '{n} cards set aside: another card is as good or better on everything you picked.',
  missingMustHave: 'Missing a must-have: {param}',
  noData: 'no data',
  pcGoalNote:
    'For a whole PC, the workload above picks the parts. These priorities apply to graphics card picks.',
  p_price: 'Low price',
  d_price: 'Full points at 30% of your budget, none at your budget.',
  p_rasterFps1440p: 'Gaming speed',
  d_rasterFps1440p: 'FPS in games at 1440p. Counts up to your FPS goal.',
  p_rtFps1440p: 'Ray tracing',
  d_rtFps1440p: 'FPS with realistic lighting turned on.',
  p_vramGb: 'Video memory (VRAM)',
  d_vramGb: 'More memory keeps new games and AI running longer.',
  p_tdpWatts: 'Low power use',
  d_tdpWatts: 'Less heat, a smaller power supply and a lower energy bill.',
  p_fpsPerPrice: 'Value for money',
  d_fpsPerPrice: 'Gaming FPS for every 100 you spend.',
  p_fpsPerWatt: 'Efficiency',
  d_fpsPerWatt: 'Gaming FPS for every watt it uses.',
  p_frameGen: 'Frame generation',
  d_frameGen: 'DLSS 3/4 or FSR 3 frame generation for extra smoothness.',
  p_av1: 'AV1 streaming',
  d_av1: 'Better-quality streaming and recording.',
  p_cuda: 'CUDA (AI and 3D)',
  d_cuda: 'Needed by many AI and 3D tools.',
  d_custom: 'Your own 0–10 rating.',
};

const ptBR: PriorityTranslations = {
  panelTitle: 'O que importa para você',
  panelSubtitle:
    'Toque nos pontos para dizer quanto cada item importa. A recomendação abaixo muda na hora.',
  level0: 'Não importa',
  level1: 'Um pouco',
  level2: 'Moderado',
  level3: 'Importante',
  level4: 'Muito importante',
  level5: 'Prioridade máxima',
  shareOfScore: 'da nota',
  remove: 'Remover',
  mustHave: 'Obrigatório',
  estimated: 'estimado',
  addButton: '+ Adicionar o que importa',
  addLibraryTitle: 'Escolha outro item para pesar',
  addCustomTitle: 'Ou crie sua própria nota',
  addCustomPlaceholder: 'ex.: Marca em que confio',
  addCustomCreate: 'Criar',
  customRateHint:
    'Dê uma nota de 0 a 10 para cada placa. Placas sem nota contam como 5.',
  customDone: 'Pronto',
  customEdit: 'Dar notas',
  goalsTitle: 'O que é "suficiente" para você?',
  goalFps: 'Meta de FPS',
  goalVram: 'Meta de VRAM',
  quizOpen: 'Na dúvida? Responda 6 perguntas rápidas',
  quizTitle: 'O que importa mais para você?',
  quizProgress: 'Pergunta {n} de {total}',
  quizDone: 'Usar minhas respostas',
  quizCancel: 'Cancelar',
  quizResult:
    'Suas respostas ajustaram os pontos acima. Mude qualquer um quando quiser.',
  quizPriceVsFps: 'Pagar menos ou mais FPS nos jogos?',
  quizFpsVsVram: 'Mais FPS hoje ou mais memória de vídeo para jogos futuros?',
  quizRtVsPrice: 'Iluminação realista (ray tracing) ou um preço menor?',
  quizPowerVsFps: 'Uma placa mais fria e econômica ou mais FPS?',
  quizVramVsPrice: 'Mais memória de vídeo ou um preço menor?',
  quizRtVsFps: 'Ray tracing ou mais FPS sem ele?',
  scoreForYou: 'Nota {score}/10 para você',
  practicalTie: 'Praticamente empatada com {name}: escolha a que preferir',
  confident: 'Vencedora clara',
  likely: 'Provável vencedora',
  closeCall: 'Disputa apertada: compare as opções',
  pointsTitle: 'De onde vêm os pontos',
  pointsHint:
    'Cada barra mostra quantos dos 10 pontos a placa ganha naquele item.',
  flipTitle: 'O que mudaria a recomendação?',
  flipRaise: 'Suba {param} para {to}% e a {name} passa à frente.',
  flipLower: 'Baixe {param} para {to}% e a {name} passa à frente.',
  flipTry: 'Testar',
  rankChangeRaised: 'A {name} agora é a nº 1 porque você aumentou {param}.',
  rankChangeLowered: 'A {name} agora é a nº 1 porque você diminuiu {param}.',
  hiddenCards:
    '{n} placas deixadas de lado: outra placa é igual ou melhor em tudo o que você escolheu.',
  missingMustHave: 'Falta um item obrigatório: {param}',
  noData: 'sem dados',
  pcGoalNote:
    'Para um PC completo, o uso escolhido acima define as peças. Estas prioridades valem para a escolha da placa de vídeo.',
  p_price: 'Preço baixo',
  d_price: 'Nota máxima com 30% do seu orçamento, zero no limite do orçamento.',
  p_rasterFps1440p: 'Desempenho em jogos',
  d_rasterFps1440p: 'FPS nos jogos em 1440p. Conta até a sua meta de FPS.',
  p_rtFps1440p: 'Ray tracing',
  d_rtFps1440p: 'FPS com iluminação realista ligada.',
  p_vramGb: 'Memória de vídeo (VRAM)',
  d_vramGb: 'Mais memória mantém jogos novos e IA rodando por mais tempo.',
  p_tdpWatts: 'Baixo consumo',
  d_tdpWatts: 'Menos calor, fonte menor e conta de luz mais baixa.',
  p_fpsPerPrice: 'Custo-benefício',
  d_fpsPerPrice: 'FPS nos jogos a cada 100 gastos.',
  p_fpsPerWatt: 'Eficiência',
  d_fpsPerWatt: 'FPS nos jogos para cada watt consumido.',
  p_frameGen: 'Geração de quadros',
  d_frameGen: 'DLSS 3/4 ou FSR 3 com geração de quadros para mais fluidez.',
  p_av1: 'Streaming AV1',
  d_av1: 'Streaming e gravação com mais qualidade.',
  p_cuda: 'CUDA (IA e 3D)',
  d_cuda: 'Exigido por muitas ferramentas de IA e 3D.',
  d_custom: 'Sua própria nota de 0 a 10.',
};

export const PRIORITY_TRANSLATIONS: Record<AppLocale, PriorityTranslations> = {
  'en-US': enUS,
  'pt-BR': ptBR,
};
