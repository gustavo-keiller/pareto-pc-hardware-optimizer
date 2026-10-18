/**
 * context-budget.cjs — Claude Code UserPromptSubmit hook.
 *
 * Warns the user when a session's context or age crosses a band. Every turn
 * re-sends the whole context, so a session that has grown to 200K tokens costs
 * ~5x per message what a fresh one does.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const CONTEXT_BANDS = [150_000, 225_000];
const AGE_BANDS_HOURS = [8, 24];
const TAIL_BYTES = 1024 * 1024;
const HEAD_BYTES = 64 * 1024;

function readSlice(file, start, length) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(length);
    const n = fs.readSync(fd, buf, 0, length, start);
    return buf.toString('utf8', 0, n);
  } finally {
    fs.closeSync(fd);
  }
}

function parseLines(text) {
  const out = [];
  for (const line of text.split('\n')) {
    try {
      out.push(JSON.parse(line));
    } catch {
      // first/last line of slice may be cut mid-record
    }
  }
  return out;
}

function lastContextTokens(transcript) {
  const size = fs.statSync(transcript).size;
  const start = Math.max(0, size - TAIL_BYTES);
  const records = parseLines(readSlice(transcript, start, size - start));
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    const u = r.type === 'assistant' && !r.isSidechain && r.message?.usage;
    if (u) {
      return (
        (u.input_tokens ?? 0) +
        (u.cache_read_input_tokens ?? 0) +
        (u.cache_creation_input_tokens ?? 0)
      );
    }
  }
  return 0;
}

function ageHours(transcript) {
  const first = parseLines(readSlice(transcript, 0, HEAD_BYTES)).find((r) => r.timestamp);
  return first ? (Date.now() - Date.parse(first.timestamp)) / 36e5 : 0;
}

function highestBand(value, bands) {
  return bands.filter((b) => value >= b).pop() ?? 0;
}

function main(payload) {
  const { transcript_path: transcript, session_id: sessionId } = payload;
  if (!transcript || !sessionId || !fs.existsSync(transcript)) return;

  const stateDir = path.join(os.tmpdir(), 'claude-context-budget');
  const stateFile = path.join(stateDir, `${sessionId.replace(/[^\w-]/g, '')}.json`);
  let state = { context: 0, age: 0 };
  try {
    state = { ...state, ...JSON.parse(fs.readFileSync(stateFile, 'utf8')) };
  } catch {
    // first prompt of this session
  }

  const tokens = lastContextTokens(transcript);
  const hours = ageHours(transcript);
  const contextBand = highestBand(tokens, CONTEXT_BANDS);
  const ageBand = highestBand(hours, AGE_BANDS_HOURS);

  const notes = [];
  if (contextBand > state.context) {
    notes.push(
      `Context is at ${Math.round(tokens / 1000)}K tokens, and every message re-sends all of it ` +
        `(auto-compaction at 300K).`
    );
  }
  if (ageBand > state.age) {
    notes.push(`This session has been open ${Math.floor(hours)} hours.`);
  }

  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(
    stateFile,
    JSON.stringify({ context: contextBand, age: Math.max(ageBand, state.age) })
  );

  if (notes.length > 0) {
    notes.push(
      'Switching tasks? Start a new session. Unfinished work: ask for a handoff first (handoff skill).'
    );
    process.stdout.write(JSON.stringify({ systemMessage: notes.join(' ') }));
  }
}

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  try {
    main(JSON.parse(raw));
  } catch {
    // never block a prompt on budget warning error
  }
  process.exit(0);
});
