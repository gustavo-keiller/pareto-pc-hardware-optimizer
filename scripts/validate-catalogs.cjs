// @ts-check
/**
 * Catalog Schema & Integrity Validator (`scripts/validate-catalogs.cjs`)
 *
 * Verifies that all hardware catalogs in src/data/catalogs/ conform to typed
 * schemas, have no missing required attributes, maintain positive numeric bounds,
 * possess valid source citations and audit dates, and ensure cross-catalog compatibility.
 *
 * Runs automatically as part of `npm run check`.
 */

const fs = require('fs');
const path = require('path');

const CATALOGS_DIR = path.resolve(__dirname, '../src/data/catalogs');

const VALID_SOCKETS = new Set(['AM4', 'AM5', 'LGA1700', 'LGA1851']);
const VALID_RAM_GENS = new Set(['DDR4', 'DDR5']);
const VALID_FORM_FACTORS = new Set(['ATX', 'Micro-ATX', 'Mini-ITX']);
const VALID_COOLER_TYPES = new Set(['Air', 'AIO']);
const VALID_PSU_RATINGS = new Set([
  '80+ White',
  '80+ Bronze',
  '80+ Silver',
  '80+ Gold',
  '80+ Platinum',
  '80+ Titanium',
]);
const VALID_PSU_MODULARITY = new Set(['Non', 'Semi', 'Full']);

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** @type {string[]} */
const errors = [];

/**
 * @param {string} file
 * @returns {any[]}
 */
function loadCatalog(file) {
  const filePath = path.join(CATALOGS_DIR, file);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing catalog file: ${file}`);
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      errors.push(`${file} must contain a non-empty array of objects`);
      return [];
    }
    return parsed;
  } catch (err) {
    errors.push(
      `JSON parse error in ${file}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}

/**
 * Validate base candidate metadata on every row.
 * @param {any} item
 * @param {string} catalogName
 * @param {Set<string>} seenIds
 */
function validateBaseCandidate(item, catalogName, seenIds) {
  const prefix = `[${catalogName} -> ${item?.id ?? 'UNKNOWN'}]`;
  if (!item || typeof item !== 'object') {
    errors.push(`${prefix} item is not an object`);
    return;
  }
  if (!item.id || typeof item.id !== 'string' || item.id.includes(' ')) {
    errors.push(
      `${prefix} missing or invalid 'id' (must be a non-empty string without spaces)`,
    );
  } else if (seenIds.has(item.id)) {
    errors.push(`${prefix} duplicate ID '${item.id}' detected`);
  } else {
    seenIds.add(item.id);
  }

  if (
    !item.name ||
    typeof item.name !== 'string' ||
    item.name.trim().length === 0
  ) {
    errors.push(`${prefix} missing or empty 'name'`);
  }

  if (
    typeof item.price !== 'number' ||
    !Number.isFinite(item.price) ||
    item.price <= 0
  ) {
    errors.push(
      `${prefix} 'price' must be a positive finite number (got ${item.price})`,
    );
  }

  if (
    !item.source ||
    typeof item.source !== 'string' ||
    item.source.trim().length === 0
  ) {
    errors.push(`${prefix} missing or empty 'source' citation`);
  }

  if (
    !item.checkedAt ||
    typeof item.checkedAt !== 'string' ||
    !ISO_DATE_REGEX.test(item.checkedAt)
  ) {
    errors.push(
      `${prefix} 'checkedAt' must be a valid ISO date YYYY-MM-DD (got '${item.checkedAt}')`,
    );
  }
}

// 1. Load catalogs
const cpus = loadCatalog('cpus.json');
const motherboards = loadCatalog('motherboards.json');
const ramKits = loadCatalog('ram.json');
const storages = loadCatalog('storage.json');
const coolers = loadCatalog('coolers.json');
const cases = loadCatalog('cases.json');
const psus = loadCatalog('psus.json');
const gpus = loadCatalog('gpus.json');

