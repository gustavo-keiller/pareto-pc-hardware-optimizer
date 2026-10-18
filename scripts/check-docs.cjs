/**
 * check-docs.cjs — Documentation & Agent Protocol Guard for ParetoPC.
 *
 * Enforces:
 * 1. AGENTS.md character limit (< 12,000 characters for Antigravity auto-load).
 * 2. Every skill in .agents/skills/ has valid YAML frontmatter (name + description).
 * 3. Every skill in .agents/skills/ (except skill-library) is indexed in skill-library/SKILL.md.
 * 4. .claude/skills/ stubs are in sync with .agents/skills/ (via sync-claude-skills.cjs).
 * 5. Every src/ module path listed in CODEMAP.md exists on disk.
 * 6. Relative markdown links in root docs and .agents/ resolve to real files.
 * 7. Math engine isolation: files in src/lib/math/ (excluding __tests__) never import 'react' or 'echarts', and never use 'any'.
 * 8. Safe storage rule: no raw JSON.parse(localStorage.getItem(...)) outside src/utils/storage.ts.
 * 9. File size cap (Rule 7): src/ files warn above 600 lines and fail above 800, except the
 *    allowlisted legacy files, which fail only if they grow past their recorded ceiling.
 */

const fs = require('fs');
const path = require('path');
const { diffStubs } = require('./sync-claude-skills.cjs');

const ROOT = path.join(__dirname, '..');
const MAX_AGENTS_MD_CHARS = 12_000;
const WARN_FILE_LINES = 600;
const MAX_FILE_LINES = 800;

// Legacy files already over MAX_FILE_LINES (line count when the cap was added).
// They may shrink but not grow. When PERF-03 splits one below 800, delete its entry.
const OVERSIZED_FILE_ALLOWLIST = {
  'src/App.tsx': 1112,
  'src/components/Pareto3DCloud.tsx': 1168,
  'src/components/HyperDimensionalExplorer.tsx': 1489,
  'src/components/SimpleParetoGuide.tsx': 1793,
};
const warnings = [];

const errors = [];

function checkAgentsMdCap() {
  const agentsPath = path.join(ROOT, 'AGENTS.md');
  if (!fs.existsSync(agentsPath)) {
    errors.push('Missing root AGENTS.md');
    return;
  }
  const len = fs.readFileSync(agentsPath, 'utf-8').length;
  if (len > MAX_AGENTS_MD_CHARS) {
    errors.push(
      `AGENTS.md is ${len} chars (max allowed: ${MAX_AGENTS_MD_CHARS})`,
    );
  }
}

function checkSkillsAndStubs() {
  const skillsDir = path.join(ROOT, '.agents', 'skills');
  const routerPath = path.join(skillsDir, 'skill-library', 'SKILL.md');
  const routerText = fs.existsSync(routerPath)
    ? fs.readFileSync(routerPath, 'utf-8')
    : '';

  if (!fs.existsSync(skillsDir)) {
    errors.push('Missing .agents/skills/ directory');
    return;
  }

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      errors.push(
        `Skill directory .agents/skills/${entry.name} is missing SKILL.md`,
      );
      continue;
    }
    const content = fs.readFileSync(skillPath, 'utf-8').replace(/\r\n/g, '\n');
    const fm = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) {
      errors.push(
        `.agents/skills/${entry.name}/SKILL.md is missing YAML frontmatter`,
      );
      continue;
    }
    if (!fm[1].includes(`name: ${entry.name}`)) {
      errors.push(
        `.agents/skills/${entry.name}/SKILL.md frontmatter name must match folder '${entry.name}'`,
      );
    }
    if (!fm[1].includes('description:')) {
      errors.push(
        `.agents/skills/${entry.name}/SKILL.md frontmatter is missing 'description:'`,
      );
    }
    if (
      entry.name !== 'skill-library' &&
      !routerText.includes(`${entry.name}/SKILL.md`)
    ) {
      errors.push(
        `Skill '${entry.name}' is not indexed in .agents/skills/skill-library/SKILL.md`,
      );
    }
  }

  const { missing, stale, orphaned } = diffStubs();
  if (missing.length || stale.length || orphaned.length) {
    errors.push(
      `Claude skill stubs out of sync (missing: ${missing.length}, stale: ${stale.length}, orphaned: ${orphaned.length}). Run: npm run sync:skills`,
    );
  }
}

