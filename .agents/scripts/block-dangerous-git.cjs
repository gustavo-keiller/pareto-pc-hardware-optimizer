/**
 * block-dangerous-git.cjs — Claude Code PreToolUse hook (Bash + PowerShell).
 *
 * Refuses git commands that destroy work. Multiple agent sessions may share one
 * checkout, so a `reset --hard` or `checkout .` in one silently destroys
 * another's uncommitted edits. Plain `git push` is allowed: agents push their
 * own branches and open PRs. Pushes that overwrite or delete remote history are
 * not: `--force` / `-f`, a `+refspec`, `--mirror`, `--delete` / `:branch`, and
 * `--force-with-lease` aimed at main or master.
 */

const push = (rest) =>
  new RegExp(String.raw`\bgit\s+(-C\s+\S+\s+)?push\b[^;&|\n]*` + rest);

const DANGEROUS = [
  [
    push(String.raw`\s(--force|-[a-zA-Z]*f[a-zA-Z]*)(\s|$)`),
    'git push --force',
  ],
  [push(String.raw`\s\+\S`), 'git push +refspec (force)'],
  [push(String.raw`\s--mirror\b`), 'git push --mirror'],
  [push(String.raw`\s(--delete|-d)(\s|$)`), 'git push --delete'],
  [push(String.raw`\s:\S`), 'git push :branch (delete)'],
  [
    push(String.raw`--force-with-lease[^;&|\n]*\b(main|master)\b`),
    'force-push to main',
  ],
  [
    push(String.raw`\b(main|master)\b[^;&|\n]*--force-with-lease`),
    'force-push to main',
  ],
  [/\bgit\s+filter-(branch|repo)\b/, 'git filter-branch / filter-repo'],
  [/\bgit\s+reset\b.*--hard\b/, 'git reset --hard'],
  [/\bgit\s+clean\b.*\s-[a-zA-Z]*f/, 'git clean -f'],
  [/\bgit\s+branch\b.*\s-D\b/, 'git branch -D'],
  [/\bgit\s+checkout\s+(--\s+)?\.(\s|$|[;&|])/, 'git checkout .'],
  [/\bgit\s+restore\b.*\s\.(\s|$|[;&|])/, 'git restore .'],
];

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let command = '';
  try {
    command = JSON.parse(raw).tool_input?.command ?? '';
  } catch {
    process.exit(0);
  }

  for (const [pattern, label] of DANGEROUS) {
    if (pattern.test(command)) {
      process.stderr.write(
        `BLOCKED: this command matches '${label}'. It destroys work that other agent ` +
          `sessions or the remote depend on, so this is left to the user. Ask them to run it.\n`,
      );
      process.exit(2);
    }
  }
  process.exit(0);
});
