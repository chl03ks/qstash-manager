# QStash Manager - Complete Design Document

**Project:** Interactive CLI tool for comprehensive QStash management
**Package Name:** `qstash-manager` (with alias `qm`)
**Author:** chl03ks
**Target:** NPM package supporting both npx and global install
**Date:** 2026-01-13

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Structure](#architecture--structure)
3. [NPM Package Configuration](#npm-package-configuration)
4. [Configuration & Environment Management](#configuration--environment-management)
5. [Command Structure & Navigation](#command-structure--navigation)
6. [QStash API Integration](#qstash-api-integration)
7. [Complete Feature Set](#complete-feature-set)
8. [Testing Strategy](#testing-strategy)
9. [Implementation Priorities](#implementation-priorities)
10. [User Experience Principles](#user-experience-principles)

---

## Project Overview

### Vision

Create an **interactive-first CLI tool** that makes managing QStash resources delightful and intuitive. The tool should feel like exploring a well-designed application, not executing commands. Users can navigate freely, never get forced to exit, and have powerful debugging capabilities at their fingertips.

### Key Problems Solved

1. **Ngrok Development Workflow** - Quickly update webhook URLs during local development
2. **Production Debugging** - View logs, failed messages, and retry failures without leaving terminal
3. **Resource Management** - Manage URL groups, schedules, queues through beautiful interactive menus
4. **Multi-Environment Support** - Seamlessly switch between production, staging, and dev environments

### Distribution

- **NPX execution:** `npx qstash-manager` (instant, no install)
- **Global install:** `npm install -g qstash-manager` then `qstash-manager`
- **Short alias:** `qm` for power users

---

## Architecture & Structure

### Project Structure

```
qstash-manager/
├── src/
│   ├── commands/              # Command implementations
│   │   ├── url-groups/        # URL groups management
│   │   │   ├── index.ts
│   │   │   ├── list.ts
│   │   │   ├── create.ts
│   │   │   ├── manage.ts
│   │   │   └── quick-update.ts
│   │   ├── schedules/         # Schedule management
│   │   │   ├── index.ts
│   │   │   ├── list.ts
│   │   │   ├── create.ts
│   │   │   └── manage.ts
│   │   ├── queues/            # Queue management
│   │   │   ├── index.ts
│   │   │   ├── list.ts
│   │   │   ├── create.ts
│   │   │   └── manage.ts
│   │   ├── messages/          # Message testing & debugging
│   │   │   ├── index.ts
│   │   │   ├── send.ts
│   │   │   ├── batch.ts
│   │   │   ├── track.ts
│   │   │   └── cancel.ts
│   │   ├── dlq/               # Dead Letter Queue
│   │   │   ├── index.ts
│   │   │   ├── list.ts
│   │   │   ├── retry.ts
│   │   │   └── delete.ts
│   │   ├── logs/              # Logs & monitoring
│   │   │   ├── index.ts
│   │   │   ├── view.ts
│   │   │   ├── filter.ts
│   │   │   └── export.ts
│   │   ├── security/          # Signing keys
│   │   │   ├── index.ts
│   │   │   └── keys.ts
│   │   └── config/            # Environment/config management
│   │       ├── index.ts
│   │       ├── setup.ts
│   │       ├── add.ts
│   │       ├── switch.ts
│   │       └── list.ts
│   ├── lib/                   # Shared utilities
│   │   ├── qstash/            # QStash API client wrapper
│   │   │   ├── client.ts
│   │   │   ├── errors.ts
│   │   │   └── types.ts
│   │   ├── config/            # Config file management
│   │   │   ├── manager.ts
│   │   │   └── types.ts
│   │   ├── ui/                # CLI UI components
│   │   │   ├── prompts.ts     # @clack/prompts wrappers
│   │   │   ├── tables.ts      # Table formatting
│   │   │   ├── colors.ts      # Color utilities
│   │   │   └── formatters.ts  # Data formatters
│   │   └── utils/             # General utilities
│   │       ├── validation.ts
│   │       └── time.ts
│   ├── types/                 # TypeScript types
│   │   ├── qstash.ts
│   │   ├── config.ts
│   │   └── commands.ts
│   └── index.ts               # CLI entry point
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests with QStash
│   └── e2e/                   # End-to-end CLI tests
├── .github/
│   └── workflows/
│       ├── test.yml           # Run tests on PR
│       └── publish.yml        # Auto-publish on release
├── .gitignore
├── .npmignore
├── LICENSE (MIT)
├── README.md
├── CHANGELOG.md
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

### Tech Stack

- **Language:** TypeScript (strict mode, ES2022)
- **CLI Framework:** Commander.js
- **Interactive Prompts:** @clack/prompts (beautiful UX)
- **QStash Client:** @upstash/qstash SDK
- **Tables:** cli-table3
- **Colors:** picocolors
- **Build:** tsup (fast TypeScript bundler)
- **Testing:** Vitest
- **Node Version:** >=18.0.0

---

## NPM Package Configuration

### package.json

```json
{
  "name": "qstash-manager",
  "version": "0.1.0",
  "description": "Interactive CLI for managing QStash - URL groups, schedules, queues, messages, and monitoring",
  "keywords": [
    "qstash",
    "upstash",
    "cli",
    "webhook",
    "queue",
    "serverless",
    "interactive",
    "message-queue",
    "scheduler"
  ],
  "author": "chl03ks",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/chl03ks/qstash-manager"
  },
  "bugs": "https://github.com/chl03ks/qstash-manager/issues",
  "homepage": "https://github.com/chl03ks/qstash-manager#readme",
  "bin": {
    "qstash-manager": "./dist/index.js",
    "qm": "./dist/index.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "dev": "tsup --watch --onSuccess 'node dist/index.js'",
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src",
    "prepublishOnly": "npm run typecheck && npm run build"
  },
  "dependencies": {
    "@clack/prompts": "^0.7.0",
    "@upstash/qstash": "^2.7.17",
    "commander": "^12.0.0",
    "picocolors": "^1.0.0",
    "cli-table3": "^0.6.5"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "eslint": "^8.56.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0",
    "@vitest/coverage-v8": "^1.2.0"
  }
}
```

### tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  bundle: true,
  skipNodeModulesBundle: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Publishing Workflow

```bash
# Development
npm run dev          # Watch mode with auto-restart

# Testing
npm test            # Run all tests
npm run typecheck   # Check types

# Publishing
npm version patch   # Bump version: 0.1.0 -> 0.1.1
npm version minor   # Bump version: 0.1.0 -> 0.2.0
npm version major   # Bump version: 0.1.0 -> 1.0.0
npm publish         # Publish to NPM

# First publish
npm publish --access public
```

---

## Configuration & Environment Management

### Config File Structure

**Location:** `~/.qstash-manager/config.json`

```json
{
  "version": "1",
  "defaultEnvironment": "production",
  "environments": {
    "production": {
      "token": "qstash_production_token_here",
      "name": "Production",
      "createdAt": "2024-01-13T10:00:00Z"
    },
    "staging": {
      "token": "qstash_staging_token_here",
      "name": "Staging",
      "createdAt": "2024-01-13T10:05:00Z"
    },
    "dev": {
      "token": "qstash_dev_token_here",
      "name": "Development",
      "createdAt": "2024-01-13T10:10:00Z"
    }
  },
  "preferences": {
    "colorOutput": true,
    "confirmDestructiveActions": true
  }
}
```

### Token Resolution Priority

1. `--token <token>` CLI flag (highest priority)
2. `QSTASH_TOKEN` environment variable
3. Config file for selected environment (`--env <name>` or default)
4. Interactive prompt to add token

### First-Run Setup Wizard

```
┌  Welcome to QStash Manager! 🚀
│
│  Let's get you set up in 2 minutes.
│
◇  No configuration found. Let's create one!
│
◆  What would you like to call your first environment?
│  ● Production (Recommended)
│    Staging
│    Development
│    Custom name...
│
◇  Environment name: Production
│
◆  Paste your QStash token:
│  (Get it from: https://console.upstash.com/qstash)
│
│  qstash_••••••••••••••••••
│
◇  ✓ Token validated successfully!
│
◆  Add another environment?
│  ● No, I'm ready to start
│    Yes, add staging/dev
│
◇  Configuration saved to ~/.qstash-manager/config.json
│
└  🎉 You're all set! Let's explore QStash...
```

### Interactive Config Management

```
Configuration Menu
  ├→ View Environments → Table with names, created dates
  ├→ Add Environment → Name + Token → Validate → Save
  ├→ Edit Environment → Select → Update name or token
  ├→ Remove Environment → Select → Confirm deletion
  ├→ Set Default → Select environment as default
  ├→ Preferences → Color output, confirmations, etc.
  └→ Back to main menu
```

### Environment Switching

Every screen shows current environment in header with clickable switch:

```
┌  URL Groups Management
│
│  🟢 Production  [switch]    ← Always visible, always clickable
```

Clicking `[switch]` or using menu:

```
◆  Switch to which environment?
│  ● 🟢 Production (current)
│    🟡 Staging
│    🔵 Development
│    ➕ Add new environment
│    ⚙️  Manage environments
│    ← Back
```

---

## Command Structure & Navigation

### Main Menu

```
qstash-manager (root)
├── 📦 URL Groups
│   ├── Explore URL Groups
│   ├── Quick Update Endpoint
│   ├── View All Endpoints
│   ├── Create New Group
│   └── Delete URL Group
├── 📅 Schedules
│   ├── View All Schedules
│   ├── Create Schedule
│   ├── Manage Schedule
│   └── Delete Schedule
├── 📬 Queues
│   ├── View All Queues
│   ├── Create Queue
│   ├── Manage Queue
│   └── Delete Queue
├── 📨 Messages
│   ├── Send Message
│   ├── Batch Send
│   ├── Track Message
│   └── Cancel Messages
├── 💀 Dead Letter Queue
│   ├── View Failed Messages
│   ├── Retry Messages
│   └── Clean Up DLQ
├── 📊 Logs & Monitoring
│   ├── Recent Messages
│   ├── Failed Messages
│   ├── Delivery Stats
│   └── Export Logs
├── 🔐 Security
│   ├── View Signing Keys
│   └── Rotate Keys
└── ⚙️ Configuration
    ├── View Environments
    ├── Add Environment
    ├── Switch Environment
    └── Preferences
```

### Navigation Principles

1. **Never force exit** - every screen has "← Back" or "🏠 Main Menu"
2. **Breadcrumbs** - show where you are: `Main → URL Groups → vendor-dispatch`
3. **Quick actions** - common tasks accessible from multiple places
4. **Contextual menus** - options change based on what you're viewing
5. **Ctrl+C or ESC** - goes back one level (never crashes)

### Example Flow: URL Groups

```
Main Menu
  ↓ (select URL Groups)
URL Groups Menu
  ├→ Explore → Select Group → Group Details
  │                              ├→ Add Endpoint
  │                              ├→ Remove Endpoint
  │                              ├→ Send Test Message
  │                              ├→ View Logs
  │                              └→ Back
  ├→ Quick Update → Select Group → Enter URL → Confirm
  ├→ View All → Table View → Back
  ├→ Create New → Enter Details → Confirm
  └→ Delete → Select Group → Confirm
```

---

## QStash API Integration

### QStash Client Wrapper

```typescript
// src/lib/qstash/client.ts
import { Client as UpstashClient } from '@upstash/qstash';

export class QStashClient {
  private client: UpstashClient;
  private token: string;

  constructor(token: string) {
    this.token = token;
    this.client = new UpstashClient({ token });
  }

  // URL Groups
  async listUrlGroups(): Promise<UrlGroup[]>
  async getUrlGroup(name: string): Promise<UrlGroup>
  async addEndpoints(group: string, endpoints: Endpoint[]): Promise<void>
  async removeEndpoints(group: string, endpoints: Endpoint[]): Promise<void>
  async deleteUrlGroup(name: string): Promise<void>

  // Schedules
  async listSchedules(): Promise<Schedule[]>
  async createSchedule(config: ScheduleConfig): Promise<Schedule>
  async getSchedule(id: string): Promise<Schedule>
  async pauseSchedule(id: string): Promise<void>
  async resumeSchedule(id: string): Promise<void>
  async deleteSchedule(id: string): Promise<void>

  // Queues
  async listQueues(): Promise<Queue[]>
  async upsertQueue(config: QueueConfig): Promise<Queue>
  async getQueue(name: string): Promise<Queue>
  async pauseQueue(name: string): Promise<void>
  async resumeQueue(name: string): Promise<void>
  async deleteQueue(name: string): Promise<void>

  // Messages
  async publishMessage(config: MessageConfig): Promise<PublishResult>
  async batchPublish(messages: MessageConfig[]): Promise<BatchResult>
  async getMessage(id: string): Promise<Message>
  async cancelMessage(id: string): Promise<void>
  async bulkCancelMessages(ids: string[]): Promise<BulkResult>
  async enqueueMessage(queue: string, config: MessageConfig): Promise<PublishResult>

  // Dead Letter Queue
  async listDlqMessages(filter?: DlqFilter): Promise<DlqMessage[]>
  async getDlqMessage(id: string): Promise<DlqMessage>
  async retryDlqMessage(id: string): Promise<void>
  async bulkRetryDlq(ids: string[]): Promise<BulkResult>
  async deleteDlqMessage(id: string): Promise<void>
  async bulkDeleteDlq(ids: string[]): Promise<BulkResult>

  // Logs & Events
  async listLogs(filter: LogFilter): Promise<Log[]>
  async getLogStats(): Promise<LogStats>

  // Signing Keys
  async getSigningKeys(): Promise<SigningKeys>
  async rotateSigningKeys(): Promise<SigningKeys>

  // Validation
  async validateToken(): Promise<boolean>
}
```

### Error Handling

```typescript
// src/lib/qstash/errors.ts
export class QStashError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
  }
}

export function handleQStashError(error: unknown): string {
  if (error instanceof Error) {
    // 401 - Invalid token
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'Authentication failed. Please check your token.\n' +
             'Run: qstash-manager config add <env> <token>';
    }

    // 404 - Not found
    if (error.message.includes('404')) {
      return 'Resource not found. It may have been deleted.';
    }

    // 429 - Rate limit
    if (error.message.includes('429')) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }

    // Network errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
      return 'Network error. Please check your internet connection.';
    }

    return error.message;
  }

  return String(error);
}
```

---

## Complete Feature Set

### Phase 1: MVP (Weeks 1-2)

#### 1. URL Groups ✅ (Adapt existing code)
- List URL groups
- Create URL group
- Add/update endpoints
- Remove endpoints
- Delete URL group
- View all endpoints across groups
- **Quick Update** for ngrok workflow

#### 2. Configuration & Environments
- First-run setup wizard
- Add/remove/switch environments
- Token validation
- Config file management
- Environment indicator in UI

#### 3. Messages - Send & Track
- Send message to URL/queue/URL group
- Message options: delay, headers, callback, retries
- Track message status
- Cancel message
- Interactive preview before sending

#### 4. Logs & Monitoring (Basic)
- View recent messages (1h, 4h, 24h)
- Filter by status (all/delivered/failed)
- Display in table format
- View message details

### Phase 2: Core Features (Weeks 3-4)

#### 5. Queues Management
- List all queues with parallelism settings
- Create queue with FIFO and parallelism (1-100)
- View queue details and stats
- Pause/resume queue
- Delete queue
- Enqueue test message

#### 6. Schedules Management
- List all schedules with cron, destination, next run
- Create schedule with cron expression
- Cron presets: hourly, daily, weekly, custom
- Preview next 5 scheduled runs
- Pause/resume schedule
- Delete schedule

#### 7. Dead Letter Queue
- List failed messages
- Filter by URL group/queue/date
- View failure details and error messages
- Retry single message
- Bulk retry failed messages
- Delete from DLQ
- Bulk delete DLQ messages

### Phase 3: Advanced Features (Week 5+)

#### 8. Batch Operations
- Batch publish multiple messages
- Bulk cancel messages
- Interactive batch builder

#### 9. Logs & Monitoring (Advanced)
- Export logs as JSON/CSV
- Statistics dashboard:
  - Total messages (24h)
  - Success rate
  - Average latency
  - Failed by destination
- Filter by queue/URL group
- Custom date ranges

#### 10. Security & Signing Keys
- View current and next signing keys
- Rotate signing keys with confirmation
- Webhook verification guide
- Copy keys to clipboard

---

## Testing Strategy

### Unit Tests (Vitest)

```
tests/unit/
├── config.test.ts         # Config manager tests
├── client.test.ts         # QStash client wrapper
├── formatters.test.ts     # UI formatters
├── validation.test.ts     # Input validation
└── time.test.ts           # Time utilities
```

**Example:**
```typescript
describe('ConfigManager', () => {
  it('should add environment', async () => {
    await configManager.addEnvironment('prod', 'qstash_token');
    const config = await configManager.load();
    expect(config.environments.prod).toBeDefined();
  });

  it('should resolve token from env var', async () => {
    process.env.QSTASH_TOKEN = 'env_token';
    const token = await configManager.getToken();
    expect(token).toBe('env_token');
  });
});
```

### Integration Tests

```
tests/integration/
├── url-groups.test.ts     # URL groups API operations
├── schedules.test.ts      # Schedule API operations
├── queues.test.ts         # Queue API operations
└── messages.test.ts       # Message API operations
```

**Requirements:**
- Use `QSTASH_TEST_TOKEN` environment variable
- Clean up test resources in `afterAll`
- Use unique names with timestamps

### E2E Tests

```
tests/e2e/
├── first-run.test.ts      # Setup wizard flow
├── url-groups.test.ts     # Complete URL groups workflow
└── config.test.ts         # Config management flow
```

### Manual Testing Checklist

Before each release:
- [ ] First-run setup wizard works
- [ ] All interactive menus navigate correctly
- [ ] Ctrl+C / ESC goes back (never crashes)
- [ ] Environment switching works
- [ ] All CRUD operations for each resource
- [ ] Error messages are helpful
- [ ] Token validation works
- [ ] NPX execution: `npx qstash-manager@latest`
- [ ] Global install: `npm i -g qstash-manager`

### Quality Gates

Before publishing:
1. ✅ All tests pass
2. ✅ No TypeScript errors
3. ✅ Code coverage > 70%
4. ✅ Manual testing checklist complete
5. ✅ README updated with examples
6. ✅ CHANGELOG updated

---

## Implementation Priorities

### Week 1: Foundation
- [ ] Project setup with TypeScript, tsup, vitest
- [ ] NPM package configuration
- [ ] Config manager implementation
- [ ] QStash client wrapper
- [ ] Interactive UI utilities (@clack/prompts)
- [ ] First-run setup wizard

### Week 2: URL Groups & Messages
- [ ] Adapt URL groups code from existing implementation
- [ ] Remove Prefix-specific dependencies (Prisma, internal logger)
- [ ] Messages: send, track, cancel
- [ ] Basic logs viewing
- [ ] Unit tests for core modules

### Week 3: Queues & Schedules
- [ ] Queues management (list, create, pause/resume, delete)
- [ ] Schedules management (list, create, pause/resume, delete)
- [ ] Cron expression helpers and presets
- [ ] Integration tests

### Week 4: DLQ & Polish
- [ ] Dead Letter Queue management
- [ ] Retry and delete operations
- [ ] Enhanced logs with filtering
- [ ] Error handling improvements
- [ ] Documentation (README, examples)

### Week 5: Advanced & Release
- [ ] Batch operations
- [ ] Statistics dashboard
- [ ] Signing keys management
- [ ] E2E tests
- [ ] GitHub Actions (CI/CD)
- [ ] First NPM release (0.1.0)

---

## User Experience Principles

### 1. Interactive-First Design

The CLI should feel like exploring an application, not executing commands.

**Good:**
```
◆  What would you like to do?
│  ● Send message to URL group
│    Send to specific URL
│    Send to queue
```

**Not:** `qstash-manager send --type url-group --destination X`

CLI flags are **shortcuts for power users**, not the primary interface.

### 2. Never Force Exit

Users should be able to navigate freely without the CLI closing.

```
Every menu has:
  ← Back to previous menu
  🏠 Main Menu
  👋 Exit (only from main menu)
```

Ctrl+C or ESC goes back one level, never crashes.

### 3. Contextual Information

Always show relevant context:
- Current environment indicator
- Breadcrumbs for deep navigation
- Quick stats on main menu
- Resource counts in selection menus

### 4. Confirmation for Destructive Actions

Always confirm deletes with:
- Clear indication of what will be deleted
- Environment warning if in production
- Type to confirm for critical operations

### 5. Helpful Error Messages

**Bad:** `Error: 401`

**Good:**
```
Authentication failed. Please check your token.
Run: qstash-manager config add production <your-token>
Get token from: https://console.upstash.com/qstash
```

### 6. Progress Indication

Use spinners for async operations:
```
◇  Loading URL groups...
◇  Sending message...
◇  Validating token...
```

### 7. Visual Hierarchy

- Use emojis for quick scanning
- Color-code statuses (green=success, red=error, yellow=warning)
- Tables for list views
- Notes/boxes for important information

### 8. Keyboard-Friendly

- Arrow keys for menu navigation
- Enter to select
- Ctrl+C / ESC to go back
- Type-ahead search in long lists

---

## Development Commands

```bash
# Development
npm run dev              # Watch mode with auto-restart
npm run build            # Build for production
npm run typecheck        # TypeScript checking
npm test                 # Run all tests
npm run test:watch       # Test watch mode
npm run lint             # ESLint checking

# Testing locally before publish
npm link                 # Link local package
qstash-manager           # Test the CLI
npm unlink               # Unlink when done

# Publishing
npm version patch        # 0.1.0 -> 0.1.1
npm version minor        # 0.1.0 -> 0.2.0
npm publish              # Publish to NPM
```

---

## References & Resources

### Documentation
- [QStash Getting Started](https://upstash.com/docs/qstash/overall/getstarted)
- [QStash REST API](https://upstash.com/docs/qstash/api/authentication)
- [Dead Letter Queue](https://upstash.com/docs/qstash/features/dlq)
- [Callbacks](https://upstash.com/docs/qstash/features/callbacks)
- [Topics/URL Groups](https://upstash.com/docs/qstash/features/topics)

### SDKs & Tools
- [@upstash/qstash on NPM](https://www.npmjs.com/package/@upstash/qstash)
- [QStash JavaScript SDK (GitHub)](https://github.com/upstash/qstash-js)
- [@clack/prompts Documentation](https://github.com/natemoo-re/clack)
- [Commander.js](https://github.com/tj/commander.js)

### Inspiration
- Existing URL Groups CLI in Prefix project: `src/cli/commands/qstash-url-groups.ts`
- Interactive patterns, beautiful UX, never-force-close philosophy

---

## Success Metrics

### Technical
- ✅ Package size < 5MB
- ✅ Startup time < 1 second
- ✅ Test coverage > 70%
- ✅ Zero TypeScript errors
- ✅ Works on Node 18+

### User Experience
- ✅ First-time users can set up in < 2 minutes
- ✅ Ngrok workflow (quick update) takes < 30 seconds
- ✅ No crashes or forced exits
- ✅ All error messages are actionable
- ✅ Feels delightful to use

### Adoption
- 🎯 50+ weekly downloads in first month
- 🎯 5+ GitHub stars in first month
- 🎯 Featured in Upstash community showcase
- 🎯 Positive feedback from developers

---

## Future Enhancements (Post 1.0)

- 📊 Advanced analytics dashboard
- 🔔 Desktop notifications for failed messages
- 🌐 Web UI companion (optional)
- 🔌 Plugin system for custom commands
- 📝 Export/import configurations
- 🎨 Custom themes
- 🔍 Full-text search across logs
- 📈 Historical trends and charts
- 🤖 AI-powered error diagnosis
- 🔄 Auto-retry strategies configuration

---

**Ready to build?** This design document has everything needed to start implementation. Use this as your north star and refer back frequently during development.

Good luck! 🚀
