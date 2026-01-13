# Specification: QStash Manager CLI Tool

## Overview

Build `qstash-manager`, a standalone NPM CLI tool for comprehensive management of QStash resources including URL groups, schedules, queues, messages, Dead Letter Queue (DLQ), and monitoring. The tool will be extracted from an existing working implementation in the Prefix project, removing all Prefix-specific dependencies while preserving the excellent interactive UX. The CLI will be published to NPM for public use via `npx qstash-manager` or global installation.

## Workflow Type

**Type**: feature

**Rationale**: This is a new standalone project being built from scratch, though adapting patterns from existing code. It involves creating a complete NPM package with multiple features, configuration management, and a full interactive CLI interface. The scope spans multiple weeks of development with phased feature delivery.

## Task Scope

### Services Involved
- **qstash-manager** (primary) - New standalone NPM CLI package

### This Task Will:
- [ ] Create complete NPM package structure with TypeScript, tsup, and vitest configuration
- [ ] Implement config manager with multi-environment token storage (~/.qstash-manager/config.json)
- [ ] Build QStash client wrapper around @upstash/qstash SDK
- [ ] Create interactive UI utilities using @clack/prompts
- [ ] Implement first-run setup wizard for new users
- [ ] Build URL groups management (adapted from existing Prefix code)
- [ ] Implement messages functionality (send, track, cancel)
- [ ] Add basic logs viewing capability
- [ ] Build queues management (list, create, pause/resume, delete)
- [ ] Build schedules management (list, create, pause/resume, delete)
- [ ] Implement Dead Letter Queue management (list, retry, delete)
- [ ] Add signing keys management
- [ ] Write unit and integration tests
- [ ] Configure for NPM publishing

### Out of Scope:
- Web UI companion application
- Desktop notifications
- Plugin system
- AI-powered error diagnosis
- Historical trends and charts
- Any integration with Prefix codebase after extraction

## Service Context

### qstash-manager

**Tech Stack:**
- Language: TypeScript (strict mode, ES2022)
- Framework: Commander.js (CLI), @clack/prompts (interactive UI)
- API Client: @upstash/qstash SDK
- Tables: cli-table3
- Colors: picocolors
- Build: tsup (with shebang banner)
- Testing: vitest
- Key directories: `src/commands/`, `src/lib/`, `src/types/`

**Entry Point:** `src/index.ts`

**How to Run:**
```bash
# Development
npm run dev           # Watch mode with auto-restart
npm run build         # Build for production

# Testing locally
npm link              # Link local package
qstash-manager        # Test the CLI
npm unlink            # Unlink when done

# After publishing
npx qstash-manager    # Run without install
npm i -g qstash-manager && qstash-manager  # Global install
```

**Port:** N/A (CLI tool, no server)

**Distribution:**
- Package name: `qstash-manager`
- Short alias: `qm`
- NPM username: `chl03ks`

## Files to Modify

This is a greenfield project. Files will be created, not modified.

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `/Users/daniel/development/prefix/src/cli/commands/qstash-url-groups.ts` | Complete interactive CLI pattern with @clack/prompts, menu navigation, error handling, URL validation |
| `/Users/daniel/development/qstash-manager-project/DESIGN.md` | Full architecture, project structure, NPM configuration, feature breakdown |

## Patterns to Follow

### Interactive Menu Pattern

From `qstash-url-groups.ts`:

```typescript
// Menu options with hints
const menuOptions: Array<{ value: MenuAction; label: string; hint: string }> = [
  {
    value: 'explore',
    label: '🔍 Explore URL Groups',
    hint: groupCount > 0 ? 'View and manage existing groups' : 'No groups to explore yet',
  },
  {
    value: 'exit',
    label: '👋 Exit',
    hint: 'Close the manager',
  },
];

const action = await select<MenuAction>('What would you like to do?', menuOptions);
```

**Key Points:**
- Always include emoji prefixes for quick scanning
- Provide contextual hints based on current state
- Include back/exit options in every menu
- Use type-safe menu actions with TypeScript

