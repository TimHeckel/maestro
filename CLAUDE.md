# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Maestro is a CLI tool for managing Git worktrees with a conductor/orchestra theme. It helps developers work on multiple branches in parallel by creating "orchestra members" (worktrees) with integration for Claude Code, tmux, GitHub, and more.

## Development Commands

**IMPORTANT**: This project uses pnpm exclusively. All commands must use `pnpm` instead of `npm`.

### Build & Test

- `pnpm build` - Build the TypeScript project using tsup
- `pnpm dev` - Watch mode development using tsx
- `pnpm test` - Run tests with vitest
- `pnpm test:e2e` - Run end-to-end tests
- `pnpm test:coverage` - Run tests with coverage report (80% minimum threshold)
- `pnpm typecheck` - Type checking without emitting files

### Code Quality

- `pnpm lint` - ESLint checking on TypeScript files
- `pnpm lint:ci` - CI-specific linting with max 26 warnings threshold
- `pnpm format` - Format code with Prettier
- `pnpm prettier:check` - Check code formatting

### Single Test Execution

- `pnpm test -- path/to/test.test.ts` - Run a specific test file
- `pnpm test -- --reporter=verbose` - Run tests with detailed output

### Publishing

- `pnpm changeset` - Create a changeset for releases
- `pnpm version` - Version bump using changesets
- `pnpm release` - Build and publish to npm
- `pnpm prepublishOnly` - Pre-publish hook (auto-build and generate completions)

## Core Architecture

### Main Components

- **CLI Entry Point**: `src/cli.ts` - Main CLI interface using Commander.js
- **Commands**: `src/commands/` - Individual command implementations
- **Core Logic**: `src/core/` - Core Git and configuration management
- **Types**: `src/types/index.ts` - TypeScript type definitions
- **Utils**: `src/utils/` - Utility functions and helpers
- **i18n**: `src/i18n/` - Internationalization support (English/Japanese)

### Key Classes

- `GitWorktreeManager` (src/core/git.ts) - Git worktree operations using simple-git
- Configuration management in `src/core/config.ts`
- Individual command handlers in `src/commands/`

### Technology Stack

- **Language**: TypeScript with ES2022 target
- **CLI Framework**: Commander.js for command structure
- **Git Operations**: simple-git library
- **UI Libraries**: chalk (colors), inquirer (prompts), ora (spinners)
- **File Watching**: chokidar
- **Testing**: Vitest for unit and e2e tests
- **Build**: tsup for bundling

## Command Structure

The CLI follows a modular command structure where each command (create, delete, list, etc.) has its own file in `src/commands/`. Commands support:

- Interactive prompts using inquirer
- fzf integration for selection
- JSON output for scripting
- tmux integration with auto-attach functionality
- Claude Code integration via MCP
- GitHub Issue/PR integration with automatic metadata extraction
- CLAUDE.md file management in shared/split modes

## Testing Approach

### Test Structure

- **Unit tests**: `src/__tests__/commands/` and `src/__tests__/core/`
- **E2E tests**: `e2e/tests/`
- **Test utilities**: `src/__tests__/utils/`
- **Coverage Requirements**: statements: 80%, branches: 75%, functions: 75%, lines: 80% (configured in vitest.config.ts)

### Test-Driven Development (TDD)

This project follows TDD methodology:

1. Create failing test first (Red)
2. Write minimal code to pass (Green)
3. Refactor while keeping tests green
4. Always run `pnpm lint && pnpm typecheck` after changes

### Running Tests

- `pnpm test -- path/to/test.test.ts` - Run specific test file
- `pnpm test:coverage` - Generate coverage report
- `pnpm test:e2e` - Run end-to-end tests

## Orchestration System (v5.4.0)

Maestro now includes a powerful orchestration system for planning and executing parallel development workflows:

### Commands
- `mst plan` - AI-assisted planning (Claude by default, --manual for prompts)
- `mst implement` - Execute the orchestration plan
- `mst orchestra` - Manage and monitor orchestration

