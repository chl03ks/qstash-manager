# NPM Publishing Preparation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare qstash-manager for publication to npm, ensuring professional quality, complete documentation, and clean git history.

**Architecture:** CLI package distributed via npm/npx with proper licensing, documentation, and testing. Clean repository with production-ready code only.

**Tech Stack:** TypeScript, Node.js, npm, tsup, vitest

---

## Task 1: Fix TypeScript Type Errors

**Files:**
- Modify: `src/lib/qstash/client.ts` (multiple lines)
- Modify: `src/commands/dlq/index.ts:691`
- Modify: `src/commands/logs/index.ts:187-192`
- Modify: `src/commands/messages/index.ts:147`
- Modify: `src/commands/queues/index.ts:258`
- Modify: `src/commands/schedules/index.ts:273`
- Modify: `src/commands/security/index.ts:246,324`
- Modify: `src/commands/url-groups/index.ts:227`

**Step 1: Read and analyze type errors**

Run: `npm run typecheck 2>&1 | tee typecheck-errors.txt`
Expected: See 34 type errors documented

**Step 2: Fix TokenSource type errors**

The errors show `Type '"prompt"' is not assignable to type 'TokenSource'`. Need to update TokenSource type definition to include "prompt" as a valid source.

Modify `src/types/index.ts` or wherever TokenSource is defined to include "prompt":

```typescript
export type TokenSource = 'config' | 'env' | 'cli' | 'prompt';
```

**Step 3: Fix QStash SDK type compatibility issues**

The errors in `client.ts` are due to QStash SDK version mismatches. Update method calls to match SDK v2.7.17 API:

- Replace `client.queue.list()` with proper SDK v2 syntax
- Update `client.dlq.get()` calls
- Fix `client.keys()` usage
- Update HTTPMethods type casting

**Step 4: Fix logs spinner issue**

In `src/commands/logs/index.ts:187-192`, the spinner is incorrectly initialized:

```typescript
// Before
const spinner = s.spinner();
spinner.start();

// After
const spinner = s.spinner();
spinner.start('Loading logs...');
```

**Step 5: Fix unused ts-expect-error**

Remove the unused `@ts-expect-error` directive at `src/commands/security/index.ts:246`

**Step 6: Run typecheck to verify all fixes**

Run: `npm run typecheck`
Expected: No errors

**Step 7: Commit type fixes**

```bash
git add src/
git commit -m "fix: resolve TypeScript type errors for npm publishing"
```

---

## Task 2: Create LICENSE File

**Files:**
- Create: `LICENSE`

**Step 1: Create MIT LICENSE file**

```bash
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 chl03ks

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

**Step 2: Verify LICENSE file**

Run: `cat LICENSE`
Expected: See MIT license text with correct copyright

**Step 3: Commit LICENSE**

```bash
git add LICENSE
git commit -m "docs: add MIT LICENSE file"
```

---

## Task 3: Create CHANGELOG.md

**Files:**
- Create: `CHANGELOG.md`

**Step 1: Create initial CHANGELOG**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-13

### Added
- Interactive CLI for QStash management
- URL Groups management with quick-update workflow for local development
- Schedules management with cron presets
- Queues management with parallelism control
- Messages sending, tracking, and cancellation
- Dead Letter Queue (DLQ) management
- Logs and monitoring with filtering and export
- Signing keys management
- Multi-environment configuration support
- First-run setup wizard
- Comprehensive test suite (unit, integration, E2E)

### Features
- **Interactive-First Design** - Beautiful menus powered by @clack/prompts
- **Multi-Environment Support** - Manage production, staging, and dev environments
- **Quick Update Endpoint** - Fast ngrok URL update workflow (< 30 seconds)
- **Cron Presets** - Common schedule patterns built-in
- **Export Options** - JSON/CSV export for logs
- **Never Crashes** - Graceful error handling with back navigation

[0.1.0]: https://github.com/chl03ks/qstash-manager/releases/tag/v0.1.0
```

**Step 2: Add CHANGELOG to npm package files**

Update `package.json`:

