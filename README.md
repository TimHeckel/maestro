# Maestro

[![Node.js >=20.0.0](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-45CC11?labelColor=555555&style=flat&logoColor=FFFFFF)](https://nodejs.org/)
[![npm version](https://img.shields.io/npm/v/@camoneart/maestro?color=007EC5&labelColor=555555&style=flat&logoColor=FFFFFF)](https://www.npmjs.com/package/@camoneart/maestro)
[![License MIT](https://img.shields.io/badge/License-MIT-yellow?labelColor=555555&style=flat)](https://opensource.org/licenses/MIT)

**English** | **[Japanese](/README.ja.md)**

![maestro](public/image/logo/maestro-logo.png)
**A CLI tool that conducts Git worktrees like an orchestra and accelerates parallel development with Claude Code.**

<br />

https://github.com/user-attachments/assets/6415804a-3dd0-48ac-91eb-1c3adad70ae7

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Installation](#installation)
- [Updating](#updating)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Orchestration Mode 🎭](#orchestration-mode--ai-powered-parallel-development-v540)
- [Command Reference](#command-reference)
- [Advanced Features](#advanced-features)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

Maestro is a CLI that makes Git worktree management intuitive. When working on multiple branches in parallel you can treat each branch as an independent “orchestra member” without changing directories.

### Why Maestro?

| Pain Point                                                                                      | Maestro’s Approach                                                           | Benefit                                               |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Inefficient parallel development**<br>Frequent branch switches, stashes and context switching | **Automatic Worktree management**<br>Each feature lives in its own directory | Zero branch-switch cost, smooth multitasking          |
| **Hard to keep track of tasks**                                                                 | **CLI list & status**<br>Visualise all performers (worktrees)                | Instantly know where you are and the current progress |
| **Heavy review / merge workload**                                                               | **Claude Code integration**<br>AI diff reviews & automated PR flow           | Drastically reduces review time                       |

## Key Features

| Feature                   | Description                                         |
| ------------------------- | --------------------------------------------------- |
| 🎼 **Orchestra UI**       | Operate worktrees as performers in an intuitive way |
| 🎭 **Orchestration Mode** | Plan & execute parallel development workflows (NEW) |
| 🤖 **Claude AI**          | AI diff reviews & code suggestions                  |
| 🔗 **GitHub integration** | Reliable worktree creation from Issues / PRs with rich metadata |
| 🎯 **tmux / fzf**         | Keyboard-only, lightning-fast switching             |
| 🌐 **Multi-language**     | Full English and Japanese interface support         |
| 📊 **Status**             | Real-time worktree status and health monitoring     |
| 🔄 **Auto Sync**          | Propagate file changes in real time                 |
| 📸 **Snapshot**           | Save / restore any state with one command           |
| 🏥 **Health Check**       | Detect & auto-fix orphaned / conflicting branches   |
| 🛡️ **Auto Rollback**      | Intelligent cleanup prevents orphaned worktrees     |

## Installation

### Homebrew (recommended)

```bash
brew install camoneart/tap/maestro
```

- Homebrew installs completion scripts for **zsh / fish / bash** automatically.<br>
- For bash you also need `brew install bash-completion@2`. See [Shell Completion](#shell-completion).

### npm

```bash
npm install -g @camoneart/maestro
```

### pnpm

```bash
# If pnpm is not installed yet
npm install -g pnpm

pnpm add -g @camoneart/maestro
```

## Updating

### Homebrew

```bash
brew upgrade camoneart/tap/maestro
```

### npm

```bash
npm update -g @camoneart/maestro
```

### pnpm

```bash
pnpm update -g @camoneart/maestro
```

## Requirements

| Requirement | Version | Purpose | Install Command |
|-------------|---------|---------|-----------------|
| **Node.js** | >=20.0.0 | JavaScript runtime | [nodejs.org](https://nodejs.org/) |
| **Git** | >=2.22 | Worktree support | `brew install git` |
| **tmux** (optional) | Any | Session management | `brew install tmux` |
| **fzf** (optional) | Any | Fuzzy finding | `brew install fzf` |
| **GitHub CLI** (optional) | Any | GitHub integration | `brew install gh` |

## Quick Start

```bash
# 1. Install (Homebrew example)
brew install camoneart/tap/maestro

# 2. Move to your Git project
cd ~/path/to/your-repo

# 2.5. Initialize maestro for your project (NEW!)
mst init                                      # Interactive setup with language selection (English/Japanese)
# or: mst init --yes                          # Quick setup with defaults (auto-detects language)

# 3. Create a performer (worktree)
mst create feature/awesome-feature            # create only

# 4. Jump into the performer’s shell
mst shell feature/awesome-feature             # open a shell inside

# ── one-liner (tmux + Claude) ──
# Create the worktree, prompt for tmux session attachment, and set up Claude Code workspace
mst create feature/awesome-feature --tmux --claude-md
```

#### Tips

- `mst shell <branch>` lets you enter any performer after creation (fzf prompt when omitted).
- `--tmux` creates a dedicated tmux session with branch name title and prompts for attachment (automatically attaches in non-TTY environments); combine with `--claude-md` to set up Claude Code workspace files.
- `--tmux-h`/`--tmux-v` splits the current tmux pane horizontally/vertically with improved focus management (focuses first pane) and unified pane titles.
- `--tmux-h-panes <number>`/`--tmux-v-panes <number>` creates multiple horizontal/vertical panes with specified count, all displaying consistent branch name titles.
- `--tmux-layout <type>` applies specific tmux layout (even-horizontal, even-vertical, main-horizontal, main-vertical, tiled).

#### Understanding tmux Multi-Pane Sessions

When you use `--tmux-h-panes` or `--tmux-v-panes`, Maestro creates **ONE tmux session** with **multiple panes**, all working in the **SAME worktree directory**. This is perfect for parallel development workflows:

```bash
# Creates 1 tmux session with 4 panes, all in the same feature/api worktree
mst create feature/api --tmux-h-panes 4 --tmux-layout tiled
```

**Common Use Cases for Multiple Panes:**
- **Pane 1**: Code editor (vim/nvim)
- **Pane 2**: Test runner (`npm test --watch`)
- **Pane 3**: Development server (`npm run dev`)
- **Pane 4**: Git operations and general commands

All panes share the same worktree directory, so you're always working on the same feature branch. Navigate between panes with `Ctrl+B` then arrow keys. Detach from the session with `Ctrl+B, D` (the session continues running in the background).

**NEW in v5.2.0: Enhanced tmux Experience & Complete i18n** 🎯
- **Automatic Help Display**: When creating multi-pane sessions or attaching, Maestro shows tmux navigation tips
- **Easy Session Management**: Use `mst tmux-attach` (or `mst ta`) to easily reconnect to any tmux session
- **Built-in Cheat Sheet**: Run `mst ta --help-tmux` to see the full tmux reference anytime
- **Fixed Detachment**: When you detach (Ctrl+B, D), Maestro continues running and completes setup tasks
- **Session Persistence**: Your tmux session remains active and can be re-attached with `mst ta <branch-name>`
- **Complete i18n**: All hardcoded text replaced with proper translations (English/Japanese)

#### Language Support (v5.2.0)

Maestro supports both **English** and **Japanese** interfaces:

- **First-time setup**: `mst init` prompts for your preferred language
- **Auto-detection**: Detects language from system locale if not specified
- **Persistent**: Language preference is saved in `.maestro.json` and global config
- **Complete translations**: All commands, messages, and errors fully translated

Language priority order:
1. Project `.maestro.json` setting
2. Global `~/.maestro/config.json` setting  
3. System locale (`$LANG` environment variable)
4. Default: English (follows system locale)

### Basic Usage Examples

| Goal                              | Command Example                                                              |
| --------------------------------- | ---------------------------------------------------------------------------- |
| **Parallel dev** Feature + bugfix | `mst create feature/auth --tmux --claude-md`<br>`mst create bugfix/login-issue` |
| **List performers**               | `mst list`                                                                   |
| **List with GitHub metadata**     | `mst list --metadata`                                                       |
| **Fast switch** via tmux          | `mst tmux`                                                                   |
| **Create from GitHub Issue**      | `mst create 123`                                                             |
| **Create from PR**                | `mst github checkout 456`                                                    |
| **Create from PR with tmux**      | `mst github checkout 456 --tmux-h`                                           |
| **List GitHub issues/PRs**        | `mst github list`                                                            |
| **Push with PR**                  | `mst push --pr`                                                              |
| **Push with draft PR**            | `mst push --draft-pr`                                                        |
| **Auto review & merge**           | `mst review --auto-flow`                                                     |

## Command Reference

See the full [Command Reference](./docs/COMMANDS.md).

### Main Commands

| Command     | Description                  | Example                        |
| ----------- | ---------------------------- | ------------------------------ |
| `init`      | Initialize project config    | `mst init --yes`               |
| `create`    | Create NEW worktree & branch | `mst create feature/login`     |
| `attach`    | Create worktree from EXISTING branch | `mst attach feature/existing` |
| `list`      | List all worktrees           | `mst list`                     |
| `delete`    | Delete worktree & cleanup    | `mst delete feature/old`       |
| `tmux`      | Switch between worktrees in tmux | `mst tmux`                |
| `tmux-attach` | Reconnect to running tmux session (alias: `ta`) | `mst ta` or `mst ta --help-tmux` |
| `sync`      | Real-time file sync          | `mst sync --auto`              |
| `push`      | Push and create PR           | `mst push --pr`                |
| `github`    | GitHub integration           | `mst github checkout 123`      |
| `health`    | Health check                 | `mst health --fix`             |
| `where`     | Show current performer       | `mst where`                    |
| `plan`      | Plan orchestration workflow  | `mst plan`                     |
| `implement` | Execute orchestration plan   | `mst implement`                |
| `orchestra` | Manage orchestration         | `mst orchestra status`         |

All sub-commands and options are documented in the [Command Reference](./docs/COMMANDS.md).

#### Understanding `attach` vs `tmux-attach` (ta)

These commands serve completely different purposes:

| Command | Purpose | What it does | Example |
|---------|---------|--------------|---------|
| **`attach`** | **Create worktree from existing branch** | Takes an existing remote/local branch and creates a new worktree for it | `mst attach feature/existing-branch` |
| **`tmux-attach` (ta)** | **Reconnect to tmux session** | Reconnects to an already running tmux session that was previously created | `mst ta` or `mst ta feature/my-branch` |

**Quick Examples:**
```bash
# ATTACH: Create a new worktree from an existing branch
mst attach feature/existing-branch    # Creates worktree from existing branch
mst attach                            # Interactive selection of existing branches

# TMUX-ATTACH: Reconnect to a running tmux session
mst ta                                # Interactive selection of running sessions
mst ta feature/my-branch              # Reconnect to specific session
mst ta --list                         # List all running tmux sessions
mst ta --help-tmux                    # Show tmux navigation help
```

**Common Workflow:**
1. `mst create feature/new --tmux` - Creates worktree AND tmux session
2. Work in tmux, then detach with `Ctrl+B, D`
3. Later: `mst ta feature/new` - Reconnect to the same session

#### One-line Cheat Sheet

```bash
mst create feature/my-ui --tmux --claude-md   # create + AI + tmux
mst create feature/api --tmux-h-panes 3       # create + 3 horizontal panes (unified titles)
mst create feature/tdd --tmux-h-panes 4 --tmux-layout tiled  # 4-pane grid layout
# Note: Detaching (Ctrl+B, D) now properly returns control to mst without exiting
mst list                                       # list performers
mst tmux                                       # switch via fzf
mst push --pr                                  # push with PR
mst review --auto-flow                         # auto review & merge
```

## Orchestration Mode 🎭 - AI-Powered Parallel Development (v5.4.0)

Maestro acts as a true "conductor" - using Claude AI to plan and execute entire parallel development workflows with pre-configured prompts for each worktree.

### Prerequisites

**tmux is required** for orchestration features:
```bash
brew install tmux  # macOS
# or
sudo apt-get install tmux  # Ubuntu/Debian
```

### How It Works

1. **Plan**: `mst plan` - Claude AI helps design your orchestration
2. **Implement**: `mst implement` - Execute the plan, creating all worktrees and sessions
3. **Orchestra**: `mst orchestra` - Monitor and manage your orchestration

### 🆕 Claude-First Planning

#### Step 1: Plan Your Orchestration with AI
```bash
mst plan              # Default: Claude AI assists you
mst plan --manual     # Optional: Use traditional prompts
mst plan --help       # See all options
```

**Claude Mode (Default):**
When you run `mst plan`, Claude will:
1. **Ask about your goals** - Natural conversation about what you want to build
2. **Analyze your codebase** - Understand project structure and dependencies
3. **Suggest parallel workflows** - Optimal feature breakdown for parallel development
4. **Generate orchestration plan** - Saved to .maestro.json

**Example Session:**
```
$ mst plan
🎼 Maestro Orchestration Planner
📋 Initiating Claude AI assistance...

[Claude]: What features would you like to implement?
[You]: I need authentication and payment processing
[Claude]: I'll analyze your codebase and create an orchestration plan...
[Claude generates orchestration plan with optimal parallel setup]
```

The orchestration plan is saved to `.maestro.json` under the `orchestration` key.

#### Step 2: Execute the Orchestration
```bash
mst implement
# or
mst implement --all        # Implement all features
mst implement --dry-run    # Preview what would be created
```

**What happens during implementation:**
1. Creates Git worktrees for each feature
2. Creates **detached** tmux sessions (running in background)
3. Injects prompts into each pane but **does NOT execute them**
4. Creates customized CLAUDE.md files with context
5. Shows summary of created sessions

**Important**: Sessions are created in the background. You won't see them immediately!

#### Step 3: Attach to Sessions and Start Working
```bash
# View all created sessions
mst orchestra

# Attach to a specific session
mst orchestra attach
# or
tmux attach -t feature-backend

# View orchestration status
mst orchestra status
```

**When you attach to a session:**
- You'll see pre-filled prompts in each pane
- Press **Enter** in each pane to execute the commands
- Navigate between panes with `Ctrl+B` then arrow keys
- Detach with `Ctrl+B, D` to leave session running

### Complete Example

```bash
# 1. Plan a microservices architecture
mst plan

# Example responses:
# Project: "E-commerce microservices"
# Feature 1: "auth-service"
#   - Session: backend (3 panes)
#     - Pane 1: "npm run dev"
#     - Pane 2: "npm test --watch"
#     - Pane 3: "tail -f logs/auth.log"
# Feature 2: "payment-service"
#   - Session: backend (2 panes)
#     - Pane 1: "npm run dev"
#     - Pane 2: "npm test --watch"

# 2. Execute the plan
mst implement
# Output:
# ✓ Created worktree for auth-service
# ✓ Created worktree for payment-service
# ✓ Created tmux session: auth-service-backend (3 panes)
# ✓ Created tmux session: payment-service-backend (2 panes)
#
# Next steps:
# 1. Attach to sessions: mst orchestra attach
# 2. Press Enter in each pane to execute commands
# 3. Start developing!

# 3. Start working
mst orchestra attach
# Select: auth-service-backend
# [You're now in tmux with 3 panes]
# [Press Enter in each pane to start services]

# 4. Monitor progress
mst orchestra status
# Shows all features, sessions, and their states
```

### Orchestration Plan Structure

The orchestration plan is stored in `.maestro.json` under the `orchestration` key:

```json
{
  "orchestration": {
    "version": "1.0",
    "created": "2024-01-01T00:00:00Z",
    "description": "E-commerce microservices architecture",
    "features": [
      {
        "name": "user-auth",
        "description": "OAuth2 authentication system",
        "base": "main",
        "sessions": [
          {
            "name": "backend",
            "panes": 3,
            "layout": "main-vertical",
            "prompts": [
              "npm run dev",
              "npm test --watch",
              "docker-compose logs -f auth"
            ]
          }
        ],
        "claudeContext": "Use Passport.js for OAuth2\nImplement JWT with refresh tokens",
        "agents": ["code-reviewer", "security-scanner"],
        "dependencies": []
      },
      {
        "name": "payment-service",
        "description": "Payment processing with Stripe",
        "base": "main",
        "sessions": [
          {
            "name": "api",
            "panes": 2,
            "layout": "even-horizontal",
            "prompts": [
              "npm run dev",
              "stripe listen --forward-to localhost:3001/webhook"
            ]
          }
        ],
        "dependencies": ["user-auth"]
      }
    ],
    "settings": {
      "parallel": true,
      "autoAttach": false
    }
  }
}
```

### Key Concepts

- **Detached Sessions**: tmux sessions run in background until you attach
- **Prompt Injection**: Commands are typed but not executed - you press Enter
- **Dependencies**: Features can depend on others for ordered execution
- **Parallel Creation**: Multiple worktrees created simultaneously for speed

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "tmux required" error | Install tmux: `brew install tmux` |
| Sessions not visible | Use `mst orchestra` to list, they're detached |
| Prompts not appearing | Check pane count matches prompt count |
| Can't attach to session | Session may have been killed, use `mst orchestra status` |

## Advanced Features

Maestro ships with **power commands** that automate tedious tasks in a single line.

| Feature                     | Command Example                                                       | What It Automates                                                           |
| --------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Auto Review & Merge 🚀**  | `mst review --auto-flow`                                              | Fetch → rebase → AI review → Conventional Commit → open PR — all in one go  |
| **GitHub Integration 🔗**   | `mst github list` <br>`mst github checkout 123 --tmux-h` <br>`mst list --metadata` | List and checkout GitHub issues/PRs with reliable worktree creation, comprehensive metadata storage, and tmux integration |
| **Snapshot 📸**             | `mst snapshot -m "before-refactor"` <br>`mst snapshot --restore <id>` | Save / restore any working state instantly                                  |
| **Health Check 🏥**         | `mst health` <br>`mst health --fix`                                   | Detects stale / orphaned / conflicted branches and fixes them automatically |

Need more? Run `mst <command> --help`.

## Configuration

### 📁 Project Configuration `.maestro.json`

Maestro reads **`.maestro.json` at the project root** to customise behaviour.<br>
Key settings are summarised below; a full example follows.

### ⚙️ Configuration Management

Maestro provides commands to manage configuration settings using dot notation:

```bash
# Get configuration values
mst config get ui.pathDisplay                      # Get path display setting
mst config get development.autoSetup               # Get auto-setup setting

# Set configuration values  
mst config set ui.pathDisplay relative             # Auto-detects as user setting
mst config set --user ui.pathDisplay relative     # Explicitly save to user settings
mst config set --project worktrees.path "../"     # Explicitly save to project settings
mst config set development.defaultEditor cursor    # Set default editor (user setting)

# Reset to defaults
mst config reset ui.pathDisplay                    # Reset path display to default
mst config reset development.autoSetup             # Reset auto-setup to default

# View and manage configuration files
mst config show                                    # Show current effective config
mst config path                                    # Show config file locations
mst config init                                    # Create project configuration
```

**Path Display Configuration:**  
The `ui.pathDisplay` setting controls how file paths are shown across all commands. When set to `"relative"`, paths are displayed relative to the current working directory. When set to `"absolute"` (default), full absolute paths are shown. This affects commands like `github`, `review`, `shell`, `exec`, and `health`.

**Claude Configuration:**
- `markdownMode: "shared"` - Creates symlink to main repository's CLAUDE.md (default)
- `markdownMode: "split"` - Creates independent CLAUDE.md for each worktree

| Category    | Key            | Purpose                               | Default / Example                   |
| ----------- | -------------- | ------------------------------------- | ----------------------------------- |
| worktrees   | `path`         | Where to store performers             | `../maestro-{branch}`               |
|             | `directoryPrefix` | Prefix for worktree directories    | `""` (empty string)                 |
|             | `branchPrefix` | Prefix for new branches               | `feature/`                          |
| development | `autoSetup`    | Auto-run `npm install` after `create` | `true`                              |
|             | `syncFiles`    | Files to sync across worktrees        | `[".env", ".env.local"]`            |
|             | `defaultEditor`| Default editor for opening            | `cursor`                            |
| tmux        | `enabled`      | Enable tmux integration               | `false`                             |
|             | `openIn`       | Open in window or pane                | `window` (`window` or `pane`)       |
|             | `sessionNaming`| Session naming pattern                | `{branch}`                          |
| claude      | `markdownMode` | CLAUDE.md file management mode        | `shared` (`shared` or `split`)      |
| github      | `autoFetch`    | Auto-fetch before operations          | `true`                              |
|             | `branchNaming.prTemplate` | PR branch naming template    | `pr-{number}`                       |
|             | `branchNaming.issueTemplate` | Issue branch naming template | `issue-{number}`                 |
| ui          | `pathDisplay`  | Path display format in all commands that show paths | `absolute` (`absolute` or `relative`) |
| hooks       | `afterCreate`  | Command after creation                | `npm install`                       |
|             | `beforeDelete` | Command before deletion               | `echo "Deleting $ORCHESTRA_MEMBER"` |

#### Full Example with Default Values

```json
{
  "worktrees": {
    "path": "../maestro-{branch}",
    "directoryPrefix": "",
    "branchPrefix": "feature/"
  },
  "development": {
    "autoSetup": true,
    "syncFiles": [".env", ".env.local"],
    "defaultEditor": "cursor"
  },
  "tmux": {
    "enabled": false,
    "openIn": "window",
    "sessionNaming": "{branch}"
  },
  "claude": {
    "markdownMode": "shared"
  },
  "github": {
    "autoFetch": true,
    "branchNaming": {
      "prTemplate": "pr-{number}",
      "issueTemplate": "issue-{number}"
    }
  },
  "ui": {
    "pathDisplay": "absolute"
  },
  "hooks": {
    "afterCreate": "npm install",
    "beforeDelete": "echo \\\"Deleting performer: $ORCHESTRA_MEMBER\\\""
  }
}
```

### 📋 Complete Configuration Reference

All available configuration options for `.maestro.json`:

| Category | Key | Type | Default | Description |
|----------|-----|------|---------|-------------|
| **worktrees** | | | | Worktree location and naming |
| | `path` | string | `"../maestro-{branch}"` | Directory pattern for worktrees (`{branch}` is replaced with branch name) |
| | `directoryPrefix` | string | `""` | Prefix added to all worktree directory names |
| | `branchPrefix` | string | `""` | Default prefix for new branch names |
| **development** | | | | Development environment settings |
| | `autoSetup` | boolean | `true` | Auto-run setup commands after worktree creation |
| | `syncFiles` | string[] | `[".env", ".env.local"]` | Files to sync across worktrees |
| | `defaultEditor` | string | `"cursor"` | Default editor (`vscode`, `cursor`, `none`) |
| **postCreate** | | | *(not in defaults)* | Post-creation automation |
| | `copyFiles` | string[] | - | Files to copy from main worktree after creation |
| | `commands` | string[] | - | Commands to execute after worktree creation |
| **tmux** | | | | tmux integration settings |
| | `enabled` | boolean | `false` | Enable tmux integration |
| | `openIn` | string | `"window"` | Open in `window` or `pane` |
| | `sessionNaming` | string | `"{branch}"` | Session naming pattern |
| **claude** | | | | Claude Code integration |
| | `markdownMode` | string | `"shared"` | CLAUDE.md mode: `shared` (symlink) or `split` (independent) |
| **github** | | | | GitHub integration settings |
| | `autoFetch` | boolean | `true` | Auto-fetch before operations |
| | `branchNaming.prTemplate` | string | `"pr-{number}"` | PR branch naming template |
| | `branchNaming.issueTemplate` | string | `"issue-{number}"` | Issue branch naming template |
| **ui** | | | | User interface settings |
| | `pathDisplay` | string | `"absolute"` | Path display format: `absolute` or `relative` |
| **hooks** | | | | Lifecycle hooks |
| | `afterCreate` | string \| string[] | - | Commands to run after worktree creation |
| | `beforeDelete` | string | - | Command to run before worktree deletion |

> **Note**: For detailed configuration examples and advanced usage, see [Configuration Guide](./docs/CONFIGURATION.md).

### 🤖 MCP Integration Setup

Add Maestro as an MCP server to Claude Code using the modern command:

#### Local Scope (Default - only for current project, private to you)
```bash
claude mcp add maestro -s local -- npx -y @camoneart/maestro maestro-mcp-server
# Or without -s flag (local is default)
claude mcp add maestro -- npx -y @camoneart/maestro maestro-mcp-server
```

#### Project Scope (saved in .mcp.json for team sharing via version control)
```bash
claude mcp add maestro -s project -- npx -y @camoneart/maestro maestro-mcp-server
```

#### User Scope (available across all projects on the machine)
```bash
claude mcp add maestro -s user -- npx -y @camoneart/maestro maestro-mcp-server
```

#### For global installation users
If you've installed Maestro globally, use:
```bash
claude mcp add maestro -s user -- maestro-mcp-server
```

This will automatically configure Claude Code to use Maestro's MCP server for orchestra management at the chosen scope level.

**Note**: The traditional manual configuration in `.claude/mcp_settings.json` is no longer supported. Use the `claude mcp add` command instead.

### 🐚 Shell Completion

Maestro provides completion scripts for **bash / zsh / fish**.

| Install Method | bash                                     | zsh / fish     |
| -------------- | ---------------------------------------- | -------------- |
| Homebrew       | Auto (bash requires `bash-completion@2`) | Auto           |
| npm / pnpm     | Manual (below)                           | Manual (below) |

#### bash manual setup (npm / pnpm installs)

```bash
brew install bash-completion@2  # if not installed

echo 'eval "$(mst completion bash)"' >> ~/.bashrc
source ~/.bashrc
```

#### zsh manual setup

```bash
mkdir -p ~/.zsh/completions
mst completion zsh > ~/.zsh/completions/_mst
autoload -U compinit && compinit
```

#### fish manual setup

```bash
mst completion fish > ~/.config/fish/completions/mst.fish
```

## Troubleshooting

### 🛡️ Automatic Rollback Protection

Maestro includes **intelligent automatic rollback functionality** that prevents orphaned worktrees when creation fails during post-processing steps:

**How It Works:**
- **Tracks Creation State**: Monitors whether worktree creation succeeded
- **Detects Post-Creation Failures**: Catches errors during tmux session creation, environment setup, or other post-processing
- **Automatic Cleanup**: Immediately removes created worktrees and branches when failures occur
- **Clear Feedback**: Provides user-friendly messages about cleanup process
- **Fallback Instructions**: Shows manual cleanup commands if automatic rollback fails

**Example:**
```bash
# If tmux session creation fails:
mst create feature/new-feature --tmux

# Maestro automatically cleans up:
⚠️  An error occurred during post-processing. Cleaning up created resources...
✅ Cleanup completed
```

**Benefits:**
- **No Orphaned Worktrees**: Maintains clean repository state even when errors occur
- **Better Error Recovery**: Reduces manual cleanup required after failures
- **Improved User Experience**: Clear feedback and recovery instructions

### ❓ Common Errors and Fixes

| Error                                          | Likely Cause                            | One-line Fix                      |
| ---------------------------------------------- | --------------------------------------- | --------------------------------- |
| **Git is too old** <br>`fatal: unknown option` | Git < 2.22                              | `brew install git`                |
| **fzf not found**                              | fzf not installed                       | `brew install fzf`                |
| **tmux not found**                             | tmux not installed                      | `brew install tmux`               |
| **Too many tmux panes** <br>`Unable to create session with N panes due to terminal size` | Terminal window too small for requested panes | Resize window or reduce panes (max: 10 horizontal, 15 vertical) |
| **GitHub PR/Issue not found** <br>`Error: PR/Issue #999 が見つかりません` | Specified non-existent Issue/PR number | Check correct number or verify repository |

### Other error codes

| Code         | Cause                  | Fix                                     |
| ------------ | ---------------------- | --------------------------------------- |
| `ENOENT`     | Git binary not found   | Check PATH or reinstall Git             |

### ⚠️ CLI Option Validation and Error Handling

Maestro now includes **strict CLI option validation** to prevent execution with invalid options:

**Immediate Exit on Invalid Options**:
- **Early Detection**: Commands exit immediately when unknown or invalid options are provided
- **Prevents Execution**: Commands will not proceed with any operations when invalid options are detected
- **Clear Error Messages**: Specific feedback about which options are invalid

**Example**:
```bash
# Invalid option provided:
mst create feature/test --invalid-option value

# Output:
error: unknown option '--invalid-option'

# Command exits with error code 1 - no resources created
```

**Benefits**:
- **Prevents Unintended Operations**: Commands won't execute with typos in option names
- **Clean Exit**: Immediate feedback with error code 1
- **Better Developer Experience**: Immediate feedback about command usage errors

### ⚠️ Directory Existence Checking and Interactive Handling

Maestro includes **intelligent directory existence checking** with interactive resolution options when creating worktrees:

**Smart Directory Management**:
- **Early Detection**: Checks if target directory already exists before worktree creation
- **Interactive Resolution**: Presents user with multiple resolution options when conflicts occur
- **Clean Handling**: Ensures consistent behavior across create, github, and review commands
- **Safe Operations**: All operations include confirmation prompts and clear feedback

**Available Resolution Options**:
When a directory already exists, Maestro offers these interactive choices:
- **Delete and Recreate**: Removes existing directory and creates fresh worktree
- **Use Alternative Name**: Automatically generates unique directory name (e.g., `branch-name-2`)
- **Cancel Operation**: Safely exits without making any changes

**Enhanced User Experience**:
```bash
# Example interaction when directory exists:
mst create feature/new-feature

⚠️  Directory '../feature/new-feature' already exists

? How would you like to proceed?
❯ Delete existing directory and create new
  Use alternative name (feature/new-feature-2)
  Cancel
```

**Benefits**:
- **Prevents Conflicts**: No more worktree creation failures due to existing directories
- **User Control**: Clear choices for handling existing directories
- **Automatic Alternatives**: Smart generation of alternative names when needed
- **Safe Cancellation**: Easy exit option when conflicts can't be resolved

### ⚠️ tmux Multi-Pane Validation and Error Handling

Maestro also includes **early validation for tmux pane creation** to prevent resource waste and provide better user experience:

**Smart Pre-Validation**:
- **Early Detection**: Validates pane count limits BEFORE creating any resources (worktree, branch, tmux session)
- **Prevents Resource Creation**: Command exits with error code 1 immediately when validation fails
- **No Cleanup Needed**: Since no resources are created, no rollback is required
- **Maximum Limits**: 10 panes for horizontal splits, 15 panes for vertical splits

**Enhanced Error Messages**:
```bash
# Early validation error message:
Error: Unable to create session with 20 panes due to terminal size. Please resize your terminal window or reduce the number of panes. (horizontal split)

# Command exits immediately - no resources created
```

**Quick Solutions**:
```bash
# If this fails due to pane limit:
mst create feature/api --tmux-h-panes 20

# Reduce to allowed limit:
mst create feature/api --tmux-h-panes 8

# Switch to vertical for higher limits:
mst create feature/api --tmux-v-panes 12 --tmux-layout main-vertical

# Use space-efficient layouts:
mst create feature/api --tmux-h-panes 6 --tmux-layout tiled
```

**Validation Benefits**:
- **Clean Exit**: Command exits with error code 1 when validation fails
- **No Resource Waste**: Prevents creation of worktrees that would need cleanup
- **Better Performance**: Immediate feedback without waiting for tmux operations
- **Clear Guidance**: Specific error messages with actionable solutions

**Pane Limits**:
- **Horizontal splits**: Maximum 10 panes (smaller screen space per pane)
- **Vertical splits**: Maximum 15 panes (more vertical space available)
- **Validation triggers**: Only for multi-pane options (`--tmux-h-panes` > 2, `--tmux-v-panes` > 2)

If the issue persists, search or open a new ticket in the [Issues](https://github.com/camoneart/maestro/issues).

### 🔍 Debug Mode

```bash
# Verbose logs to console
DEBUG=mst:* mst create feature/debug

# Save detailed logs to a file
DEBUG=mst:* mst review --auto-flow &> maestro-debug.log
```

## Contributing

### 🤝 Contribution Workflow

1. Open an [Issue](https://github.com/camoneart/maestro/issues) for bugs or feature requests.
2. Fork the repo and create a branch like `feat/your-topic`.
3. Run `pnpm lint && pnpm test` and make sure everything passes.
4. Commit with **Conventional Commits**.
5. Open a Pull Request and fill out the template.

See the [Contributing Guide](/CONTRIBUTING.md) and [Code of Conduct](/CODE_OF_CONDUCT.md) for details.

## License

Licensed under the [MIT License](./LICENSE).
