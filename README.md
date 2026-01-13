# QStash Manager

**Interactive CLI for managing QStash** - URL groups, schedules, queues, messages, and monitoring.

[![npm version](https://img.shields.io/npm/v/qstash-manager.svg)](https://www.npmjs.com/package/qstash-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/node/v/qstash-manager.svg)](https://nodejs.org)

## Features

- **Interactive-First Design** - Beautiful menus powered by @clack/prompts
- **Multi-Environment Support** - Manage production, staging, and dev environments
- **URL Groups Management** - Create, explore, and quick-update endpoints (perfect for ngrok workflow)
- **Schedules Management** - Create and manage cron-based schedules with presets
- **Queues Management** - FIFO queues with configurable parallelism
- **Messages** - Send, track, and cancel messages
- **Dead Letter Queue** - View, retry, and manage failed messages
- **Logs & Monitoring** - View recent messages with filtering and export
- **Signing Keys** - View and rotate webhook signing keys

## Installation

### Quick Start (No Install)

```bash
npx qstash-manager
```

### Global Install

```bash
npm install -g qstash-manager
qstash-manager
```

### Short Alias

After global install, you can also use the shorter alias:

```bash
qm
```

## Requirements

- Node.js >= 18.0.0
- QStash account ([Get one free at Upstash](https://console.upstash.com/qstash))

## Getting Started

### First-Time Setup

When you run `qstash-manager` for the first time, a setup wizard will guide you:

```
┌  Welcome to QStash Manager!
│
│  Let's get you set up in 2 minutes.
│
◆  What would you like to call your first environment?
│  ● Production (Recommended)
│    Staging
│    Development
│    Custom name...
│
◇  Paste your QStash token:
│  (Get it from: https://console.upstash.com/qstash)
│
└  Configuration saved! Let's explore QStash...
```

### Using Environment Variables

You can also use the `QSTASH_TOKEN` environment variable:

```bash
export QSTASH_TOKEN=your_token_here
npx qstash-manager
```

Token resolution priority:
1. `--token <token>` CLI flag (highest priority)
2. `QSTASH_TOKEN` environment variable
3. Config file for selected environment

## Usage Examples

### URL Groups

Manage URL groups for multi-endpoint message delivery:

```bash
# Start interactive URL groups manager
npx qstash-manager

# Select "URL Groups" from the main menu
# Options:
#   - Explore URL Groups - View and manage existing groups
#   - Quick Update Endpoint - Fast ngrok URL update workflow
#   - View All Endpoints - See all endpoints across groups
#   - Create New Group - Create a new URL group
#   - Delete URL Group - Remove a group
```

**Quick Update Workflow (Perfect for Local Development):**

1. Start ngrok: `ngrok http 3000`
2. Run `qstash-manager` and select "Quick Update Endpoint"
3. Choose your URL group
4. Paste your new ngrok URL
5. Done in under 30 seconds!

### Schedules

Create and manage cron-based scheduled messages:

```bash
# From the main menu, select "Schedules"
# Options:
#   - View All Schedules - List with cron, destination, next run
#   - Create Schedule - With cron presets (hourly, daily, weekly)
#   - Manage Schedule - Pause/resume individual schedules
#   - Delete Schedule - Remove a schedule
```

**Cron Presets Available:**
- Every minute
- Every 5 minutes
- Hourly
- Daily at midnight
- Weekly on Monday
- Custom expression

### Queues

Manage FIFO queues with parallelism control:

```bash
# From the main menu, select "Queues"
# Options:
#   - View All Queues - List with parallelism settings
#   - Create Queue - Set parallelism (1-100)
#   - Manage Queue - Pause/resume, enqueue test message
#   - Delete Queue - Remove a queue
```

### Messages

Send and track messages:

```bash
# From the main menu, select "Messages"
# Options:
#   - Send Message - To URL, URL group, or queue
#   - Track Message - View message status by ID
#   - Cancel Messages - Cancel pending messages
```

**Send Options:**
- Custom headers
- Delay (send later)
- Callback URL
- Retry configuration

### Dead Letter Queue

Manage failed messages:

```bash
# From the main menu, select "Dead Letter Queue"
# Options:
#   - View Failed Messages - List with failure details
#   - Retry Messages - Retry single or bulk
#   - Clean Up DLQ - Delete old failed messages
```

### Logs & Monitoring

View and export message logs:

```bash
# From the main menu, select "Logs & Monitoring"
# Options:
#   - Recent Messages - Last 1h, 4h, or 24h
#   - Failed Messages - Filter by status
#   - Export Logs - JSON or CSV format
```

### Signing Keys

Manage webhook verification keys:

```bash
# From the main menu, select "Security"
# Options:
#   - View Signing Keys - Current and next keys
#   - Rotate Keys - Generate new signing keys
```

## Configuration

Configuration is stored in `~/.qstash-manager/config.json`:

```json
{
  "version": "1",
  "defaultEnvironment": "production",
  "environments": {
    "production": {
      "token": "qstash_token_here",
      "name": "Production",
      "createdAt": "2024-01-13T10:00:00Z"
    },
    "staging": {
      "token": "qstash_staging_token",
      "name": "Staging"
    }
  }
}
```

### Managing Environments

From the main menu, select "Configuration":
- **View Environments** - See all configured environments
- **Add Environment** - Add a new environment with token
- **Switch Environment** - Change active environment
- **Set Default** - Set default environment

### CLI Options

```bash
# Show help
qstash-manager --help

# Show version
qstash-manager --version

# Use specific token (overrides config)
qstash-manager --token <your-token>

# Use specific environment
qstash-manager --env staging
```

## Navigation

QStash Manager uses an interactive-first approach:

- **Arrow keys** - Navigate menus
- **Enter** - Select option
- **Ctrl+C / ESC** - Go back one level (never crashes)
- Every screen has "Back" and "Main Menu" options

The CLI never forces you to exit - navigate freely and exit when you're ready.

## Development

```bash
# Clone the repository
git clone https://github.com/chl03ks/qstash-manager.git
cd qstash-manager

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

# Test locally before publishing
npm link
qstash-manager
npm unlink
```

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

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `QSTASH_TOKEN` | QStash API token | No (can use config file) |
| `QSTASH_TEST_TOKEN` | Token for integration tests | No |
| `UPSTASH_DISABLE_TELEMETRY` | Disable QStash SDK telemetry | No |

## Troubleshooting

### Authentication Failed

```
Authentication failed. Please check your token.
```

**Solution:** Verify your token at [Upstash Console](https://console.upstash.com/qstash) and update:
```bash
qstash-manager  # Select Configuration > Add Environment
```

### Rate Limit Exceeded

```
Rate limit exceeded. Please wait a moment and try again.
```

**Solution:** QStash has rate limits. Wait a few seconds and retry.

### Network Error

```
Network error. Please check your internet connection.
```

**Solution:** Check your internet connection and try again.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [QStash Documentation](https://upstash.com/docs/qstash)
- [Upstash Console](https://console.upstash.com/qstash)
- [Report Issues](https://github.com/chl03ks/qstash-manager/issues)

---

Made with love for the QStash community by [chl03ks](https://github.com/chl03ks)