### Continuous Navigation Loop

From `qstash-url-groups.ts`:

```typescript
// Interactive mode - continuous exploration
while (this.shouldContinue) {
  try {
    await this.showMainMenu();
  } catch (error) {
    if (error instanceof Error && error.message.includes('User cancelled')) {
      cliLogger.warning('\nOperation cancelled');
      this.shouldContinue = false;
    } else {
      throw error;
    }
  }
}
```

**Key Points:**
- Never force exit - always loop back to menu
- Handle Ctrl+C gracefully (check for 'User cancelled')
- Set `shouldContinue = false` only when user explicitly exits

### URL Validation Pattern

From `qstash-url-groups.ts`:

```typescript
private validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') {
      return {
        isValid: false,
        error: 'QStash requires HTTPS URLs (use ngrok for local development)',
      };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}
```

**Key Points:**
- QStash requires HTTPS URLs only
- Return structured validation result with error message
- Provide actionable hints (e.g., "use ngrok")

### Error Handling Pattern

From `qstash-url-groups.ts`:

```typescript
private handleApiError(error: unknown, context: string): string {
  if (error instanceof Error) {
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return `Authentication failed. Please check your QSTASH_TOKEN environment variable.`;
    }
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return `${context}: Resource not found. The URL group may not exist.`;
    }
    if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      return `Rate limit exceeded. Please wait a moment and try again.`;
    }
    return `${context}: ${error.message}`;
  }
  return `${context}: ${String(error)}`;
}
```

**Key Points:**
- Translate API error codes to user-friendly messages
- Include actionable guidance
- Always include context parameter for clarity

### Spinner for Async Operations

From `qstash-url-groups.ts`:

```typescript
const groups = await spinner('Loading URL groups...', async () => {
  return await this.qstashClient.urlGroups.list();
});
```

**Key Points:**
- Always show spinner for network operations
- Use descriptive loading messages
- Return data from the spinner callback

## Requirements

### Functional Requirements

1. **First-Run Setup Wizard**
   - Description: Guides new users through initial configuration with environment name and QStash token
   - Acceptance: New users can complete setup in under 2 minutes; token is validated before saving

2. **Multi-Environment Configuration**
   - Description: Store multiple QStash tokens (production, staging, dev) with easy switching
   - Acceptance: Users can add, remove, switch, and set default environments; config persists in ~/.qstash-manager/config.json

3. **URL Groups Management**
   - Description: List, create, explore, add/remove endpoints, quick-update (ngrok workflow), delete groups
   - Acceptance: All URL group operations work; quick-update takes <30 seconds

4. **Messages Management**
   - Description: Send messages to URL/URL group/queue, track message status, cancel pending messages
   - Acceptance: Can send test messages with custom headers/delay; can track and cancel messages

5. **Queues Management**
   - Description: List, create, pause/resume, delete queues; configure parallelism (1-100)
   - Acceptance: All queue CRUD operations work; can enqueue test messages

6. **Schedules Management**
   - Description: List, create with cron expression, pause/resume, delete schedules
   - Acceptance: Cron presets work (hourly, daily, weekly); can preview next 5 scheduled runs

7. **Dead Letter Queue Management**
   - Description: List failed messages, view failure details, retry single/bulk, delete from DLQ
   - Acceptance: Can identify and retry failed messages; bulk operations work

8. **Logs & Monitoring**
   - Description: View recent messages (1h, 4h, 24h), filter by status (delivered/failed), export logs
   - Acceptance: Logs display in table format with filtering; export to JSON/CSV works

9. **Signing Keys Management**
   - Description: View current and next signing keys, rotate keys with confirmation
   - Acceptance: Keys display correctly; rotation requires confirmation

### Edge Cases