```json
"files": [
  "dist",
  "README.md",
  "LICENSE",
  "CHANGELOG.md"
]
```

**Step 3: Commit CHANGELOG**

```bash
git add CHANGELOG.md package.json
git commit -m "docs: add CHANGELOG.md for version tracking"
```

---

## Task 4: Create CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

**Step 1: Create CONTRIBUTING guide**

```markdown
# Contributing to QStash Manager

Thank you for considering contributing to QStash Manager! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/qstash-manager.git
   cd qstash-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up QStash token for testing**
   ```bash
   export QSTASH_TOKEN=your_test_token_here
   ```

## Development Workflow

### Running in Development Mode

```bash
npm run dev
```

This starts tsup in watch mode and runs the CLI after each build.

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests (requires QSTASH_TOKEN)
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage
npm run test:coverage
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

### Testing Locally

```bash
# Link globally
npm link

# Test the CLI
qstash-manager

# Unlink when done
npm unlink
```

## Code Style

- **TypeScript**: Use strict mode, provide types for all functions
- **Testing**: Write tests for new features (unit + integration when possible)
- **Error Handling**: Always handle errors gracefully, never crash
- **UI/UX**: Use @clack/prompts for consistency, always provide "Back" option
- **Commits**: Use conventional commits (feat:, fix:, docs:, etc.)

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code
   - Add/update tests
   - Update README if needed
   - Run tests and typecheck

3. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug in X"
   git commit -m "docs: update README"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **PR Review**
   - Maintainers will review your PR
   - Address feedback if requested
   - Once approved, it will be merged

## Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear version history:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements

## Testing Guidelines

### Unit Tests
- Test individual functions and utilities
- Mock external dependencies (QStash API)
- Fast execution (< 100ms per test)

### Integration Tests
- Test actual QStash API interactions
- Require valid QSTASH_TOKEN
- May be slower due to network calls

### E2E Tests
- Test complete user workflows
- Mock all external calls
- Verify multi-step interactions work correctly

## Feature Requests and Bug Reports

Please use GitHub Issues for:
- Bug reports (use bug template)
- Feature requests (describe use case)
- Questions about usage

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow

## Questions?

Feel free to open an issue for any questions about contributing!

---

Thank you for contributing to QStash Manager! 🚀
```

**Step 2: Commit CONTRIBUTING.md**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING.md with development guidelines"
```

---

## Task 5: Remove Development-Only Files

**Files:**
- Delete: `DESIGN.md`
- Delete: `IMPLEMENTATION_PROMPT.md`
- Delete: `.auto-claude/` (directory)
- Delete: `.auto-claude-status`
- Delete: `.claude_settings.json`
- Delete: `.worktrees/` (directory)
- Modify: `.gitignore` (add .claude/ if not present)

**Step 1: Remove design and implementation files**

```bash
rm DESIGN.md IMPLEMENTATION_PROMPT.md
```

**Step 2: Remove auto-claude artifacts**

```bash
rm -rf .auto-claude .auto-claude-status .claude_settings.json .worktrees
```

**Step 3: Update .gitignore to prevent future commits**

Add to `.gitignore`:

```bash
# Claude Code artifacts
.claude/
.claude_settings.json
.auto-claude/
.auto-claude-status
.worktrees/
```

**Step 4: Verify files are removed**

Run: `ls -la | grep -E "(DESIGN|IMPLEMENTATION|auto-claude|worktrees)"`
Expected: No output (files removed)

**Step 5: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove development-only files and artifacts"
```

---

## Task 6: Update Package.json for Publishing

**Files:**
- Modify: `package.json`

**Step 1: Verify all required npm fields are present**

Check current `package.json` has:
- ✅ name: "qstash-manager"
- ✅ version: "0.1.0"
- ✅ description
- ✅ keywords
- ✅ author
- ✅ license: "MIT"
- ✅ repository
- ✅ bugs
- ✅ homepage
- ✅ bin
- ✅ files
- ✅ engines

**Step 2: Add missing npm scripts for publishing**

Add to `package.json` scripts:

