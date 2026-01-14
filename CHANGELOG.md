## [0.2.0](https://github.com/chl03ks/qstash-manager/compare/v0.1.0...v0.2.0) (2026-01-14)

### Features

* add automated release management with semantic-release ([37d51ed](https://github.com/chl03ks/qstash-manager/commit/37d51ed9df7741921ac0a4f5b7a1825a46cace4c))

### Bug Fixes

* resolve undefined toString error when fetching logs ([708f486](https://github.com/chl03ks/qstash-manager/commit/708f4867de8d52027627b680278b6363f6918d4f))

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