// 2. Validate CPUs
const cpuIds = new Set();
for (const cpu of cpus) {
  validateBaseCandidate(cpu, 'cpus.json', cpuIds);
  const p = `[cpus.json -> ${cpu.id}]`;
  if (!['AMD', 'Intel'].includes(cpu.vendor)) {
    errors.push(
      `${p} invalid vendor '${cpu.vendor}' (expected 'AMD' | 'Intel')`,
    );
  }
  if (!VALID_SOCKETS.has(cpu.socket)) {
    errors.push(`${p} invalid socket '${cpu.socket}'`);
  }
  if (typeof cpu.cores !== 'number' || cpu.cores <= 0) {
    errors.push(`${p} cores must be > 0`);
  }
  if (typeof cpu.threads !== 'number' || cpu.threads < cpu.cores) {
    errors.push(`${p} threads must be >= cores`);
  }
  if (typeof cpu.tdpWatts !== 'number' || cpu.tdpWatts <= 0) {
    errors.push(`${p} tdpWatts must be > 0`);
  }
  if (
    typeof cpu.gamingScore !== 'number' ||
    cpu.gamingScore < 0 ||
    cpu.gamingScore > 100
  ) {
    errors.push(
      `${p} gamingScore must be between 0 and 100 (got ${cpu.gamingScore})`,
    );
  }
  if (
    !Array.isArray(cpu.supportedRamGenerations) ||
    cpu.supportedRamGenerations.length === 0
  ) {
    errors.push(`${p} supportedRamGenerations must be a non-empty array`);
  } else {
    for (const gen of cpu.supportedRamGenerations) {
      if (!VALID_RAM_GENS.has(gen)) {
        errors.push(`${p} invalid supportedRamGeneration '${gen}'`);
      }
    }
  }
}

// 3. Validate Motherboards
const moboIds = new Set();
for (const mobo of motherboards) {
  validateBaseCandidate(mobo, 'motherboards.json', moboIds);
  const p = `[motherboards.json -> ${mobo.id}]`;
  if (!VALID_SOCKETS.has(mobo.socket)) {
    errors.push(`${p} invalid socket '${mobo.socket}'`);
  }
  if (!VALID_RAM_GENS.has(mobo.ramGeneration)) {
    errors.push(`${p} invalid ramGeneration '${mobo.ramGeneration}'`);
  }
  if (!VALID_FORM_FACTORS.has(mobo.formFactor)) {
    errors.push(`${p} invalid formFactor '${mobo.formFactor}'`);
  }
  if (typeof mobo.ramSlots !== 'number' || mobo.ramSlots < 2) {
    errors.push(`${p} ramSlots must be >= 2`);
  }
  if (typeof mobo.m2Slots === 'number' && mobo.m2Slots < 1) {
    errors.push(`${p} m2Slots must be >= 1 if defined`);
  }
}

// 4. Validate RAM
const ramIds = new Set();
for (const ram of ramKits) {
  validateBaseCandidate(ram, 'ram.json', ramIds);
  const p = `[ram.json -> ${ram.id}]`;
  if (!VALID_RAM_GENS.has(ram.generation)) {
    errors.push(`${p} invalid generation '${ram.generation}'`);
  }
  if (typeof ram.capacityGb !== 'number' || ram.capacityGb < 8) {
    errors.push(`${p} capacityGb must be >= 8`);
  }
  if (typeof ram.speedMhz !== 'number' || ram.speedMhz < 2133) {
    errors.push(`${p} speedMhz must be >= 2133`);
  }
  if (typeof ram.modulesCount !== 'number' || ram.modulesCount < 1) {
    errors.push(`${p} modulesCount must be >= 1`);
  }
}

// 5. Validate Storage
const storageIds = new Set();
for (const s of storages) {
  validateBaseCandidate(s, 'storage.json', storageIds);
  const p = `[storage.json -> ${s.id}]`;
  if (!['NVMe M.2', 'SATA 2.5"'].includes(s.type)) {
    errors.push(`${p} invalid storage type '${s.type}'`);
  }
  if (!['M.2-2280', '2.5-inch'].includes(s.formFactor)) {
    errors.push(`${p} invalid formFactor '${s.formFactor}'`);
  }
  if (typeof s.capacityGb !== 'number' || s.capacityGb < 120) {
    errors.push(`${p} capacityGb must be >= 120`);
  }
  if (
    s.readSpeedMbps !== undefined &&
    (typeof s.readSpeedMbps !== 'number' || s.readSpeedMbps <= 0)
  ) {
    errors.push(`${p} readSpeedMbps must be positive`);
  }
}

// 6. Validate Coolers
const coolerIds = new Set();
for (const c of coolers) {
  validateBaseCandidate(c, 'coolers.json', coolerIds);
  const p = `[coolers.json -> ${c.id}]`;
  if (!Array.isArray(c.supportedSockets) || c.supportedSockets.length === 0) {
    errors.push(`${p} supportedSockets must be a non-empty array`);
  } else {
    for (const sock of c.supportedSockets) {
      if (!VALID_SOCKETS.has(sock)) {
        errors.push(`${p} invalid socket in supportedSockets '${sock}'`);
      }
    }
  }
  if (typeof c.heightMm !== 'number' || c.heightMm <= 0) {
    errors.push(`${p} heightMm must be > 0`);
  }
  if (typeof c.maxTdpWatts !== 'number' || c.maxTdpWatts <= 0) {
    errors.push(`${p} maxTdpWatts must be > 0`);
  }
  if (c.type && !VALID_COOLER_TYPES.has(c.type)) {
    errors.push(`${p} invalid cooler type '${c.type}'`);
  }
}

