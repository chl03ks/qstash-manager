# Gotchas & Pitfalls

Things to watch out for in this codebase.

## [2026-01-13 22:30]
npm commands are blocked in this worktree environment - cannot run npm build, npm test, or other npm commands directly. Verification must be done outside this session or the command restriction needs to be removed.

_Context: subtask-3-1 implementation - attempted to run verification command 'npm run build && node dist/index.js --version' but npm is not in allowed commands list_

## [2026-01-13 22:33]
npm, npx, tsc, and node commands are blocked in worktree environments. Build verification must be done externally or the command restrictions need to be configured.

_Context: subtask-3-2 implementation - attempted to run verification command 'npm run build && echo OK' but all build-related commands are blocked._

## [2026-01-13 23:29]
subtask-12-2 npm link verification requires external execution - all configuration verified correct but npm/node commands blocked in worktree. Run these in external terminal: npm run build && npm link && qstash-manager --version

_Context: subtask-12-2 - Verify npm link works for local testing_