### Orchestration Storage (.maestro.json)
The orchestration plan is stored in `.maestro.json` under the `orchestration` key:
- Features to implement with sessions and prompts
- tmux sessions and pane layouts
- Initial prompts for each pane (pre-filled but not auto-executed)
- Claude context and agent assignments
- Dependencies between features

### Technical Implementation
- Uses `tmux send-keys` to inject prompts without executing
- Creates worktrees in parallel or respecting dependencies
- Customizes CLAUDE.md for each worktree with orchestration context
- Stores orchestration plan in `.maestro.json` (v5.4.0+)
- Tracks runtime state in `.maestro/orchestra.state.json`

### Requirements
- tmux is required for orchestration features
- All orchestration commands check for tmux availability

## Recent Improvements (v5.4.0)

### Unified Orchestration Configuration
- **Single Config File**: Orchestration now stored in `.maestro.json` instead of separate MAESTRO.yml
- **Hybrid Approach**: Stores orchestration config under `orchestration` key in existing `.maestro.json`
- **Consistent Field Names**: Updated to use camelCase (e.g., `claudeContext` instead of `claude_context`)
- **Backward Compatibility**: Conceptual "MAESTRO plan" name retained for user messaging

### Claude-First Orchestration Planning
- **AI-Assisted Planning**: `mst plan` now defaults to Claude AI assistance
- **Tickle Prompt System**: Sends special prompt that Claude recognizes for interactive planning
- **Manual Mode Option**: Use `--manual` flag for traditional step-by-step prompts
- **Project Detection**: Automatically detects project type (Node.js, Python, Go, etc.)
- **Natural Conversation**: Plan orchestration through conversation instead of filling out forms
- **Smart Plan Generation**: Claude analyzes codebase and suggests optimal parallel workflows

### How to Use Claude Planning
```bash
# Default: Claude helps you plan
mst plan

# Manual mode: Traditional prompts
mst plan --manual

# See all options
mst plan --help
```

When using Claude mode, I will:
1. Ask about your development goals
2. Analyze your codebase structure
3. Suggest parallel features to implement
4. Generate optimal tmux configurations
5. Create MAESTRO.yml with proper dependencies

## Recent Improvements (v5.3.0)

### Complete Orchestration System
- **Three-Command Workflow**: `mst plan` → `mst implement` → `mst orchestra`
- **MAESTRO.yml**: Configuration file for orchestration plans
- **Parallel Worktree Creation**: Create multiple worktrees simultaneously
- **tmux Session Management**: Auto-create detached sessions with configured layouts
- **Prompt Injection**: Pre-fill commands in panes (not auto-executed)
- **Dependency Resolution**: Handle feature dependencies intelligently
- **Claude Context**: Customize CLAUDE.md for each worktree with orchestration info

## Recent Improvements (v5.2.1)

### Complete i18n Implementation
- **Fixed all hardcoded Japanese strings**: Removed remaining Japanese text from create.ts and other commands
- **Complete i18n support**: All UI text now supports multiple languages (English/Japanese)
- **Language detection priority**: Project config → Global config → System locale → Default (English)
- **User language selection**: During `mst init`, users can choose their preferred language
- **Comprehensive translations**: All commands, error messages, and UI strings are translated
- **Proper locale detection**: System locale (e.g., en_US.UTF-8) correctly detected and respected

### Tmux Integration Enhancements
- **Navigation help**: Automatic display of tmux navigation tips in user's language
- **Fixed detachment behavior**: `mst create --tmux` no longer exits when detaching (Ctrl+B, D)
- **New `tmux-attach` command**: Easy reattachment to existing tmux sessions with `mst ta`
- **Built-in cheat sheet**: Access tmux help anytime with `mst ta --help-tmux`

### Command Behavior Clarifications
- **Create command**: Default behavior creates worktree and exits (use `--shell` or `--tmux` to enter)
- **Shell entry**: Explicit `--shell` flag required to enter shell after creation
- **Tmux session**: Use `--tmux` to create and optionally attach to tmux session
  - `mst tmux-attach` or `mst ta` - Interactive session selection
  - `mst ta -l` - List all tmux sessions
  - `mst ta --help-tmux` - Show tmux navigation help
