/**
 * types.ts — i18n type definitions for ParetoPC localization.
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
  modeSimpleShort: string;
  modeBuildsShort: string;
  modeExplorerShort: string;
  modeProShort: string;
  navGroupBuy: string;
  navGroupExpert: string;
  navLabel: string;
  buildMoreFilters: string;
  buildActiveFilter: string;
  buildActiveFilters: string;
  datasetReal: string;
  datasetCustom: string;
  datasetSynthetic: string;
  datasetCombined: string;
  importDeals: string;
  datasetCustomTitle: string;
  datasetCombinedTitle: string;
  datasetSyntheticTitle: string;
  importDealsTitle: string;
  exchangeRateLabel: string;
  languageToggle: string;
  appResetTitle: string;
  appResetButton: string;

  // Beginner Intake
  intakeStep1Title: string;
  intakeGoalGpu: string;
  intakeGoalGpuDesc: string;
  intakeGoalPc: string;
  intakeGoalPcDesc: string;
  intakeStep2Title: string;
  intakeStep2Subtitle: string;
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
  intakeUpTo: string;
  intakeNoLimit: string;

  // Recommendations & Heroes
  heroTopPickBadge: string;
  heroTopBuildBadge: string;
  heroTopBuildHeader: string;
  heroStepDownTitle: string;
  heroStepDownTag: string;
  heroStepUpTitle: string;
  heroStepUpTag: string;
  heroWhyThisPick: string;
  heroWhyThisPickInspect: string;
  heroSeeMathInExplorer: string;
  heroSeeMathTooltip: string;
  heroExploreBuild: string;
  buildInspectPrompt: string;
  buildInspectButton: string;
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
  btnCopyBuildLink: string;
  btnLinkCopied: string;
  btnShare: string;
  btnCopySpecsTitle: string;
  btnSpecsCopied: string;
  btnCopySpecs: string;
  telemetryTargetWorkload: string;
  telemetryEffectiveGaming: string;
  budgetDistributionTitle: string;
  budgetDistributionOtherParts: string;

  // Build Alternatives & Heroes
  altStepDownTitle: string;
  altStepUpTitle: string;
  altSaveMore: string;
  altInspect: string;
  altInspectExplorer: string;
  altSavePrefix: string;
  altLosePrefix: string;
  altForPrefix: string;
  noCompatibleBuildsSimple: string;

  // Components & Parts
  partCpu: string;
  partGpu: string;
  partRam: string;
  partMotherboard: string;
  partPsu: string;
  partStorage: string;
  partCase: string;
  partCooler: string;
  cardPlatform: string;
  cardCores: string;
  cardScore: string;
  cardDesempenho: string;
  cardFabricante: string;
  cardRamSlots: string;
  cardFormFactor: string;
  cardCapacity: string;
  cardSticks: string;
  cardSpeed: string;
  cardGeneration: string;
  cardType: string;
  cardReadSpeed: string;
  cardCoolingTdp: string;
  cardHeight: string;
  cardAir: string;
  cardMaxGpu: string;
  cardMaxCooler: string;
  cardSupports: string;
  cardPsuCapacity: string;
  cardRating: string;
  cardCables: string;
  cardModular: string;

  // Math Guide Accordion
  mathGuideToggleShow: string;
  mathGuideToggleHide: string;
  mathGuideHeading: string;
  mathGuideSubheading: string;

  // Simple Mode Controls & Notices
  showAllGpusButton: string;
  hideAllGpusButton: string;
  priceEstimatedNotice: string;

  // Specs & Card Labels
  specRasterFps: string;
  specSmoothHighRefresh: string;
  specRtFps: string;
  specRtUltra: string;
  specVramCapacity: string;
  specFutureProof: string;
  specPowerDraw: string;
  specRatedPower: string;
  specFpsPer100: string;
  savePrefix: string;
  moreSuffix: string;

  // Table Headers & Verdicts
  tableRank: string;
  tableModel: string;
  tableVerdict: string;
  tableMatchScore: string;
  tablePrice: string;
  tableFairValue: string;
  tableRaster: string;
  tableRt: string;
  tableVram: string;
  tablePower: string;
  tableCompare: string;
  tableCompareAdd: string;
  tableCompareRemove: string;
  verdictSmartBuy: string;
  verdictTrap: string;
  verdictNiche: string;
  verdictDominated: string;
  tableHideTraps: string;
  tableTitleSimple: string;
  tableTitlePro: string;
  tableSubtitleSimple: string;
  tableSubtitlePro: string;
  verdictFrontierOptimal: string;
  verdictDominatedPrefix: string;

  // Comparison Drawer
  drawerTitle: string;
  drawerSubtitle: string;
  drawerRadarTab: string;
  drawerParallelTab: string;
  drawerClear: string;
  drawerColGpu: string;
  drawerColPrice: string;
  radarRaster: string;
  radarRt: string;
  radarVram: string;
  radarEfficiency: string;
  radarTopsis: string;
  parallelPrice: string;
  parallelRaster: string;
  parallelRt: string;
  parallelVram: string;
  parallelPower: string;
  parallelTopsis: string;

  // Full Build & Hero Card
  buildFullTitle: string;
  buildFullSubtitle: string;
  buildFullDescription: string;
  buildMaxBudget: string;
  buildTotalHardwareCost: string;
  buildThroughput100: string;
  buildCpuBottleneck: string;
  buildRawGpuCapacity: string;
  buildFedByCpu: string;
  buildEstimatedPowerDraw: string;
  buildPsuHeadroomWatts: string;

  // Full Build Filter Controls
  filterPerformanceTarget: string;
  filterEsportsSub: string;
  filterSweetspotSub: string;
  filterEnthusiastSub: string;
  filterCreatorSub: string;
  wlSweetspotLabel: string;
  wlSweetspotDesc: string;
  wlEsportsLabel: string;
  wlEsportsDesc: string;
  wlEnthusiastLabel: string;
  wlEnthusiastDesc: string;
  wlCreatorLabel: string;
  wlCreatorDesc: string;
  filterQuickPresets: string;
  filterEvaluatedSuffix: string;
  filterPlatformSocket: string;
  filterAllSockets: string;
  filterSocketAm4: string;
  filterSocketAm5: string;
  filterSocketLga1700: string;
  filterSocketLga1851: string;
  filterRamGen: string;
  filterAllRam: string;
  filterRamDdr4: string;
  filterRamDdr5: string;
  filterGpuVendor: string;
  filterAllGpus: string;
  filterResetTooltip: string;
  filterResetButton: string;

  // Enthusiast Filters (BLD-08)
  buildFiltersEnthusiastHeading: string;
  buildFiltersEnthusiastToggle: string;
  buildFiltersFormFactor: string;
  buildFiltersFormFactorAll: string;
  buildFiltersFormFactorSff: string;
  buildFiltersFormFactorMatx: string;
  buildFiltersFormFactorAtx: string;
  buildFiltersCoolerType: string;
  buildFiltersCoolerTypeAll: string;
  buildFiltersCoolerTypeAir: string;
  buildFiltersCoolerTypeAio: string;
  buildFiltersAesthetic: string;
  buildFiltersAestheticAll: string;
  buildFiltersAestheticRgb: string;
  buildFiltersAestheticStealth: string;
  buildFiltersCpuVendor: string;
  buildFiltersCpuVendorAll: string;
  buildFiltersCpuVendorAmd: string;
  buildFiltersCpuVendorIntel: string;

  // Full Build Leaderboard Table
  buildLeaderboardTitle: string;
  buildLeaderboardSubtitle: string;
  buildColPrice: string;
  buildColPerformance: string;
  buildColCpu: string;
  buildColGpu: string;
  buildColRam: string;
  buildColMobo: string;
  buildColPower: string;
  buildColAction: string;
  buildBadgeAnchor: string;
  buildBtnSelected: string;
  buildBtnView: string;
  buildCountSuffix: string;

  // Upgrade Mode Modal
  upgradeModalTitle: string;
  upgradeModalSubtitle: string;
  upgradeOwnedBadge: string;
  upgradeBuyNewOption: string;
  upgradeClearAll: string;
  upgradeBudgetPresetLabel: string;
  upgradePathsHeading: string;
  upgradePathsCount: string;
  upgradeCostLabel: string;
  upgradeOverBudgetNotice: string;
  upgradeKeep0: string;
  upgradeBuy: string;
  upgradeApplyPlan: string;
  upgradeClose: string;
  upgradeCloseModal: string;
  upgradeFaster: string;
  upgradeSelectedPlan: string;
  upgradeNoPathFound: string;
  upgradeSetupPresetsLabel: string;
  upgradePresetAm4: string;
  upgradeBudgetCeiling: string;
  upgradeSelectOwnedTitle: string;
  upgradeTopPathBadge: string;
  upgradeKeepSetupZeroCost: string;
  upgradePrefix: string;
  upgradeTargetScore: string;
  upgradeLeapCurrent: string;
  upgradePhysicalFit: string;
  upgradeSafePsuHeadroom: string;
  upgradeHeadroomSuffix: string;
  upgradeRequiresPsu: string;
  upgradeActionsPerComponent: string;
  upgradeInspectFullBuild: string;

  // Full Build Explorer Notices & Buttons
  sharedMissingPartsNotice: string;
  sharedDismissNotice: string;
  sharedOverBudgetNotice: string;
  sharedOverBudgetSuffix: string;
  noCompatibleBuildsFound: string;
  noCompatibleBuildsDesc: string;
  calculatingOptimizer: string;
  btnSimpleGuide: string;
  btnGpuExplorer: string;
  btnUpgradeMode: string;
  resetAllFilters: string;

  // Estimate labels (FIX-04)
  estimateBadge: string;
  estimateExplanation: string;

  // Pro-Mode Extras (UX-08)
  weightsProfilesTitle: string;
  weightsProfilesSaveBtn: string;
  weightsProfilesPlaceholder: string;
  weightsProfilesNoProfiles: string;
  weightsProfilesLoad: string;
  weightsProfilesDelete: string;
  weightsProfilesActive: string;
  btnExportCsv: string;
  btnExportJson: string;
  exportTooltip: string;
  drawerTabRadar: string;
  drawerTabParallel: string;
  drawerTabBreakdown: string;
  breakdownColMetric: string;
  breakdownColWeight: string;
  breakdownColRaw: string;
  breakdownColNormalized: string;
  breakdownColIdeal: string;
  breakdownColWorst: string;
  breakdownColProximity: string;
  drawerBreakdownSummary: string;

  // Accessibility & Chart Alternatives (UX-09)
  skipToContent: string;
  chartAriaScatterPlot: string;
  chartAriaValueResiduals: string;
  chartTableCaptionSimple: string;
  chartTableCaptionResiduals: string;
  chartTableColActual: string;
  chartTableColPredicted: string;
  chartTableColDiff: string;
  chartTableColStatus: string;

  // Interactive Part Swapper (BLD-05)
  swapPart: string;
  swapPartModalTitle: string;
  swapPartModalSubtitle: string;
  swapCurrentPart: string;
  swapSelectPart: string;
  swapActiveBadge: string;
  swapPriceDeltaCheaper: string;
  swapPriceDeltaMoreExpensive: string;
  swapFpsDeltaFaster: string;
  swapFpsDeltaSlower: string;
  swapCompatible: string;
  swapIncompatible: string;
  swapCustomizedBuildBadge: string;
  swapResetToRecommended: string;

  // Social Share Card & Creator Studio (SHARE-01)
  btnShareCard: string;
  socialModalTitle: string;
  socialModalSubtitle: string;
  socialCreatorHandleLabel: string;
  socialCreatorHandlePlaceholder: string;
  socialAmazonTagLabel: string;
  socialAmazonTagPlaceholder: string;
  socialAffiliateUrlLabel: string;
  socialAffiliateUrlPlaceholder: string;
  socialSiteBrandLabel: string;
  socialDownloadPngBtn: string;
  socialCopyCaptionBtn: string;
  socialCaptionCopied: string;
  socialBundleBtn: string;
  socialBundleDone: string;
  socialPreviewCaptionTitle: string;
  socialFrontierWeightsLabel: string;
  socialCloseModal: string;

  // Regional Store Pricing Attribution (DATA-04)
  verifiedStorePriceBadge: string;
  viewAtStore: string;
  pixCashLabel: string;
  installmentUpTo: string;

  // Launch Foundations & Creator Attribution (LAUNCH-02/03/05 & AFF-03/05)
  errorBoundaryTitle: string;
  errorBoundaryDesc: string;
  errorBoundaryReload: string;
  creatorBannerBadge: string;
  creatorBannerNotice: string;
  creatorBannerDismiss: string;
  footerAffiliateDisclosure: string;
  footerLegalBtn: string;
  footerFeedbackBtn: string;
  legalModalTitle: string;
  legalPrivacyBody: string;
  legalCloseBtn: string;
  feedbackModalTitle: string;
  feedbackModalSubtitle: string;
  feedbackPlaceholder: string;
  feedbackSubmitBtn: string;
  feedbackSubmittedMsg: string;

  // Explorer & Pro Lab panels
  xpWinnerTitle: string;
  xpCloseness: string;
  xpBelowFair: string;
  xpAboveFair: string;
  xpIdealDistance: string;
  xpAntiIdealDistance: string;
  xpStat1440p: string;
  xpStatRt: string;
  xpStatPower: string;
  xpStage1Title: string;
  xpGpusFit: string;
  xpMaxBudget: string;
  xpAll: string;
  xpMinVram: string;
  xpMaxPower: string;
  xpLowPower: string;
  xpNoLimit: string;
  xpBrandFilters: string;
  xpClearFilters: string;
  xpClearFiltersTitle: string;
  xpChipMaker: string;
  xpAllBrands: string;
  xpSelectedCount: string;
  xpBrandTech: string;
  xpEcosystem: string;
  xpBrandTechDesc: string;
  xpStage3Title: string;
  xpPresetsLabel: string;
  xpActive: string;
  xpIndividualWeights: string;
  xpPresetBalancedLabel: string;
  xpPresetBalancedDesc: string;
  xpPresetBudgetLabel: string;
  xpPresetBudgetDesc: string;
  xpPresetEsportsLabel: string;
  xpPresetEsportsDesc: string;
  xpPresetPathtracingLabel: string;
  xpPresetPathtracingDesc: string;
  xpMetricPrice: string;
  xpMetricRaster: string;
  xpMetricRt: string;
  xpMetricVram: string;
  xpMetricPower: string;
  xpDirMin: string;
  xpDirMax: string;
  xpTitle2d: string;
  xpTitle3d: string;
  xpTitleHyper: string;
  xpTitleAxes: string;
  xpTitleResiduals: string;
  xpDesc2d5d: string;
  xpDesc2dStrict: string;
  xpDesc3d: string;
  xpDescHyper: string;
  xpDescAxes: string;
  xpDescResiduals: string;
  xpTab2d: string;
  xpTab3d: string;
  xpTabHyper: string;
  xpTabHyperTitle: string;
  xpTabAxes: string;
  xpTabAxesTitle: string;
  xpTabResiduals: string;
  xpExpand: string;
  xpExpandTitle: string;
  xpShrink: string;
  xpShrinkTitle: string;
  xpTrapRule: string;
  xpTrapRule5d: string;
  xpTrapRule2d: string;
  xpShadeOn: string;
  xpShadeOff: string;
  xpShadeTitle: string;
  xpTrapsHidden: string;
  xpHideTraps: string;
  xpHideTrapsTitle: string;
  xpBaseAxis: string;
  xpYAxis: string;
  xpNoFitTitle: string;
  xpNoFitDesc: string;
  xpTrapDetected: string;
  xpTrapBeaten: string;
  xpSmartBuy: string;
  xp5dOptimal: string;
  xp2dOptimal: string;
  xpMatchScore: string;
  xpRank: string;
  xpOlsFair: string;
  xpTip: string;
  xpOptimalCount: string;
  xpTrapsFlagged: string;
}
