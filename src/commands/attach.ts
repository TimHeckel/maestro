import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { GitWorktreeManager } from '../core/git.js'
import { execa } from 'execa'
import { spawn } from 'child_process'
import { detectPackageManager } from '../utils/packageManager.js'
import { t } from '../i18n/index.js'

// Get available branches
async function getAvailableBranches(
  gitManager: GitWorktreeManager,
  includeRemote: boolean
): Promise<string[]> {
  const branches = await gitManager.getAllBranches()
  const worktrees = await gitManager.listWorktrees()
  const attachedBranches = worktrees
    .map(wt => wt.branch?.replace('refs/heads/', ''))
    .filter(Boolean)

  let availableBranches = branches.local.filter(b => !attachedBranches.includes(b))

  if (includeRemote) {
    const remoteAvailable = branches.remote.filter(
      b => !attachedBranches.includes(b.split('/').slice(1).join('/'))
    )
    availableBranches = [...availableBranches, ...remoteAvailable]
  }

  return availableBranches
}

// Select branch
async function selectBranch(availableBranches: string[]): Promise<string> {
  const { selectedBranch } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedBranch',
      message: t('attach.selectBranch'),
      choices: availableBranches.map(branch => ({
        name: branch.includes('origin/')
          ? `${chalk.yellow('[remote]')} ${chalk.cyan(branch)}`
          : `${chalk.green('[local]')} ${chalk.cyan(branch)}`,
        value: branch,
      })),
      pageSize: 15,
    },
  ])
  return selectedBranch
}

// Validate branch exists
function validateBranchExists(branchName: string, availableBranches: string[]): void {
  if (!availableBranches.includes(branchName)) {
    console.error(chalk.red(t('attach.branchNotFound', { branch: branchName })))

    const similarBranches = availableBranches.filter(b => b.includes(branchName))
    if (similarBranches.length > 0) {
      console.log(chalk.yellow(t('attach.availableBranches')))
      similarBranches.forEach(branch => {
        console.log(`  - ${chalk.cyan(branch)}`)
      })
    }

    process.exit(1)
  }
}

// Setup environment
async function setupEnvironment(worktreePath: string): Promise<void> {
  const packageManager = detectPackageManager(worktreePath)
  const setupSpinner = ora(t('attach.settingUpEnvironment')).start()

  try {
    await execa(packageManager, ['install'], { cwd: worktreePath })
    setupSpinner.succeed(t('attach.setupComplete', { manager: packageManager }))
  } catch {
    setupSpinner.warn(t('attach.setupSkipped', { manager: packageManager }))
  }
}

// Open in editor
async function openInEditor(worktreePath: string): Promise<void> {
  const openSpinner = ora(t('attach.openingInEditor')).start()
  try {
    await execa('cursor', [worktreePath])
    openSpinner.succeed(t('attach.openedInCursor'))
  } catch {
    try {
      await execa('code', [worktreePath])
      openSpinner.succeed(t('attach.openedInVSCode'))
    } catch {
      openSpinner.warn(t('attach.editorNotFound'))
    }
  }
}

export const attachCommand = new Command('attach')
  .alias('a')
  .description(t('attach.summoning'))
  .argument('[branch-name]', t('shell.branchNameArg'))
  .option('-r, --remote', 'Include remote branches')
  .option('-f, --fetch', 'Fetch first')
  .option('-o, --open', 'Open in VSCode/Cursor')
  .option('-s, --setup', 'Run environment setup')
  .option('--shell', 'Enter shell after attach')
  .option('--exec <command>', 'Execute command after attach')
  .exitOverride()
  .action(
    async (
      branchName?: string,
      options: {
        remote?: boolean
        fetch?: boolean
        open?: boolean
        setup?: boolean
        shell?: boolean
        exec?: string
      } = {}
    ) => {
      const spinner = ora(t('attach.orchestration')).start()

      try {
        const gitManager = new GitWorktreeManager()

        // Check if Git repository
        const isGitRepo = await gitManager.isGitRepository()
        if (!isGitRepo) {
          spinner.fail(t('errors.notGitRepo'))
          process.exit(1)
        }

        if (options?.fetch) {
          spinner.text = t('attach.fetchingLatest')
          await gitManager.fetchAll()
        }

        spinner.text = t('attach.fetchingBranches')
        const availableBranches = await getAvailableBranches(gitManager, options?.remote || false)

        if (availableBranches.length === 0) {
          spinner.fail(t('attach.noAvailableBranches'))
          console.log(chalk.yellow(t('attach.allBranchesAttached')))
          process.exit(0)
        }

        spinner.stop()

        if (!branchName) {
          branchName = await selectBranch(availableBranches)
        } else {
          validateBranchExists(branchName, availableBranches)
        }

        spinner.start(t('attach.summoningMember'))

        // Create worktree
        const worktreePath = await gitManager.attachWorktree(branchName || '')

        spinner.succeed(
          t('attach.memberSummoned', { branch: chalk.cyan(branchName), path: chalk.gray(worktreePath) })
        )

        if (options?.setup) {
          await setupEnvironment(worktreePath)
        }

        if (options?.open) {
          await openInEditor(worktreePath)
        }

        // --exec option handling
        if (options?.exec) {
          console.log(chalk.cyan(t('attach.executingCommand', { command: options.exec })))
          try {
            await execa(options.exec, [], {
              cwd: worktreePath,
              shell: true,
              stdio: 'inherit',
            })
          } catch (error) {
            console.error(
              chalk.red(
                t('attach.commandFailed', { error: error instanceof Error ? error.message : t('errors.general') })
              )
            )
            process.exit(1)
          }
        }

        // --shell option handling
        if (options?.shell) {
          console.log(chalk.cyan(t('attach.enteringShell')))
          const shell = process.env.SHELL || '/bin/bash'
          const child = spawn(shell, [], {
            cwd: worktreePath,
            stdio: 'inherit',
            env: {
              ...process.env,
              MAESTRO: '1',
              MAESTRO_NAME: branchName || '',
              MAESTRO_PATH: worktreePath,
            },
          })

          child.on('exit', () => {
            console.log(chalk.gray(t('attach.exitedShell')))
          })

          // Wait for process to exit
          await new Promise<void>(resolve => {
            child.on('exit', resolve)
          })
        }

        if (!options?.shell && !options?.exec) {
          console.log(chalk.green(t('attach.summonComplete')))
          console.log(chalk.gray(t('attach.moveToDirectory', { path: worktreePath })))
        }
      } catch (error) {
        spinner.fail(t('attach.memberNotSummoned'))
        console.error(chalk.red(error instanceof Error ? error.message : t('errors.general')))
        process.exit(1)
      }
    }
  )