- **Tmux navigation help**: Automatic help display when attaching or creating multi-pane sessions
- **Improved script path resolution**: Fixed for npm linked packages

### Command Clarity
- **`attach` vs `tmux-attach`**: Clear distinction between commands
  - `attach`: Creates worktree from existing branch
  - `tmux-attach`: Reconnects to running tmux session

## Implementation Logs

This project maintains implementation logs in `_docs/templates/` with format `yyyy-mm-dd_feature-name.md`. When working on features, check existing logs for context on design decisions and previous implementations.

## MCP Integration

The project includes MCP (Model Context Protocol) server functionality in `src/mcp/server.ts` for Claude Code integration. The MCP server exposes orchestral-themed tools:

- `create_orchestra_member` - Create new worktrees with optional base branch
- `delete_orchestra_member` - Orchestra members exit with force option
- `exec_in_orchestra_member` - Execute commands within specific worktrees
- `list_orchestra_members` - List all active worktrees with status

All MCP tools use Zod schemas for validation and follow the orchestra/conductor theme throughout.

## Package Configuration

- **Package Manager**: pnpm (specified in package.json)
- **Node Version**: >=20.0.0
- **Module Type**: ESM with .js extensions in imports
- **Binaries**: `maestro` and `mst` commands

## Key Dependencies

- @modelcontextprotocol/sdk - MCP integration
- simple-git - Git operations
- commander - CLI framework
- inquirer - Interactive prompts
- chalk - Terminal colors
- chokidar - File watching
- conf - Configuration management
- zod - Runtime type validation
- execa - Process execution

## Orchestra Theme & Terminology

Maestro uses orchestra/conductor metaphors throughout:

- **Orchestra Members**: Git worktrees (stored in `.git/orchestra-members`)
- **Performers**: Active worktree sessions
- **Conductors**: Main branch or coordinating worktrees
- **Configuration**: `.maestro.json` for project-specific settings

## Git Commit Guidelines

Follow semantic commit prefixes for this project:

- `feat:` - New features
- `fix:` - Bug fixes
- `test:` - Test additions/updates
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `chore:` - Build/dependency updates

**IMPORTANT**: Always stage files individually with `git add <specific-files>` instead of `git add -A`. Create meaningful commit messages that explain the "why" of changes.

**Post-Implementation Requirements**: After completing any issue fixes or feature additions, always run `pnpm format` to ensure code formatting consistency and avoid CI/Lint errors.

## AI Agent Integration

### Automated Command Documentation Updates

**IMPORTANT**: When you modify, add, or delete files in `src/commands/`, you MUST proactively use the `command-docs-updater` agent to maintain documentation consistency. This includes:

- Adding new commands to `src/commands/`
- Modifying existing command options, flags, or behavior
- Changing command help text or descriptions
- Updating command examples or usage patterns
- Removing or deprecating commands

**Auto-trigger Rules**:
1. After ANY changes to files in `src/commands/`, immediately use the Task tool to launch the `command-docs-updater` agent
2. The agent will automatically identify and update:
   - README.md files at various levels
   - docs/commands/ directory and individual command docs
   - docs/COMMANDS.md master command reference
   - API documentation and command reference guides
   - CLI help text and usage examples
   - Any markdown files referencing the commands

**Example Usage**:
```
After modifying src/commands/create.ts to add a --template option:
Use Task tool: "I've updated the create command to add a new --template option. Please use the command-docs-updater agent to update all related documentation."
```

This ensures documentation always stays in sync with implementation changes without manual intervention.

## Integration Points

### Claude Code MCP

- Server implementation in `src/mcp/server.ts`
- Auto-generates CLAUDE.md files for new worktrees
- Supports AI-powered code review workflows
- Provides orchestral-themed tools for worktree management
- Handles CLAUDE.md file modes: `shared` (symlink to main) or `split` (independent files)

### External Tool Integration

