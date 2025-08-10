import { Command } from 'commander'
import chalk from 'chalk'
import { GitWorktreeManager } from '../core/git.js'
import { ConfigManager } from '../core/config.js'
import { spawn } from 'child_process'
import inquirer from 'inquirer'
import { execa } from 'execa'
import { ErrorFactory, handleError } from '../utils/errors.js'
import { startTmuxShell, isInTmuxSession, TmuxPaneType } from '../utils/tmux.js'
import { selectWorktreeWithFzf, isFzfAvailable } from '../utils/fzf.js'
import { attachToTmuxWithProperTTY, createAndAttachTmuxSession } from '../utils/tty.js'
import { formatPath } from '../utils/path.js'
import { t } from '../i18n/index.js'

interface ShellOptions {
  fzf?: boolean
  cmd?: string
  tmux?: boolean
  tmuxVertical?: boolean
  tmuxHorizontal?: boolean
}

export const shellCommand = new Command('shell')
  .alias('sh')
  .description(t('shell.enteringMemberShell'))
  .argument('[branch-name]', t('shell.branchNameArg'))
  .option('--fzf', t('shell.selectWithFzf'))
  .option('--cmd <command>', t('shell.runCommandAndExit'))
  .option('-t, --tmux', t('shell.attachExistingTmux'))
  .option('--tmux-vertical, --tmux-v', t('shell.tmuxVerticalSplit'))
  .option('--tmux-horizontal, --tmux-h', t('shell.tmuxHorizontalSplit'))
  .exitOverride()
  .action(async (branchName?: string, options: ShellOptions = {}) => {
    try {
      const gitManager = new GitWorktreeManager()

      // Check if Git repository
      const isGitRepo = await gitManager.isGitRepository()
      if (!isGitRepo) {
        throw ErrorFactory.notGitRepository()
      }

      const worktrees = await gitManager.listWorktrees()

      // Exclude main branch
      const orchestraMembers = worktrees.filter(wt => !wt.path.endsWith('.'))

      if (orchestraMembers.length === 0) {
        console.log(chalk.yellow(t('shell.noMembers')))
        console.log(chalk.gray(t('shell.createHint')))
        process.exit(0)
      }

      // Validate tmux options
      const tmuxOptionsCount = [options.tmux, options.tmuxVertical, options.tmuxHorizontal].filter(
        Boolean
      ).length
      if (tmuxOptionsCount > 1) {
        console.error(chalk.red(t('shell.errorTmuxOptions')))
        process.exit(1)
      }

      const isUsingTmux = options.tmux || options.tmuxVertical || options.tmuxHorizontal
      if (isUsingTmux && !(await isInTmuxSession())) {
        console.error(
          chalk.red(t('shell.errorTmuxRequired'))
        )
        process.exit(1)
      }

      // Branch name not specified or fzf option specified
      if (!branchName || options?.fzf) {
        if (options?.fzf) {
          // Check fzf availability
          if (!(await isFzfAvailable())) {
            console.error(chalk.red(t('shell.errorFzfNotInstalled')))
            process.exit(1)
          }

          const selectedBranch = await selectWorktreeWithFzf(
            orchestraMembers,
            t('shell.selectMemberShell')
          )

          if (!selectedBranch) {
            console.log(chalk.gray(t('common.cancel')))
            process.exit(0)
          }

          branchName = selectedBranch
        } else {
          // Select with inquirer
          const { selectedBranch } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedBranch',
              message: t('shell.whichMemberEnter'),
              choices: orchestraMembers.map(wt => {
                const branchName = wt.branch?.replace('refs/heads/', '') || wt.branch
                const configManager = new ConfigManager()
                const config = configManager.getAll()
                return {
                  name: `${chalk.cyan(branchName)} ${chalk.gray(formatPath(wt.path, config))}`,
                  value: branchName,
                }
              }),
            },
          ])
          branchName = selectedBranch
        }
      }

      // Find worktree for specified branch
      const targetWorktree = orchestraMembers.find(wt => {
        const branch = wt.branch?.replace('refs/heads/', '')
        return branch === branchName || wt.branch === branchName
      })

      if (!targetWorktree) {
        // Search for similar names
        const similarBranches = orchestraMembers
          .filter(
            wt => wt.branch && wt.branch.toLowerCase().includes((branchName || '').toLowerCase())
          )
          .map(wt => wt.branch?.replace('refs/heads/', '') || '')
          .filter(Boolean)

        throw ErrorFactory.worktreeNotFound(branchName || '', similarBranches)
      }

      const configManager = new ConfigManager()
      await configManager.loadProjectConfig()
      const config = configManager.getAll()
      console.log(chalk.green(t('shell.enteringMember', { branch: chalk.cyan(branchName) })))
      console.log(chalk.gray(`📁 ${formatPath(targetWorktree.path, config)}\n`))

      // --cmd option handling
      if (options.cmd) {
        console.log(chalk.blue(t('shell.executingCommand', { command: options.cmd })))
        try {
          const result = await execa(options.cmd, [], {
            cwd: targetWorktree.path,
            stdio: 'inherit',
            shell: true,
            env: {
              ...process.env,
              MAESTRO_BRANCH: branchName,
              MAESTRO_PATH: targetWorktree.path,
            },
          })
          console.log(chalk.green(t('shell.commandComplete', { code: result.exitCode || 0 })))
        } catch (error) {
          console.error(
            chalk.red(
              t('shell.commandFailed', { error: error instanceof Error ? error.message : t('errors.general') })
            )
          )
          process.exit(1)
        }
        return
      }

      // tmux option handling
      if (isUsingTmux) {
        let paneType: TmuxPaneType = 'new-window'
        if (options.tmuxVertical) paneType = 'vertical-split'
        if (options.tmuxHorizontal) paneType = 'horizontal-split'

        // --tmux option (existing session management) handling
        if (options.tmux) {
          const sessionName = `maestro-${branchName}`

          try {
            // Check if existing tmux session exists
            const existingSessions = await execa(
              'tmux',
              ['list-sessions', '-F', '#{session_name}'],
              {
                reject: false,
              }
            )

            const sessionExists = existingSessions.stdout
              .split('\n')
              .some(name => name.trim() === sessionName)

            if (sessionExists) {
              console.log(chalk.blue(t('shell.attachingExistingTmux', { session: sessionName })))
              await attachToTmuxWithProperTTY(sessionName)
              console.log(chalk.gray(t('shell.returnedFromTmux')))
            } else {
              console.log(chalk.blue(t('shell.creatingNewTmux', { session: sessionName })))

              // Set environment variables
              process.env.MAESTRO_BRANCH = branchName
              process.env.MAESTRO_PATH = targetWorktree.path

              await createAndAttachTmuxSession(sessionName, targetWorktree.path)
              console.log(chalk.gray(t('shell.returnedFromTmux')))
            }
          } catch (error) {
            console.error(
              chalk.red(
                t('shell.tmuxFailed', { error: error instanceof Error ? error.message : t('errors.general') })
              )
            )
            console.log(chalk.yellow(t('shell.fallingBackToShell')))
            // Fall back to normal shell if tmux fails
            startNormalShell()
          }
          return
        } else {
          // --tmux-v, --tmux-h option handling
          const paneTypeDisplay = paneType === 'vertical-split' ? 'vertical' : 'horizontal'
          console.log(
            chalk.green(t('shell.startingTmuxPane', { branch: chalk.cyan(branchName), type: paneTypeDisplay }))
          )
          console.log(chalk.gray(`📁 ${formatPath(targetWorktree.path, config)}\n`))

          try {
            await startTmuxShell({
              cwd: targetWorktree.path,
              branchName,
              paneType,
              sessionName: branchName,
            })
          } catch (error) {
            console.error(
              chalk.red(
                t('shell.tmuxPaneFailed', { type: paneTypeDisplay, error: error instanceof Error ? error.message : t('errors.general') })
              )
            )
            console.log(chalk.yellow(t('shell.fallingBackToShell')))
            // Fall back to normal shell if tmux fails
            startNormalShell()
          }
          return
        }
      }

      // Normal shell launch
      startNormalShell()

      function startNormalShell() {
        if (!targetWorktree) {
          console.error(chalk.red(t('shell.errorTargetUndefined')))
          process.exit(1)
        }

        // Auto-detect shell
        const shell = getShell()
        const shellEnv = getShellEnv(shell, branchName!)

        console.log(chalk.blue(t('shell.shellType', { shell })))
        const shellProcess = spawn(shell, [], {
          cwd: targetWorktree.path,
          stdio: 'inherit',
          env: {
            ...process.env,
            ...shellEnv,
            MAESTRO_BRANCH: branchName,
            MAESTRO_PATH: targetWorktree.path,
          },
        })

        shellProcess.on('exit', code => {
          console.log(chalk.gray(t('shell.returnedFromMember', { code: code || 0 })))
        })
      }

      function getShell(): string {
        const shell = process.env.SHELL || '/bin/bash'
        return shell
      }

      function getShellEnv(shell: string, branchName: string): Record<string, string> {
        const shellName = shell.split('/').pop() || 'bash'

        switch (shellName) {
          case 'zsh':
            return {
              PS1: `${chalk.magenta('🎼')} [${chalk.cyan(branchName)}] ${chalk.yellow('%~')} $ `,
              PROMPT: `${chalk.magenta('🎼')} [${chalk.cyan(branchName)}] ${chalk.yellow('%~')} $ `,
            }
          case 'fish':
            return {
              fish_prompt: `echo "${chalk.magenta('🎼')} [${chalk.cyan(branchName)}] ${chalk.yellow('(prompt_pwd)')} $ "`,
            }
          case 'bash':
          default:
            return {
              PS1: `${chalk.magenta('🎼')} [${chalk.cyan(branchName)}] ${chalk.yellow('\\W')} $ `,
            }
        }
      }
    } catch (error) {
      handleError(error, 'shell')
    }
  })
