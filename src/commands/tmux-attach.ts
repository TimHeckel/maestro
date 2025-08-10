import { Command } from 'commander'
import chalk from 'chalk'
import { execa } from 'execa'
import inquirer from 'inquirer'
import { GitWorktreeManager } from '../core/git.js'
import { attachToTmuxWithProperTTY } from '../utils/tty.js'
import { t } from '../i18n/index.js'

interface TmuxSession {
  name: string
  windows: number
  attached: boolean
  created: string
}

async function getTmuxSessions(): Promise<TmuxSession[]> {
  try {
    const { stdout } = await execa('tmux', [
      'list-sessions',
      '-F',
      '#{session_name}:#{session_windows}:#{session_attached}:#{session_created}',
    ])

    return stdout
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [name, windows, attached, created] = line.split(':')
        return {
          name: name || 'unknown',
          windows: parseInt(windows || '1', 10),
          attached: attached === '1',
          created: new Date(parseInt(created || '0', 10) * 1000).toLocaleString(),
        }
      })
  } catch {
    return []
  }
}

async function getWorktreeBranches(): Promise<string[]> {
  const manager = new GitWorktreeManager()
  const worktrees = await manager.listWorktrees()
  
  return worktrees
    .map(wt => {
      // Extract branch name from refs/heads/xxx
      const branch = wt.branch?.replace('refs/heads/', '')
      return branch || ''
    })
    .filter(Boolean)
}

function sanitizeSessionName(branchName: string): string {
  return branchName.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export const tmuxAttachCommand = new Command('tmux-attach')
  .alias('ta')
  .description('Attach to existing tmux session (reconnect to running session)')
  .argument('[branch-name]', 'Branch name to attach to (interactive selection if omitted)')
  .option('-l, --list', 'List all tmux sessions')
  .option('-h, --help-tmux', 'Show tmux navigation help')
  .exitOverride()
  .action(async (branchName?: string, options: { list?: boolean; helpTmux?: boolean } = {}) => {
    try {
      // If --help-tmux flag, just show help
      if (options.helpTmux) {
        console.log(chalk.cyan(t('tmux.tmuxHelp')))
        return
      }

      // Check if tmux is installed
      try {
        await execa('tmux', ['-V'])
      } catch {
        console.error(chalk.red(t('tmux.tmuxNotInstalled')))
        console.log(chalk.yellow(t('tmux.installMethod')))
        console.log('  brew install tmux')
        console.log('  または https://github.com/tmux/tmux')
        process.exit(1)
      }

      const sessions = await getTmuxSessions()

      // If --list flag, just show sessions
      if (options.list) {
        if (sessions.length === 0) {
          console.log(chalk.gray(t('tmux.noActiveSession')))
          return
        }

        console.log(chalk.bold('\n' + t('tmux.sessionList') + '\n'))
        
        // Header
        console.log(
          chalk.gray('Session'.padEnd(30)) +
          chalk.gray('Windows'.padEnd(10)) +
          chalk.gray('Attached'.padEnd(12)) +
          chalk.gray('Created')
        )
        console.log(chalk.gray('─'.repeat(80)))

        // Sessions
        sessions.forEach(session => {
          const nameDisplay = session.attached
            ? chalk.green(session.name.padEnd(30))
            : chalk.cyan(session.name.padEnd(30))
          const windowsDisplay = chalk.white(session.windows.toString().padEnd(10))
          const attachedDisplay = session.attached
            ? chalk.green('Yes'.padEnd(12))
            : chalk.gray('No'.padEnd(12))
          const createdDisplay = chalk.gray(session.created)

          console.log(nameDisplay + windowsDisplay + attachedDisplay + createdDisplay)
        })

        console.log(chalk.gray('\n' + t('tmux.sessionAttachHint')))
        return
      }

      // If branch name provided, try to attach directly
      if (branchName) {
        const sessionName = sanitizeSessionName(branchName)
        
        // Check if session exists
        const sessionExists = sessions.some(s => s.name === sessionName)
        
        if (!sessionExists) {
          console.error(chalk.red(`No tmux session found for branch: ${branchName}`))
          console.log(chalk.yellow(`\nAvailable sessions:`))
          sessions.forEach(s => console.log(`  - ${s.name}`))
          console.log(chalk.gray(`\nCreate a new session with: mst create ${branchName} --tmux`))
          process.exit(1)
        }

        console.log(chalk.cyan(t('tmux.attachingToSession', { session: sessionName })))
        console.log(chalk.gray(t('tmux.tmuxHelp')))
        await attachToTmuxWithProperTTY(sessionName)
        return
      }

      // Interactive selection
      if (sessions.length === 0) {
        console.log(chalk.yellow('No active tmux sessions found.'))
        console.log(chalk.gray('\nCreate a new session with: mst create <branch> --tmux'))
        return
      }

      // Get worktree branches for better context
      const worktreeBranches = await getWorktreeBranches()

      // Prepare choices with context
      const choices = sessions.map(session => {
        const isWorktree = worktreeBranches.some(branch => 
          sanitizeSessionName(branch) === session.name
        )
        
        const label = isWorktree 
          ? `${session.name} ${chalk.green('(worktree)')}`
          : session.name
          
        const status = session.attached ? chalk.yellow(' [attached]') : ''
        
        return {
          name: `${label}${status} - ${session.windows} window(s)`,
          value: session.name,
        }
      })

      const { selectedSession } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedSession',
          message: 'Select tmux session to attach:',
          choices,
        },
      ])

      console.log(chalk.cyan(t('tmux.attachingToSession', { session: selectedSession })))
      console.log(chalk.gray(t('tmux.tmuxHelp')))
      await attachToTmuxWithProperTTY(selectedSession)
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('force closed')) {
        console.log(chalk.gray('\nCancelled'))
        return
      }
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error')
      process.exit(1)
    }
  })