// 7. Validate Cases
const caseIds = new Set();
for (const cs of cases) {
  validateBaseCandidate(cs, 'cases.json', caseIds);
  const p = `[cases.json -> ${cs.id}]`;
  if (
    !Array.isArray(cs.supportedFormFactors) ||
    cs.supportedFormFactors.length === 0
  ) {
    errors.push(`${p} supportedFormFactors must be a non-empty array`);
  } else {
    for (const ff of cs.supportedFormFactors) {
      if (!VALID_FORM_FACTORS.has(ff)) {
        errors.push(`${p} invalid form factor in supportedFormFactors '${ff}'`);
      }
    }
  }
  if (typeof cs.maxGpuLengthMm !== 'number' || cs.maxGpuLengthMm <= 0) {
    errors.push(`${p} maxGpuLengthMm must be > 0`);
  }
  if (
    typeof cs.maxCpuCoolerHeightMm !== 'number' ||
    cs.maxCpuCoolerHeightMm <= 0
  ) {
    errors.push(`${p} maxCpuCoolerHeightMm must be > 0`);
  }
}

// 8. Validate PSUs
const psuIds = new Set();
for (const psu of psus) {
  validateBaseCandidate(psu, 'psus.json', psuIds);
  const p = `[psus.json -> ${psu.id}]`;
  if (typeof psu.wattage !== 'number' || psu.wattage < 300) {
    errors.push(`${p} wattage must be >= 300`);
  }
  if (!VALID_PSU_RATINGS.has(psu.efficiencyRating)) {
    errors.push(`${p} invalid efficiencyRating '${psu.efficiencyRating}'`);
  }
  if (!VALID_PSU_MODULARITY.has(psu.modular)) {
    errors.push(`${p} invalid modularity '${psu.modular}'`);
  }
}

// 9. Validate GPUs
const gpuIds = new Set();
for (const gpu of gpus) {
  validateBaseCandidate(gpu, 'gpus.json', gpuIds);
  const p = `[gpus.json -> ${gpu.id}]`;
  if (typeof gpu.rasterFps1440p !== 'number' || gpu.rasterFps1440p <= 0) {
    errors.push(`${p} rasterFps1440p must be > 0`);
  }
  if (typeof gpu.rtFps1440p !== 'number' || gpu.rtFps1440p < 0) {
    errors.push(`${p} rtFps1440p must be >= 0`);
  }
  if (typeof gpu.vramGb !== 'number' || gpu.vramGb <= 0) {
    errors.push(`${p} vramGb must be > 0`);
  }
  if (typeof gpu.tdpWatts !== 'number' || gpu.tdpWatts <= 0) {
    errors.push(`${p} tdpWatts must be > 0`);
  }
}

// 10. Cross-Catalog Referential Checks
const cpuSockets = new Set(cpus.map((c) => c.socket));
const moboSockets = new Set(motherboards.map((m) => m.socket));
for (const sock of cpuSockets) {
  if (!moboSockets.has(sock)) {
    errors.push(
      `Referential error: CPU socket '${sock}' has no matching motherboard in motherboards.json`,
    );
  }
}

// 11. Validate Public Creator Benchmarks (DATA-02)
const BENCHMARKS_DIR = path.resolve(__dirname, '../src/data/benchmarks');
function loadBenchmarkFile(file) {
  const filePath = path.join(BENCHMARKS_DIR, file);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing benchmark file: ${file}`);
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      errors.push(`${file} must contain a non-empty array of benchmark runs`);
      return [];
    }
    return parsed;
  } catch (err) {
    errors.push(
      `JSON parse error in ${file}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}

const VALID_CREATORS = new Set([
  'TechPowerUp',
  'Hardware Unboxed',
  'Gamers Nexus',
  'LTT Labs',
]);

const gpuBenchmarks = loadBenchmarkFile('gpuBenchmarks.json');
const cpuBenchmarks = loadBenchmarkFile('cpuBenchmarks.json');