- **GitHub CLI**: Direct `gh` command integration for PR management and Issue/PR metadata extraction
- **tmux**: Session management with auto-attach functionality and smart pane validation for `--tmux`, `--tmux-h`, `--tmux-v` options
- **fzf**: Fuzzy finding for interactive selection across commands
- **Shell Completion**: bash/zsh/fish completion scripts available via `mst completion`


## Pre-Release Testing Guidelines

**CRITICAL**: Before releasing any version, especially with critical bug fixes, thorough testing must be performed to ensure quality and prevent regressions.

### Local Testing Workflow

1. **Build and Test Locally**
   ```bash
   # Build the project
   pnpm build
   
   # Run the built CLI directly
   node dist/cli.js create test-branch --tmux
   
   # Or use npm link for global testing
   npm link
   mst create test-branch --tmux-h
   ```

2. **Run Comprehensive Test Suite**
   ```bash
   # Unit tests
   pnpm test
   
   # E2E tests
   pnpm test:e2e
   
   # Coverage report
   pnpm test:coverage
   
   # Type checking
   pnpm typecheck
   
   # Linting
   pnpm lint
   ```

3. **Manual Testing Checklist**
   Create a checklist for critical features being modified:
   ```markdown
   ## Manual Test Checklist for [Feature]
   - [ ] Basic functionality works as expected
   - [ ] Edge cases are handled properly
   - [ ] No regressions in related features
   - [ ] Performance is acceptable
   - [ ] Error messages are helpful
   
   ## Example: tmux Integration Testing
   - [ ] `mst create test --tmux` creates session and attaches
   - [ ] Keyboard input works normally (no escape sequences)
   - [ ] Ctrl+C interrupts commands without detaching
   - [ ] Ctrl+B, D detaches properly
   - [ ] Terminal remains functional after detach
   - [ ] mst process continues running after tmux detach (doesn't exit immediately)
   - [ ] `--tmux-h` creates horizontal split
   - [ ] `--tmux-v` creates vertical split
   - [ ] Pane validation works: `--tmux-h-panes 20` fails with clear error
   - [ ] Pane validation allows reasonable counts: `--tmux-h-panes 6` succeeds
   - [ ] Early validation prevents resource creation when limits exceeded
   - [ ] Error messages respect language selection (English/Japanese)
   ```

4. **Pre-Release Testing**
   ```bash
   # Create a beta/canary release for testing
   pnpm changeset version --snapshot beta
   pnpm release --tag beta
   
   # Users can test with:
   npm install -g @camoneart/maestro@beta
   ```

5. **CI/CD Integration Testing**
   Ensure CI passes all checks:
   - Build succeeds
   - All tests pass
   - Coverage meets thresholds
   - No linting errors
   - Type checking passes

### Testing Critical Features

For features that interact with external systems (tmux, GitHub, etc.):

1. **Create dedicated test scripts**
   ```bash
   # scripts/test-tmux-integration.sh
   #!/bin/bash
   set -e
   
   echo "Testing tmux integration..."
   mst create test-tmux --tmux
   # Add automated checks here
   ```

2. **Document expected behavior**
   - What should happen
   - What should NOT happen
   - Known limitations

3. **Test on multiple environments**
   - Different OS versions
   - Different terminal emulators
   - Different shell configurations

### Beta Release Process

For major changes or critical fixes:

1. Create beta changeset: `pnpm changeset --snapshot beta`
2. Publish beta: `pnpm release --tag beta`
3. Announce beta for testing
4. Collect feedback for at least 24-48 hours
5. Fix any issues found
6. Only then proceed with stable release

## Release Guidelines

**IMPORTANT**: Always follow these formats when creating releases.

### Git Tag Format
- **Tag name**: `maestro@{version}` (e.g., `maestro@3.3.2`)
- Created by changeset as `v{version}`, then manually corrected

### GitHub Release Format
- **Title**: `maestro@{version}` (e.g., `maestro@3.3.2`)
- **Body format**:
  ```
  ### {Major|Minor|Patch} Changes

  - #{PR_number} {short_SHA} Thanks @{username}! - {change_summary}

    {detailed_description}
    
    **Changes:**
    - {specific_changes}
    
    **Fixed behavior:**
    - {what_was_fixed}
    
    Fixes #{issue_number}
  ```

