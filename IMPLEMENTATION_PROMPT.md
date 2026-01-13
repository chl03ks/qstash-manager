# QStash Manager - Implementation Prompt

**Use this prompt to start a new Claude Code session when you're ready to build the project.**

---

## Prompt for Claude Code

```
I want to build a comprehensive interactive CLI tool called "qstash-manager" for managing QStash resources (URL groups, schedules, queues, messages, monitoring, and more).

CONTEXT:
- I already have a working QStash URL groups CLI in my Prefix project at /Users/daniel/development/prefix/src/cli/commands/qstash-url-groups.ts
- I want to extract this into a standalone NPM package that others can use via npx or npm install -g
- The new project should be in /Users/daniel/development/qstash-manager-project (already created)
- My NPM username is: chl03ks
- I'm already logged into NPM CLI

COMPLETE DESIGN:
I have a complete design document at /Users/daniel/development/qstash-manager-project/DESIGN.md that includes:
- Full architecture and project structure
- NPM package configuration
- All features to implement (URL groups, schedules, queues, messages, DLQ, logs, security)
- Interactive-first UX principles
- Testing strategy
- Implementation priorities (5-week plan)

KEY PRINCIPLES:
1. Interactive-first (not command flags) - users navigate menus like an app
2. Never force exit - always allow going back with ← or Ctrl+C
3. Beautiful UX using @clack/prompts (same as existing code)
4. Multi-environment support (production, staging, dev with token management)
5. Start from scratch but get inspiration from the existing URL groups code
6. Support both npx execution and global install
7. Follow NPM package best practices for publishing

TECH STACK:
- TypeScript (strict mode)
- Commander.js for CLI framework
- @clack/prompts for interactive UI
- @upstash/qstash SDK for API
- tsup for building
- vitest for testing
- Node >= 18

WHAT I NEED YOU TO DO:
1. Read the complete DESIGN.md file to understand the full scope
2. Read my existing URL groups CLI implementation for inspiration
3. Create the initial project structure with all necessary config files
4. Set up NPM package configuration (package.json, tsconfig.json, tsup.config.ts)
5. Implement Phase 1 features (foundation, config management, URL groups adapted from existing code, basic messages and logs)
6. Follow the implementation priorities in DESIGN.md
7. Make it production-ready for NPM publishing

IMPORTANT:
- This is a SEPARATE project from my Prefix codebase
- Remove all Prefix-specific dependencies (Prisma, internal logger, etc.)
- Keep the excellent interactive UX from the existing code
- The CLI should feel delightful to use
- Follow the 5-week implementation plan in DESIGN.md

Start by reading DESIGN.md and the existing qstash-url-groups.ts implementation, then create the project foundation.
```

---

## Quick Start Commands for Future Session

When you're ready to start implementation, run:

```bash
cd /Users/daniel/development/qstash-manager-project

# Show Claude this prompt
cat IMPLEMENTATION_PROMPT.md

# Claude will:
# 1. Read DESIGN.md
# 2. Read your existing URL groups code
# 3. Create project structure
# 4. Implement Phase 1 features
# 5. Set up for NPM publishing
```

---

## Files Already Created

- ✅ `/Users/daniel/development/qstash-manager-project/DESIGN.md` - Complete design document
- ✅ `/Users/daniel/development/qstash-manager-project/IMPLEMENTATION_PROMPT.md` - This file

---

## What Claude Will Build

**Week 1: Foundation**
- Project setup (package.json, tsconfig, tsup, etc.)
- Config manager with environment support
- QStash client wrapper
- Interactive UI utilities
- First-run setup wizard

**Week 2: Core Features**
- URL groups (adapted from your existing code)
- Messages (send, track, cancel)
- Basic logs viewing
- Unit tests

**Week 3-5: Advanced Features**
- Queues management
- Schedules management
- Dead Letter Queue
- Enhanced monitoring
- Complete test coverage
- Documentation
- Ready for NPM publish

---

## Before Starting Implementation

Make sure you have:
- [x] NPM account (username: chl03ks)
- [x] Logged into NPM CLI (`npm login`)
- [x] QStash token for testing (get from https://console.upstash.com/qstash)
- [x] Node 18+ installed
- [x] This design document reviewed and approved

---

## Expected Outcome

After implementation, you'll have:
- ✅ Standalone NPM package: `qstash-manager`
- ✅ Works with: `npx qstash-manager` or `npm i -g qstash-manager`
- ✅ Beautiful interactive CLI for managing all QStash resources
- ✅ Multi-environment support (prod, staging, dev)
- ✅ Comprehensive test coverage
- ✅ Ready to publish to NPM and share with the community

---

## Tips for Implementation Session

1. **Start with reading files:**
   - Read DESIGN.md thoroughly
   - Read existing URL groups implementation
   - Understand the architecture

2. **Use the brainstorming skill if needed:**
   - If you need to clarify any design decisions
   - If you want to explore alternative approaches

3. **Follow the plan:**
   - Stick to the 5-week implementation plan
   - Start with Phase 1 (foundation)
   - Don't skip ahead to advanced features

4. **Test as you go:**
   - Write unit tests for each module
   - Test manually with `npm link`
   - Validate token authentication works

5. **Keep the UX excellent:**
   - Interactive-first design
   - Never force exit
   - Beautiful @clack/prompts
   - Helpful error messages

---

Good luck with the implementation! The design is solid and comprehensive. Just follow the plan and you'll have an amazing CLI tool. 🚀
