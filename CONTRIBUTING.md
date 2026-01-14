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

Thank you for contributing to QStash Manager!
