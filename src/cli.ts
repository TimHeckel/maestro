#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { t } from './i18n/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))
import { createCommand } from './commands/create.js'
import { listCommand } from './commands/list.js'
import { deleteCommand } from './commands/delete.js'
import { shellCommand } from './commands/shell.js'
import { execCommand } from './commands/exec.js'
import { attachCommand } from './commands/attach.js'
import { configCommand } from './commands/config.js'
import { githubCommand } from './commands/github.js'
import { completionCommand } from './commands/completion.js'
import { tmuxCommand } from './commands/tmux.js'
import { tmuxAttachCommand } from './commands/tmux-attach.js'
import { whereCommand } from './commands/where.js'
import { syncCommand } from './commands/sync.js'
import { reviewCommand } from './commands/review.js'
import { issueCommand } from './commands/issue.js'
import { historyCommand } from './commands/history.js'
import { graphCommand } from './commands/graph.js'
import { healthCommand } from './commands/health.js'
import { snapshotCommand } from './commands/snapshot.js'
import { initCommand } from './commands/init.js'
import { pushCommand } from './commands/push.js'

const program = new Command()

program
  .name('maestro')
  .description(t('cli.description'))
  .version(packageJson.version)

// Add subcommands
program.addCommand(initCommand)
program.addCommand(createCommand)
program.addCommand(listCommand)
program.addCommand(deleteCommand)
program.addCommand(shellCommand)
program.addCommand(execCommand)
program.addCommand(attachCommand)
program.addCommand(configCommand)
program.addCommand(githubCommand)
program.addCommand(completionCommand)
program.addCommand(tmuxCommand)
program.addCommand(tmuxAttachCommand)
program.addCommand(whereCommand)
program.addCommand(syncCommand)
program.addCommand(reviewCommand)
program.addCommand(issueCommand)
program.addCommand(historyCommand)
program.addCommand(graphCommand)
program.addCommand(healthCommand)
program.addCommand(snapshotCommand)
program.addCommand(pushCommand)

// Error handling
program.exitOverride()

interface CommanderError extends Error {
  code?: string
  exitCode?: number
}

try {
  await program.parseAsync(process.argv)
} catch (error) {
  if (error instanceof Error) {
    const cmdErr = error as CommanderError
    if (
      cmdErr.exitCode === 0 ||
      cmdErr.code === 'commander.version' ||
      cmdErr.code === 'commander.helpDisplayed'
    ) {
      process.exit(0)
    }
    if (cmdErr.message === '(outputHelp)') {
      process.exit(0)
    }
    console.error(chalk.red(t('cli.error') + ':'), error.message)
  }
  process.exit(1)
}

export { program }
