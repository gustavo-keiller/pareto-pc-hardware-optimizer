// @ts-check
/**
 * Interactive & CLI Maintainer Tooling (`scripts/add-part.cjs`)
 *
 * Guides maintainers through adding a hardware component into `src/data/catalogs/`,
 * validates inputs against schema bounds and existing IDs, and runs catalog validation.
 *
 * Usage:
 *   Interactive:  npm run add-part
 *   CLI non-interactive: node scripts/add-part.cjs --category cpu --json '{"id":"...","name":"...",...}'
 *   Dry run:      node scripts/add-part.cjs --category cpu --dry-run --json '{"id":"...","name":"...",...}'
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline/promises');
const { stdin: input, stdout: output } = require('process');

const CATALOGS_DIR = path.resolve(__dirname, '../src/data/catalogs');

/** @type {Record<string, { file: string; label: string }>} */
const CATEGORY_MAP = {
  cpu: { file: 'cpus.json', label: 'CPU (Processor)' },
  gpu: { file: 'gpus.json', label: 'GPU (Graphics Card)' },
  motherboard: { file: 'motherboards.json', label: 'Motherboard' },
  ram: { file: 'ram.json', label: 'RAM Kit' },
  storage: { file: 'storage.json', label: 'Storage (SSD)' },
  cooler: { file: 'coolers.json', label: 'CPU Cooler' },
  case: { file: 'cases.json', label: 'PC Case' },
  psu: { file: 'psus.json', label: 'PSU (Power Supply)' },
};

const VALID_SOCKETS = ['AM4', 'AM5', 'LGA1700', 'LGA1851'];
const VALID_RAM_GENS = ['DDR4', 'DDR5'];
const VALID_FORM_FACTORS = ['ATX', 'Micro-ATX', 'Mini-ITX'];
const VALID_PSU_RATINGS = [
  '80+ Bronze',
  '80+ Gold',
  '80+ Platinum',
  '80+ Titanium',
  '80+ Silver',
  '80+ White',
];
const VALID_PSU_MODULARITY = ['Full', 'Semi', 'Non'];

/**
 * Validates a component candidate object against schema rules.
 * @param {string} category
 * @param {any} item
 * @param {any[]} existingCatalog
 * @returns {string[]} List of validation error messages (empty if valid)
 */