```json
"scripts": {
  "prepublishOnly": "npm run typecheck && npm run test && npm run build",
  "prepack": "npm run build"
}
```

**Step 3: Verify package.json is valid**

Run: `npm pkg fix`
Expected: Auto-fixes any format issues

**Step 4: Commit package.json updates**

```bash
git add package.json
git commit -m "chore: update package.json for npm publishing"
```

---

## Task 7: Test Local Package Installation

**Files:**
- None (testing only)

**Step 1: Create npm package tarball**

Run: `npm pack`
Expected: Creates `qstash-manager-0.1.0.tgz`

**Step 2: Inspect package contents**

Run: `tar -tzf qstash-manager-0.1.0.tgz | head -30`
Expected: See dist/, README.md, LICENSE, CHANGELOG.md, package.json

**Step 3: Verify no unwanted files**

Run: `tar -tzf qstash-manager-0.1.0.tgz | grep -E "(\.ts$|test|DESIGN|IMPLEMENTATION|auto-claude|\.claude)"`
Expected: No output (no dev files included)

**Step 4: Test installation from tarball**

```bash
cd /tmp
npm install /Users/daniel/development/qstash-manager-project/qstash-manager-0.1.0.tgz
npx qstash-manager --version
```

Expected: Shows version 0.1.0

**Step 5: Clean up test installation**

```bash
cd /tmp
rm -rf node_modules package-lock.json
cd /Users/daniel/development/qstash-manager-project
rm qstash-manager-0.1.0.tgz
```

**Step 6: Document test results**

Create: `docs/PRE_PUBLISH_CHECKLIST.md`

```markdown
# Pre-Publish Checklist

✅ TypeScript compiles without errors (`npm run typecheck`)
✅ All tests pass (`npm test`)
✅ Build succeeds (`npm run build`)
✅ LICENSE file exists (MIT)
✅ CHANGELOG.md created with v0.1.0 entry
✅ CONTRIBUTING.md created
✅ Development files removed (DESIGN.md, etc.)
✅ Package tarball tested (`npm pack`)
✅ Local installation tested
✅ No dev files in package
✅ All npm scripts work
✅ README badges point to correct URLs
✅ Git history cleaned (optional, see Task 8)

## Ready to Publish

Once all items above are checked:

1. Tag release: `git tag v0.1.0`
2. Push tags: `git push origin main --tags`
3. Publish: `npm publish`
4. Verify: `npm info qstash-manager`
5. Test install: `npx qstash-manager@0.1.0`
```

**Step 7: Commit checklist**

```bash
git add docs/PRE_PUBLISH_CHECKLIST.md
git commit -m "docs: add pre-publish checklist"
```

---

## Task 8: Clean Git History (Optional)

**Files:**
- None (git operations only)

⚠️ **WARNING: This rewrites git history. Only do this if:**
- Repository is not yet public or has no collaborators
- You want a clean initial commit
- You understand the consequences

**Step 1: Review current git history**

Run: `git log --oneline | wc -l`
Expected: See ~20+ commits with "auto-claude" prefixes

**Step 2: Backup current branch**

```bash
git branch backup-before-squash
```

**Step 3: Create single clean commit (OPTIONAL)**

If you want to squash all history into one commit:

```bash
# Create orphan branch
git checkout --orphan new-main

# Stage all files
git add -A

# Create single commit
git commit -m "feat: initial release of qstash-manager v0.1.0

Interactive CLI for managing QStash with features:
- URL Groups management with quick-update workflow
- Schedules management with cron presets
- Queues management with parallelism control
- Messages sending, tracking, and cancellation
- Dead Letter Queue (DLQ) management
- Logs and monitoring with filtering and export
- Signing keys management
- Multi-environment configuration support
- First-run setup wizard
- Comprehensive test suite (unit, integration, E2E)
"

# Replace main branch
git branch -D main
git branch -m main
```

**Step 4: Verify clean history**

Run: `git log --oneline`
Expected: See single commit with clean message

**Step 5: Force push to remote (ONLY if safe to do so)**

⚠️ **STOP:** Do NOT run this if:
- Others have cloned the repository
- Repository is public and has forks
- You're unsure about rewriting history