1. **No Configuration Exists** - Show first-run setup wizard automatically
2. **Invalid/Expired Token** - Show clear error with instructions to update token
3. **Network Errors** - Display helpful message about checking internet connection
4. **Rate Limiting (429)** - Inform user to wait and retry
5. **Empty Resource Lists** - Show contextual hints (e.g., "No groups yet, create one!")
6. **Last Endpoint in Group** - Warn that deleting may remove the entire group
7. **Ctrl+C/ESC During Operation** - Go back one level, never crash
8. **Production Environment Delete** - Extra confirmation warning

## Implementation Notes

### DO
- Follow the interactive menu pattern from `qstash-url-groups.ts` for all features
- Reuse the validation patterns (URL validation, group name validation)
- Use spinners for ALL async operations (network calls)
- Include `← Back` and `🏠 Main Menu` options in every sub-menu
- Show current environment indicator in all screens
- Use emojis consistently for visual scanning
- Handle `isCancel()` after every @clack/prompts call to prevent crashes
- Write unit tests alongside feature implementation
- Use the tsup banner config for shebang: `banner: { js: '#!/usr/bin/env node' }`

### DON'T
- Include any Prefix-specific dependencies (Prisma, internal logger)
- Force exit on any menu - always allow navigation back
- Skip confirmation for destructive operations
- Use command flags as primary interface (interactive-first)
- Commit QStash tokens to version control
- Skip error handling - every API call needs try/catch
- Use `process.exit()` except in the final command action handler

## Development Environment

### Start Development

```bash
# Clone/navigate to project
cd /Users/daniel/development/qstash-manager-project

# Install dependencies
npm install

# Development with watch mode
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Build for production
npm run build

# Test locally before publish
npm link
qstash-manager
npm unlink
```

### Required Environment Variables
- `QSTASH_TOKEN`: QStash API token from https://console.upstash.com/qstash (required for testing)
- `QSTASH_TEST_TOKEN`: Separate token for integration tests (optional, uses QSTASH_TOKEN if not set)
- `UPSTASH_DISABLE_TELEMETRY`: Set to disable QStash SDK telemetry (optional)