function validateCandidateObject(category, item, existingCatalog = []) {
  const errs = [];
  if (!item || typeof item !== 'object') {
    return ['Item must be an object'];
  }

  // Base fields
  if (!item.id || typeof item.id !== 'string' || item.id.includes(' ')) {
    errs.push(
      "ID must be a non-empty string without spaces (e.g. 'amd-ryzen-7-9800x3d')",
    );
  } else if (existingCatalog.some((c) => c.id === item.id)) {
    errs.push(`Duplicate ID '${item.id}' already exists in catalog`);
  }

  if (
    !item.name ||
    typeof item.name !== 'string' ||
    item.name.trim().length === 0
  ) {
    errs.push('Name must be a non-empty string');
  }

  if (
    typeof item.price !== 'number' ||
    !Number.isFinite(item.price) ||
    item.price <= 0
  ) {
    errs.push(`Price must be a positive number (got ${item.price})`);
  }

  if (
    !item.source ||
    typeof item.source !== 'string' ||
    item.source.trim().length === 0
  ) {
    errs.push('Source citation must be provided');
  }

  if (
    !item.checkedAt ||
    typeof item.checkedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(item.checkedAt)
  ) {
    errs.push(
      `checkedAt must be an ISO date YYYY-MM-DD (got '${item.checkedAt}')`,
    );
  }

  // Category specific validation
  switch (category) {
    case 'cpu':
      if (!['AMD', 'Intel'].includes(item.vendor))
        errs.push("vendor must be 'AMD' or 'Intel'");
      if (!VALID_SOCKETS.includes(item.socket))
        errs.push(`socket must be one of: ${VALID_SOCKETS.join(', ')}`);
      if (typeof item.cores !== 'number' || item.cores <= 0)
        errs.push('cores must be > 0');
      if (typeof item.threads !== 'number' || item.threads < item.cores)
        errs.push('threads must be >= cores');
      if (typeof item.tdpWatts !== 'number' || item.tdpWatts <= 0)
        errs.push('tdpWatts must be > 0');
      if (
        typeof item.gamingScore !== 'number' ||
        item.gamingScore < 0 ||
        item.gamingScore > 100
      ) {
        errs.push('gamingScore must be between 0 and 100');
      }
      if (
        !Array.isArray(item.supportedRamGenerations) ||
        item.supportedRamGenerations.length === 0
      ) {
        errs.push(
          'supportedRamGenerations must be a non-empty array of RAM generations',
        );
      }
      break;

    case 'gpu':
      if (!['NVIDIA', 'AMD', 'Intel'].includes(item.vendor))
        errs.push("vendor must be 'NVIDIA', 'AMD', or 'Intel'");
      if (typeof item.rasterFps1440p !== 'number' || item.rasterFps1440p <= 0)
        errs.push('rasterFps1440p must be > 0');
      if (typeof item.rtFps1440p !== 'number' || item.rtFps1440p < 0)
        errs.push('rtFps1440p must be >= 0');
      if (typeof item.vramGb !== 'number' || item.vramGb <= 0)
        errs.push('vramGb must be > 0');
      if (typeof item.tdpWatts !== 'number' || item.tdpWatts <= 0)
        errs.push('tdpWatts must be > 0');
      break;

    case 'motherboard':
      if (!VALID_SOCKETS.includes(item.socket))
        errs.push(`socket must be one of: ${VALID_SOCKETS.join(', ')}`);
      if (!VALID_RAM_GENS.includes(item.ramGeneration))
        errs.push(`ramGeneration must be one of: ${VALID_RAM_GENS.join(', ')}`);
      if (!VALID_FORM_FACTORS.includes(item.formFactor))
        errs.push(
          `formFactor must be one of: ${VALID_FORM_FACTORS.join(', ')}`,
        );
      if (typeof item.ramSlots !== 'number' || item.ramSlots < 2)
        errs.push('ramSlots must be >= 2');
      break;

    case 'ram':
      if (!VALID_RAM_GENS.includes(item.generation))
        errs.push(`generation must be one of: ${VALID_RAM_GENS.join(', ')}`);
      if (typeof item.capacityGb !== 'number' || item.capacityGb < 8)
        errs.push('capacityGb must be >= 8');
      if (typeof item.speedMhz !== 'number' || item.speedMhz < 2133)
        errs.push('speedMhz must be >= 2133');
      if (typeof item.modulesCount !== 'number' || item.modulesCount < 1)
        errs.push('modulesCount must be >= 1');
      break;

    case 'storage':
      if (!['NVMe M.2', 'SATA 2.5"'].includes(item.type))
        errs.push("type must be 'NVMe M.2' or 'SATA 2.5\"'");
      if (!['M.2-2280', '2.5-inch'].includes(item.formFactor))
        errs.push("formFactor must be 'M.2-2280' or '2.5-inch'");
      if (typeof item.capacityGb !== 'number' || item.capacityGb < 120)
        errs.push('capacityGb must be >= 120');
      break;

    case 'cooler':
      if (
        !Array.isArray(item.supportedSockets) ||
        item.supportedSockets.length === 0
      ) {
        errs.push('supportedSockets must be a non-empty array of sockets');
      }
      if (typeof item.heightMm !== 'number' || item.heightMm <= 0)
        errs.push('heightMm must be > 0');
      if (typeof item.maxTdpWatts !== 'number' || item.maxTdpWatts <= 0)
        errs.push('maxTdpWatts must be > 0');
      if (item.type && !['Air', 'AIO'].includes(item.type))
        errs.push("type must be 'Air' or 'AIO'");
      break;

    case 'case':
      if (
        !Array.isArray(item.supportedFormFactors) ||
        item.supportedFormFactors.length === 0
      ) {
        errs.push('supportedFormFactors must be a non-empty array');
      }
      if (typeof item.maxGpuLengthMm !== 'number' || item.maxGpuLengthMm <= 0)
        errs.push('maxGpuLengthMm must be > 0');
      if (
        typeof item.maxCpuCoolerHeightMm !== 'number' ||
        item.maxCpuCoolerHeightMm <= 0
      ) {
        errs.push('maxCpuCoolerHeightMm must be > 0');
      }
      break;

    case 'psu':
      if (typeof item.wattage !== 'number' || item.wattage < 300)
        errs.push('wattage must be >= 300');
      if (!VALID_PSU_RATINGS.includes(item.efficiencyRating))
        errs.push(
          `efficiencyRating must be one of: ${VALID_PSU_RATINGS.join(', ')}`,
        );
      if (!VALID_PSU_MODULARITY.includes(item.modular))
        errs.push(`modular must be one of: ${VALID_PSU_MODULARITY.join(', ')}`);
      break;

    default:
      errs.push(`Unknown category: ${category}`);
  }

  return errs;
}