If safe to proceed:

```bash
git push origin main --force
```

**Alternative: Keep history but clean up commits**

If you prefer to keep history but make it cleaner:

```bash
# Interactive rebase from root
git rebase -i --root

# In the editor, change "pick" to "squash" for commits you want to combine
# Save and edit commit messages
```

---

## Task 9: Create GitHub Release (After Publishing)

**Files:**
- None (GitHub operations only)

**Step 1: Tag the release**

```bash
git tag -a v0.1.0 -m "Release v0.1.0 - Initial public release"
```

**Step 2: Push tag to GitHub**

```bash
git push origin v0.1.0
```

**Step 3: Create GitHub release**

Via GitHub web interface:
1. Go to: https://github.com/chl03ks/qstash-manager/releases/new
2. Select tag: v0.1.0
3. Title: "v0.1.0 - Initial Release"
4. Description: Copy from CHANGELOG.md
5. Check "Set as the latest release"
6. Click "Publish release"

**Step 4: Verify release**

Visit: https://github.com/chl03ks/qstash-manager/releases
Expected: See v0.1.0 release with changelog

---

## Task 10: Publish to NPM

**Files:**
- None (npm operations only)

**Step 1: Verify npm login**

Run: `npm whoami`
Expected: See your npm username

If not logged in:

```bash
npm login
```

**Step 2: Dry-run publish**

Run: `npm publish --dry-run`
Expected: See package details, no errors

**Step 3: Publish to npm**

Run: `npm publish`
Expected: Success message with package URL

**Step 4: Verify package on npm**

Run: `npm info qstash-manager`
Expected: See package metadata with version 0.1.0

**Step 5: Test npx installation**

```bash
npx qstash-manager@0.1.0 --version
```

Expected: Downloads and runs, shows version 0.1.0

**Step 6: Test global installation**

```bash
npm install -g qstash-manager
qstash-manager --version
qm --version
npm uninstall -g qstash-manager
```

Expected: Both commands work and show version

**Step 7: Update README badges**

Verify npm badge works:
- Visit: https://www.npmjs.com/package/qstash-manager
- Check badge in README shows correct version

---

## Task 11: Post-Publish Verification

**Files:**
- Modify: `README.md` (if needed)

**Step 1: Test all installation methods**

Test as end user:

```bash
# Method 1: npx
npx qstash-manager --help

# Method 2: Global install
npm install -g qstash-manager
qstash-manager --help
qm --help

# Method 3: Local project
mkdir test-project && cd test-project
npm init -y
npm install qstash-manager
npx qstash-manager --help
cd .. && rm -rf test-project
```

**Step 2: Verify documentation links**

Check all links in README work:
- GitHub repository
- npm package page
- Upstash console
- Documentation

**Step 3: Create announcement**

Prepare announcement for:
- GitHub Discussions (if enabled)
- Twitter/X
- Reddit (r/node, r/serverless)
- Dev.to blog post
- Upstash Discord

**Step 4: Monitor initial feedback**

Watch for:
- GitHub issues
- npm download stats
- User feedback

---

## Success Criteria

✅ Package published to npm successfully
✅ `npx qstash-manager` works for any user
✅ Global installation (`npm i -g`) works
✅ All documentation is accurate
✅ LICENSE file included
✅ CHANGELOG.md tracks versions
✅ No TypeScript errors
✅ All tests pass
✅ Clean git history (optional)
✅ GitHub release created
✅ README badges work correctly

## Next Steps

After v0.1.0 is published:

1. **Monitor usage**: Watch npm download stats
2. **Gather feedback**: Create GitHub Discussions for users
3. **Plan v0.2.0**: Based on user requests and feedback
4. **Documentation**: Consider creating docs site with VitePress
5. **CI/CD**: Set up GitHub Actions for automated testing and publishing
6. **Dependabot**: Enable automated dependency updates

---

**Estimated Completion Time:** 2-3 hours for careful execution
**Risk Level:** Low (all changes are reversible except force-push in Task 8)
**Dependencies:** npm account, GitHub repository access