### Release Process
1. **TEST THOROUGHLY** (see Pre-Release Testing above)
2. `pnpm changeset` - Create a changeset
3. `pnpm changeset version` - Update version
4. `git add` and `git commit` - Commit changes
5. `git push` - Push to main
6. `pnpm release` - Publish to npm and create tag
7. Fix tag format: 
   ```bash
   git tag -d v{version}
   git push origin --delete v{version}
   git tag maestro@{version}
   git push origin maestro@{version}
   ```
8. `gh release create` - Create GitHub Release following above format

**Note**: Consider beta releases for critical changes before stable release.

## Implementation Log Guidelines

- This project maintains all implementation logs in the main repository's `_docs/templates/` directory with the format `yyyy-mm-dd_feature-name.md`. Always load the entire `_docs/` directory context on startup to understand previous design decisions and side effects. (If `_docs/templates/` doesn't exist on startup, create it before starting implementation, and always ensure implementation logs are saved as `_docs/templates/yyyy-mm-dd_feature-name.md`)
- After completing implementation, save an implementation log to the main repository's `_docs/templates/` with filename `yyyy-mm-dd_feature-name.md`. Use kebab-case for multi-word feature names (e.g., yyyy-mm-dd_product-name.md)
- The "Date" field in implementation logs should use the output from **TIME MCP Server** or the user's `now` alias (`date "+%Y-%m-%d %H:%M:%S"`). If the alias is not set, add `alias now='date "+%Y-%m-%d %H:%M:%S"'` to `.zshrc` or similar.
  - Required items in implementation logs: Purpose/Background / Main Implementation / Design Rationale / Side Effects / Related Files

### Implementation Log Template:

```md
Feature: <feature name here>

- Date: yyyy-mm-dd HH:MM:SS
- Summary: <purpose and background>
- Implementation: <main implementation details>
- Design Rationale: <why this design was chosen>
- Side Effects: <any concerns or side effects>
- Related Files: <file locations>
```

## Recent Improvements (v5.0.0+)

### tmux Detachment Fix
**Problem**: When users detached from tmux sessions (Ctrl+B, D), the entire mst process would exit immediately, preventing completion of post-attachment tasks.

**Solution**: Modified `NativeTmuxHelper.attachToSession()` to accept an `exitOnDetach` parameter. When called from `mst create` with tmux options, it passes `exitOnDetach: false`, allowing mst to continue running after detachment.

**Files Modified**:
- `src/utils/nativeTmux.ts` - Added exitOnDetach parameter to attachToSession()
- `src/utils/tty.ts` - Updated to pass exitOnDetach parameter
- `src/utils/tmuxSession.ts` - Pass exitOnDetach: false for create command attachments

### Internationalization (i18n) Support
**Feature**: Full English and Japanese language support throughout the CLI.

**Implementation**:
- Created `src/i18n/` directory with translation files (`en.ts`, `ja.ts`)
- Added language selection prompt to `mst init` command
- Language preference saved to `.maestro.json` and global config
- Auto-detection from system locale (`$LANG` environment variable)
- All command descriptions now bilingual

**Language Priority**:
1. Project `.maestro.json` setting
2. Global `~/.maestro/config.json` setting
3. System locale detection
4. Default: Japanese (backward compatibility)

**Files Added/Modified**:
- `src/i18n/index.ts` - i18n manager with language detection
- `src/i18n/en.ts` - English translations
- `src/i18n/ja.ts` - Japanese translations
- `src/commands/init.ts` - Added language selection prompt

### tmux Multi-Pane Clarification
**Clarification**: When using `--tmux-h-panes` or `--tmux-v-panes`, Maestro creates:
- **ONE tmux session** (not multiple sessions)
- **Multiple panes** within that single session
- **All panes** operate in the **SAME worktree directory**

This is ideal for parallel development workflows where you need multiple terminal views of the same feature branch (editor, tests, dev server, git operations).

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

      
      IMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.