/**
 * Appends a validated candidate object to its catalog file.
 * @param {string} category
 * @param {any} candidate
 * @param {{ dryRun?: boolean; catalogsDir?: string }} [options]
 * @returns {{ success: boolean; error?: string; targetPath?: string }}
 */
function appendPartToCatalog(category, candidate, options = {}) {
  const normCat = category.toLowerCase().trim();
  const info = CATEGORY_MAP[normCat];
  if (!info) {
    return { success: false, error: `Invalid category '${category}'` };
  }

  const baseDir = options.catalogsDir || CATALOGS_DIR;
  const targetPath = path.join(baseDir, info.file);

  if (!fs.existsSync(targetPath)) {
    return { success: false, error: `Catalog file not found: ${targetPath}` };
  }

  let catalog;
  try {
    const content = fs.readFileSync(targetPath, 'utf8');
    catalog = JSON.parse(content);
    if (!Array.isArray(catalog)) throw new Error('Catalog is not an array');
  } catch (err) {
    return {
      success: false,
      error: `Failed to read catalog: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const validationErrors = validateCandidateObject(normCat, candidate, catalog);
  if (validationErrors.length > 0) {
    return { success: false, error: validationErrors.join('; ') };
  }

  if (options.dryRun) {
    return { success: true, targetPath };
  }

  catalog.push(candidate);
  const formatted = JSON.stringify(catalog, null, 2) + '\n';
  fs.writeFileSync(targetPath, formatted, 'utf8');

  return { success: true, targetPath };
}

/**
 * Interactive readline helper for user prompts.
 * @param {readline.Interface} rl
 * @param {string} question
 * @param {string} [defaultValue]
 * @returns {Promise<string>}
 */
async function promptWithDefault(rl, question, defaultValue) {
  const suffix = defaultValue ? ` [default: ${defaultValue}]: ` : ': ';
  const ans = await rl.question(question + suffix);
  const trimmed = ans.trim();
  return trimmed || defaultValue || '';
}

/**
 * Runs the interactive CLI wizard.
 */
async function runInteractiveCli() {
  const rl = readline.createInterface({ input, output });
  const today = new Date().toISOString().slice(0, 10);

  try {
    console.log('\n========================================');
    console.log('   ParetoPC — Add Hardware Component    ');
    console.log('========================================\n');

    console.log('Available hardware categories:');
    const catKeys = Object.keys(CATEGORY_MAP);
    catKeys.forEach((k, idx) => {
      console.log(
        `  ${idx + 1}. ${k.toUpperCase().padEnd(12)} (${CATEGORY_MAP[k].label})`,
      );
    });

    const catSelection = await promptWithDefault(
      rl,
      '\nSelect category (1-8 or name)',
    );
    let category = '';
    const num = parseInt(catSelection, 10);
    if (num >= 1 && num <= catKeys.length) {
      category = catKeys[num - 1];
    } else if (CATEGORY_MAP[catSelection.toLowerCase()]) {
      category = catSelection.toLowerCase();
    } else {
      console.error(`Invalid category: "${catSelection}"`);
      rl.close();
      process.exit(1);
    }

    console.log(`\nAdding new ${CATEGORY_MAP[category].label}...\n`);

    // Common Base Attributes
    const id = await promptWithDefault(
      rl,
      'Component ID (e.g. amd-ryzen-7-9800x3d)',
    );
    const name = await promptWithDefault(
      rl,
      'Display Name (e.g. AMD Ryzen 7 9800X3D)',
    );
    const priceStr = await promptWithDefault(
      rl,
      'Base Price in USD ($) (e.g. 479)',
    );
    const price = parseFloat(priceStr);
    const source = await promptWithDefault(
      rl,
      'Source Citation (e.g. TechPowerUp Review 2024-11)',
    );
    const checkedAt = await promptWithDefault(
      rl,
      'Audit Date (YYYY-MM-DD)',
      today,
    );

    /** @type {any} */
    const item = { id, name, price, source, checkedAt };

    // Category-specific prompts
    if (category === 'cpu') {
      item.vendor = await promptWithDefault(rl, 'Vendor (AMD / Intel)', 'AMD');
      item.socket = await promptWithDefault(
        rl,
        'Socket (AM4 / AM5 / LGA1700 / LGA1851)',
        'AM5',
      );
      item.cores = parseInt(
        await promptWithDefault(rl, 'Cores count', '8'),
        10,
      );
      item.threads = parseInt(
        await promptWithDefault(rl, 'Threads count', '16'),
        10,
      );
      item.tdpWatts = parseInt(
        await promptWithDefault(rl, 'TDP Watts', '120'),
        10,
      );
      item.gamingScore = parseFloat(
        await promptWithDefault(rl, 'Gaming Score (0-100)', '95'),
      );
      const ramGens = await promptWithDefault(
        rl,
        'Supported RAM Generations (comma-separated)',
        'DDR5',
      );
      item.supportedRamGenerations = ramGens
        .split(',')
        .map((s) => s.trim().toUpperCase());
    } else if (category === 'gpu') {
      item.vendor = await promptWithDefault(
        rl,
        'Vendor (NVIDIA / AMD / Intel)',
        'NVIDIA',
      );
      item.rasterFps1440p = parseFloat(
        await promptWithDefault(rl, '1440p Raster FPS (e.g. 95.4)'),
      );
      item.rtFps1440p = parseFloat(
        await promptWithDefault(rl, '1440p Ray Tracing FPS (e.g. 52.1)'),
      );
      item.vramGb = parseInt(
        await promptWithDefault(rl, 'VRAM (GB)', '16'),
        10,
      );
      item.tdpWatts = parseInt(
        await promptWithDefault(rl, 'TDP (Watts)', '250'),
        10,
      );
      const lenStr = await promptWithDefault(
        rl,
        'Length (mm) [optional]',
        '280',
      );
      if (lenStr) item.lengthMm = parseInt(lenStr, 10);
    } else if (category === 'motherboard') {
      item.socket = await promptWithDefault(
        rl,
        'Socket (AM4 / AM5 / LGA1700 / LGA1851)',
        'AM5',
      );
      item.ramGeneration = await promptWithDefault(
        rl,
        'RAM Generation (DDR4 / DDR5)',
        'DDR5',
      );
      item.formFactor = await promptWithDefault(
        rl,
        'Form Factor (ATX / Micro-ATX / Mini-ITX)',
        'ATX',
      );
      item.ramSlots = parseInt(
        await promptWithDefault(rl, 'RAM Slots (2 or 4)', '4'),
        10,
      );
      const m2 = await promptWithDefault(rl, 'M.2 Slots count', '2');
      if (m2) item.m2Slots = parseInt(m2, 10);
    } else if (category === 'ram') {
      item.generation = await promptWithDefault(
        rl,
        'Generation (DDR4 / DDR5)',
        'DDR5',
      );
      item.capacityGb = parseInt(
        await promptWithDefault(rl, 'Total Capacity (GB)', '32'),
        10,
      );
      item.speedMhz = parseInt(
        await promptWithDefault(rl, 'Speed (MHz)', '6000'),
        10,
      );
      item.modulesCount = parseInt(
        await promptWithDefault(rl, 'Number of Sticks', '2'),
        10,
      );
      const rgb = await promptWithDefault(rl, 'RGB Lighting? (y/n)', 'n');
      item.rgb = rgb.toLowerCase().startsWith('y');
    } else if (category === 'storage') {
      item.type = await promptWithDefault(
        rl,
        'Type (NVMe M.2 / SATA 2.5")',
        'NVMe M.2',
      );
      item.formFactor = await promptWithDefault(
        rl,
        'Form Factor (M.2-2280 / 2.5-inch)',
        'M.2-2280',
      );
      item.capacityGb = parseInt(
        await promptWithDefault(rl, 'Capacity (GB)', '1000'),
        10,
      );
      const speed = await promptWithDefault(
        rl,
        'Read Speed (MB/s) [optional]',
        '5000',
      );
      if (speed) item.readSpeedMbps = parseInt(speed, 10);
    } else if (category === 'cooler') {
      item.type = await promptWithDefault(rl, 'Type (Air / AIO)', 'Air');
      const socks = await promptWithDefault(
        rl,
        'Supported Sockets (comma-separated)',
        'AM4, AM5, LGA1700, LGA1851',
      );
      item.supportedSockets = socks.split(',').map((s) => s.trim());
      item.heightMm = parseInt(
        await promptWithDefault(rl, 'Height or Rad Size (mm)', '155'),
        10,
      );
      item.maxTdpWatts = parseInt(
        await promptWithDefault(rl, 'Max TDP Watts', '220'),
        10,
      );
    } else if (category === 'case') {
      const ffs = await promptWithDefault(
        rl,
        'Supported Form Factors (comma-separated)',
        'ATX, Micro-ATX, Mini-ITX',
      );
      item.supportedFormFactors = ffs.split(',').map((s) => s.trim());
      item.maxGpuLengthMm = parseInt(
        await promptWithDefault(rl, 'Max GPU Length (mm)', '360'),
        10,
      );
      item.maxCpuCoolerHeightMm = parseInt(
        await promptWithDefault(rl, 'Max Cooler Height (mm)', '165'),
        10,
      );
      const isSff = await promptWithDefault(
        rl,
        'Is SFF Mini-ITX chassis? (y/n)',
        'n',
      );
      item.isSff = isSff.toLowerCase().startsWith('y');
    } else if (category === 'psu') {
      item.wattage = parseInt(
        await promptWithDefault(rl, 'Wattage (Watts)', '750'),
        10,
      );
      item.efficiencyRating = await promptWithDefault(
        rl,
        'Efficiency Rating',
        '80+ Gold',
      );
      item.modular = await promptWithDefault(
        rl,
        'Modularity (Full / Semi / Non)',
        'Full',
      );
    }

    console.log('\nPreview candidate component:');
    console.log(JSON.stringify(item, null, 2));

    const confirm = await promptWithDefault(
      rl,
      '\nWrite to catalog? (y/n)',
      'y',
    );
    if (!confirm.toLowerCase().startsWith('y')) {
      console.log('Aborted by user.');
      rl.close();
      return;
    }

    const res = appendPartToCatalog(category, item);
    if (!res.success) {
      console.error(`\nValidation failed: ${res.error}`);
      rl.close();
      process.exit(1);
    }

    console.log(`\nSuccessfully added '${item.id}' to ${res.targetPath}!`);
    console.log('Running validation check...\n');

    // Run catalog validation
    const { spawnSync } = require('child_process');
    const valRes = spawnSync(
      process.execPath,
      [path.resolve(__dirname, 'validate-catalogs.cjs')],
      {
        stdio: 'inherit',
      },
    );

    if (valRes.status !== 0) {
      console.error('\nCatalog validator reported errors. Reverting append...');
      // Revert append
      const catalogFile = path.join(CATALOGS_DIR, CATEGORY_MAP[category].file);
      const current = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
      const reverted = current.filter((c) => c.id !== item.id);
      fs.writeFileSync(
        catalogFile,
        JSON.stringify(reverted, null, 2) + '\n',
        'utf8',
      );
      console.error('Revert complete. Please fix the issue and try again.');
      rl.close();
      process.exit(1);
    }

    console.log('\nCatalog validation passed cleanly!');
    rl.close();
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    rl.close();
    process.exit(1);
  }
}

// CLI argument handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const catIdx = args.indexOf('--category');
  const jsonIdx = args.indexOf('--json');
  const isDryRun = args.includes('--dry-run');

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage:');
    console.log('  Interactive: npm run add-part');
    console.log(
      '  CLI: node scripts/add-part.cjs --category <name> --json <jsonString> [--dry-run]',
    );
    process.exit(0);
  }

  if (catIdx !== -1 && jsonIdx !== -1) {
    const category = args[catIdx + 1];
    const jsonStr = args[jsonIdx + 1];
    try {
      const candidate = JSON.parse(jsonStr);
      const res = appendPartToCatalog(category, candidate, {
        dryRun: isDryRun,
      });
      if (!res.success) {
        console.error(`Error: ${res.error}`);
        process.exit(1);
      }
      console.log(
        `Success: Candidate '${candidate.id}' is valid for ${category}${isDryRun ? ' (dry-run)' : ''}`,
      );
      process.exit(0);
    } catch (err) {
      console.error(
        `Error parsing JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(1);
    }
  } else {
    runInteractiveCli();
  }
}

module.exports = {
  CATEGORY_MAP,
  validateCandidateObject,
  appendPartToCatalog,
};