function checkCodemapPaths() {
  const codemapPath = path.join(ROOT, 'CODEMAP.md');
  if (!fs.existsSync(codemapPath)) {
    errors.push('Missing CODEMAP.md');
    return;
  }
  const text = fs.readFileSync(codemapPath, 'utf-8');
  const matches = text.matchAll(
    /\|\s*`((?:src|scripts|\.agents)\/[^`]+)`\s*\|/g,
  );
  for (const m of matches) {
    const rel = m[1];
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) {
      errors.push(`CODEMAP.md references non-existent path: ${rel}`);
    }
  }
}

function checkMarkdownLinks() {
  const mdFiles = [
    path.join(ROOT, 'AGENTS.md'),
    path.join(ROOT, 'README.md'),
    path.join(ROOT, 'DOCUMENTATION_INDEX.md'),
    path.join(ROOT, 'CODEMAP.md'),
    path.join(ROOT, 'CONTEXT.md'),
    path.join(ROOT, 'TODO.md'),
    path.join(ROOT, 'DONE.md'),
    path.join(ROOT, '.agents', 'AGENTS.md'),
    path.join(ROOT, '.agents', 'CURRENT_STATE.md'),
    path.join(ROOT, '.agents', 'skills', 'skill-library', 'SKILL.md'),
  ].filter((f) => fs.existsSync(f));

  const linkRegex = /\[[^\]]+\]\(([^)#]+)(?:#[^)]*)?\)/g;

  for (const file of mdFiles) {
    const content = fs
      .readFileSync(file, 'utf-8')
      .replace(/```[\s\S]*?```/g, '');
    for (const match of content.matchAll(linkRegex)) {
      const target = match[1].trim();
      if (
        target.startsWith('http://') ||
        target.startsWith('https://') ||
        target.startsWith('mailto:') ||
        target.startsWith('file://')
      ) {
        continue;
      }
      const resolved = path.resolve(path.dirname(file), target);
      if (!fs.existsSync(resolved)) {
        const relSource = path.relative(ROOT, file);
        errors.push(`Broken link in ${relSource}: '${target}' does not exist`);
      }
    }
  }
}

function walkFiles(dir, extList) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, extList));
    } else if (extList.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function checkMathIsolationAndSafety() {
  const mathDir = path.join(ROOT, 'src', 'lib', 'math');
  if (fs.existsSync(mathDir)) {
    for (const entry of fs.readdirSync(mathDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
      const filePath = path.join(mathDir, entry.name);
      const code = fs.readFileSync(filePath, 'utf-8');
      if (
        /from\s+['"](?:react|react-dom|echarts|echarts-for-react|lucide-react)['"]/.test(
          code,
        )
      ) {
        errors.push(
          `Math isolation violation: src/lib/math/${entry.name} imports a UI/chart library`,
        );
      }
      if (/:\s*any\b|\bas\s+any\b/.test(code)) {
        errors.push(
          `Type safety violation: src/lib/math/${entry.name} uses explicit 'any'`,
        );
      }
    }
  }

  const srcFiles = walkFiles(path.join(ROOT, 'src'), ['.ts', '.tsx']);
  const storageFile = path.normalize(
    path.join(ROOT, 'src', 'utils', 'storage.ts'),
  );
  for (const file of srcFiles) {
    if (path.normalize(file) === storageFile) continue;
    const code = fs.readFileSync(file, 'utf-8');
    if (/JSON\.parse\s*\(\s*localStorage\.getItem/.test(code)) {
      const rel = path.relative(ROOT, file);
      errors.push(
        `Safe storage violation in ${rel}: use safeGetJSON from src/utils/storage.ts instead of raw JSON.parse(localStorage.getItem(...))`,
      );
    }
  }
}

function checkFileSizes() {
  const srcFiles = walkFiles(path.join(ROOT, 'src'), ['.ts', '.tsx']);
  for (const file of srcFiles) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const lines = (fs.readFileSync(file, 'utf-8').match(/\n/g) ?? []).length;
    const ceiling = OVERSIZED_FILE_ALLOWLIST[rel];
    if (ceiling !== undefined) {
      if (lines > ceiling) {
        errors.push(
          `${rel} grew to ${lines} lines (allowlisted ceiling: ${ceiling}). Split it instead of growing it (Rule 7).`,
        );
      } else if (lines <= MAX_FILE_LINES) {
        warnings.push(
          `${rel} is now ${lines} lines: remove it from OVERSIZED_FILE_ALLOWLIST in scripts/check-docs.cjs.`,
        );
      }
    } else if (lines > MAX_FILE_LINES) {
      errors.push(
        `${rel} is ${lines} lines (max ${MAX_FILE_LINES}). Split it into focused modules or hooks (Rule 7).`,
      );
    } else if (lines > WARN_FILE_LINES) {
      warnings.push(
        `${rel} is ${lines} lines (warn above ${WARN_FILE_LINES}, fail above ${MAX_FILE_LINES}).`,
      );
    }
  }
  for (const rel of Object.keys(OVERSIZED_FILE_ALLOWLIST)) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      errors.push(
        `OVERSIZED_FILE_ALLOWLIST lists missing file ${rel}: remove the entry.`,
      );
    }
  }
}

checkAgentsMdCap();
checkSkillsAndStubs();
checkCodemapPaths();
checkMarkdownLinks();
checkMathIsolationAndSafety();
checkFileSizes();

for (const warning of warnings) {
  console.warn(`[check:docs] warning: ${warning}`);
}

if (errors.length > 0) {
  console.error('[check:docs] FAILED with the following issues:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
} else {
  console.log(
    '[check:docs] OK — AGENTS.md cap, skills, stubs, CODEMAP, links, math isolation, safe storage, and file sizes verified.',
  );
}