### Project Structure
```
qstash-manager/
├── src/
│   ├── commands/              # Command implementations
│   │   ├── url-groups/        # URL groups management
│   │   ├── schedules/         # Schedule management
│   │   ├── queues/            # Queue management
│   │   ├── messages/          # Message testing & debugging
│   │   ├── dlq/               # Dead Letter Queue
│   │   ├── logs/              # Logs & monitoring
│   │   ├── security/          # Signing keys
│   │   └── config/            # Environment/config management
│   ├── lib/                   # Shared utilities
│   │   ├── qstash/            # QStash API client wrapper
│   │   ├── config/            # Config file management
│   │   ├── ui/                # CLI UI components
│   │   └── utils/             # General utilities
│   ├── types/                 # TypeScript types
│   └── index.ts               # CLI entry point
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests with QStash
│   └── e2e/                   # End-to-end CLI tests
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Success Criteria

The task is complete when:

1. [ ] Project foundation is set up (package.json, tsconfig.json, tsup.config.ts)
2. [ ] Config manager works with multi-environment support
3. [ ] First-run setup wizard guides new users successfully
4. [ ] URL groups can be listed, created, managed, and deleted
5. [ ] Messages can be sent, tracked, and cancelled
6. [ ] Queues can be managed (CRUD + pause/resume)
7. [ ] Schedules can be managed with cron expressions
8. [ ] DLQ messages can be viewed, retried, and deleted
9. [ ] Logs can be viewed with filtering
10. [ ] Signing keys can be viewed and rotated
11. [ ] No console errors during normal operation
12. [ ] Unit tests pass with >70% coverage
13. [ ] Integration tests pass with real QStash API
14. [ ] CLI works via `npm link` testing
15. [ ] Package is ready for `npm publish`

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Config Manager | `tests/unit/config.test.ts` | Add/remove/switch environments, token resolution priority, file persistence |
| QStash Client Wrapper | `tests/unit/client.test.ts` | API method wrappers, error transformation |
| URL Validation | `tests/unit/validation.test.ts` | HTTPS requirement, invalid URL formats |
| Time Utilities | `tests/unit/time.test.ts` | Relative time formatting, cron expression parsing |
| UI Formatters | `tests/unit/formatters.test.ts` | Table formatting, color output |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| URL Groups API | qstash-manager ↔ QStash API | List, create, add endpoints, remove endpoints, delete |
| Schedules API | qstash-manager ↔ QStash API | Create with cron, pause, resume, delete |
| Queues API | qstash-manager ↔ QStash API | Create, pause, resume, delete, enqueue message |
| Messages API | qstash-manager ↔ QStash API | Publish, get status, cancel |
| DLQ API | qstash-manager ↔ QStash API | List failed, retry, delete |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| First-Run Setup | 1. Run without config 2. Enter environment name 3. Enter token 4. Complete wizard | Config file created, main menu displayed |
| Quick Update Flow | 1. Select Quick Update 2. Choose group 3. Enter ngrok URL 4. Confirm | Endpoint updated in <30 seconds |
| Create URL Group | 1. Select Create New 2. Enter name 3. Enter endpoint 4. Confirm | New group created with endpoint |
| Delete with Confirmation | 1. Select Delete 2. Choose resource 3. See warning 4. Confirm | Resource deleted only after confirmation |

### CLI Verification
| Check | Command | Expected |
|-------|---------|----------|
| npx execution | `npx qstash-manager` | CLI starts, shows main menu or setup wizard |
| Global install | `npm i -g qstash-manager && qstash-manager` | CLI starts correctly |
| Short alias | `qm` | CLI starts (same as full command) |
| Help output | `qstash-manager --help` | Shows available options |
| Version output | `qstash-manager --version` | Shows version number |

### Manual Testing Checklist
| Check | Action | Expected |
|-------|--------|----------|
| Ctrl+C handling | Press Ctrl+C during any menu | Goes back one level, no crash |
| ESC handling | Press ESC during any prompt | Returns to previous menu |
| Empty state | View list with no resources | Shows helpful hint to create first |
| Environment indicator | Navigate through menus | Current environment always visible |
| Error messages | Use invalid token | Shows clear error with fix instructions |
| Destructive confirmation | Try to delete resource | Requires explicit confirmation |
| Production warning | Delete in production env | Shows extra warning |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] CLI executes via npx and global install
- [ ] All interactive menus navigate correctly
- [ ] Ctrl+C/ESC handling works (no crashes)
- [ ] Error messages are actionable
- [ ] First-time setup completes in <2 minutes
- [ ] Quick update flow completes in <30 seconds
- [ ] No regressions from reference implementation patterns
- [ ] Code follows @clack/prompts patterns from reference
- [ ] No security vulnerabilities (tokens not logged/committed)
- [ ] Package.json configured correctly for NPM publishing

## Implementation Phases

### Phase 1 (Weeks 1-2): Foundation & Core
- Project setup (package.json, tsconfig, tsup, vitest)
- Config manager with environment support
- QStash client wrapper
- Interactive UI utilities
- First-run setup wizard
- URL groups (adapted from existing code)
- Messages (send, track, cancel)
- Basic logs viewing
- Unit tests for core modules

### Phase 2 (Weeks 3-5): Advanced Features
- Queues management
- Schedules management with cron helpers
- Dead Letter Queue management
- Signing keys management
- Enhanced logs with filtering and export
- Integration tests
- E2E tests
- Documentation (README, examples)
- NPM publishing setup
- First release (0.1.0)

## Technical Constraints

1. **Node Version**: >=18.0.0 (required for Commander.js v12)
2. **HTTPS Only**: QStash requires HTTPS URLs for all endpoints
3. **Token Security**: Never log or commit QStash tokens
4. **Interactive-First**: CLI flags are shortcuts, not primary interface
5. **No Force Exit**: Users must always be able to navigate back
6. **Package Size**: Target <5MB for fast npx execution
7. **Startup Time**: Target <1 second