for (const b of [...gpuBenchmarks, ...cpuBenchmarks]) {
  const p = `[benchmark -> ${b?.id ?? 'UNKNOWN'}]`;
  if (!b || typeof b !== 'object') {
    errors.push(`${p} is not an object`);
    continue;
  }
  if (!b.id || typeof b.id !== 'string') {
    errors.push(`${p} missing id`);
  }
  if (!VALID_CREATORS.has(b.creator)) {
    errors.push(`${p} invalid creator '${b.creator}'`);
  }
  if (!b.url || typeof b.url !== 'string' || !b.url.startsWith('http')) {
    errors.push(`${p} missing or invalid citation url`);
  }
  if (!b.date || typeof b.date !== 'string' || !ISO_DATE_REGEX.test(b.date)) {
    errors.push(`${p} missing or invalid ISO date`);
  }
  if (
    !b.scores ||
    typeof b.scores !== 'object' ||
    Object.keys(b.scores).length < 5
  ) {
    errors.push(`${p} scores must contain at least 5 benchmarked items`);
  } else {
    for (const [k, v] of Object.entries(b.scores)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
        errors.push(`${p} invalid score for '${k}': ${v}`);
      }
    }
  }
}

// 12. Validate Regional Store Prices (DATA-04)
const PRICES_DIR = path.resolve(__dirname, '../src/data/prices');
function loadPriceFile(file) {
  const filePath = path.join(PRICES_DIR, file);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing price file: ${file}`);
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      errors.push(`${file} must contain a non-empty array of store prices`);
      return [];
    }
    return parsed;
  } catch (err) {
    errors.push(
      `JSON parse error in ${file}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}

const allValidPartIds = new Set([
  ...cpuIds,
  ...moboIds,
  ...ramIds,
  ...storageIds,
  ...coolerIds,
  ...caseIds,
  ...psuIds,
  ...gpuIds,
]);

const brPrices = loadPriceFile('br.json');
const usPrices = loadPriceFile('us.json');

for (const offer of [...brPrices, ...usPrices]) {
  const p = `[price -> ${offer?.componentId ?? 'UNKNOWN'} @ ${offer?.store ?? 'UNKNOWN'}]`;
  if (!offer || typeof offer !== 'object') {
    errors.push(`${p} is not an object`);
    continue;
  }
  if (!offer.componentId || typeof offer.componentId !== 'string') {
    errors.push(`${p} missing componentId`);
  } else if (!allValidPartIds.has(offer.componentId)) {
    errors.push(
      `${p} references non-existent componentId '${offer.componentId}'`,
    );
  }
  if (
    !offer.store ||
    typeof offer.store !== 'string' ||
    offer.store.trim().length === 0
  ) {
    errors.push(`${p} missing or empty store name`);
  }
  if (
    typeof offer.price !== 'number' ||
    !Number.isFinite(offer.price) ||
    offer.price <= 0
  ) {
    errors.push(
      `${p} price must be positive finite number (got ${offer.price})`,
    );
  }
  if (
    !offer.url ||
    typeof offer.url !== 'string' ||
    !offer.url.startsWith('http')
  ) {
    errors.push(`${p} missing or invalid store url (must start with http)`);
  }
  if (typeof offer.inStock !== 'boolean') {
    errors.push(`${p} inStock must be a boolean`);
  }
  if (
    !offer.checkedAt ||
    typeof offer.checkedAt !== 'string' ||
    !ISO_DATE_REGEX.test(offer.checkedAt)
  ) {
    errors.push(`${p} missing or invalid checkedAt ISO date`);
  }
  if (
    offer.cashPrice !== undefined &&
    (typeof offer.cashPrice !== 'number' || offer.cashPrice <= 0)
  ) {
    errors.push(`${p} cashPrice must be positive number if defined`);
  }
  if (
    offer.installmentPrice !== undefined &&
    (typeof offer.installmentPrice !== 'number' || offer.installmentPrice <= 0)
  ) {
    errors.push(`${p} installmentPrice must be positive number if defined`);
  }
}

const totalParts =
  cpus.length +
  motherboards.length +
  ramKits.length +
  storages.length +
  coolers.length +
  cases.length +
  psus.length +
  gpus.length;

if (errors.length > 0) {
  console.error(`[validate-catalogs] FAILED with ${errors.length} error(s):`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
} else {
  console.log(
    `[validate-catalogs] OK — 8 catalogs verified (${totalParts} parts: ${cpus.length} CPUs, ${motherboards.length} Mobos, ${ramKits.length} RAM, ${storages.length} Storage, ${coolers.length} Coolers, ${cases.length} Cases, ${psus.length} PSUs, ${gpus.length} GPUs) + ${gpuBenchmarks.length + cpuBenchmarks.length} creator benchmark runs + ${brPrices.length + usPrices.length} regional store price offers verified.`,
  );
}
