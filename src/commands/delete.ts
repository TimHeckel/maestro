import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { GitWorktreeManager } from '../core/git.js'
import { DeleteOptions, Worktree } from '../types/index.js'
import { execa } from 'execa'
import { spawn } from 'child_process'
import { ConfigManager, Config } from '../core/config.js'
import { formatPath } from '../utils/path.js'
import { t } from '../i18n/index.js'

// エラークラス
class DeleteCommandError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeleteCommandError'
  }
}

// ディレクトリサイズをフォーマットする関数
export function formatDirectorySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// worktree表示文字列を作成する関数
export function createWorktreeDisplay(worktree: Worktree): string {
  let display = worktree.branch || worktree.head

  if (worktree.locked) {
    display = `🔒 ${display}`
  }

  if (worktree.detached) {
    display = `⚠️  ${display} (detached)`
  }

  return display
}

// ディレクトリサイズを取得する関数
export async function getDirectorySize(dirPath: string): Promise<string> {
  try {
    const { stdout } = await execa('du', ['-sh', dirPath])
    const size = stdout.split('\t')[0]
    return size || 'unknown'
  } catch {
    return 'unknown'
  }
}

// Delete remote branch
export async function deleteRemoteBranch(branchName: string): Promise<void> {
  const remoteSpinner = ora(t('delete.remoteBranchDeleting')).start()

  try {
    // Check if remote branch exists
    const { stdout: remoteBranches } = await execa('git', ['branch', '-r'])
    const remoteBranchName = `origin/${branchName}`

    if (!remoteBranches.includes(remoteBranchName)) {
      remoteSpinner.warn(t('delete.remoteBranchNotFound', { branch: remoteBranchName }))
      return
    }

    // Delete remote branch
    await execa('git', ['push', 'origin', '--delete', branchName])
    remoteSpinner.succeed(t('delete.remoteBranchDeleted', { branch: chalk.cyan(remoteBranchName) }))
  } catch (error) {
    remoteSpinner.fail(t('delete.remoteBranchFailed'))
    throw new DeleteCommandError(error instanceof Error ? error.message : t('errors.general'))
  }
}

// Prepare worktree selection
export function prepareWorktreeSelection(
  worktrees: Worktree[],
  branchName?: string,
  options: { fzf?: boolean; current?: boolean } = {}
): {
  filteredWorktrees: Worktree[]
  needsInteractiveSelection: boolean
} {
  const orchestraMembers = worktrees.filter(wt => !wt.path.endsWith('.'))

  if (orchestraMembers.length === 0) {
    return { filteredWorktrees: [], needsInteractiveSelection: false }
  }

  // Delete current worktree
  if (options.current) {
    const currentWorktree = orchestraMembers.find(wt => process.cwd().startsWith(wt.path))
    if (currentWorktree) {
      return { filteredWorktrees: [currentWorktree], needsInteractiveSelection: false }
    }
  }

  // Branch name specified
  if (branchName && !options.fzf) {
    // Check wildcard pattern
    if (branchName.includes('*')) {
      // Convert pattern to regex
      const pattern = branchName
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special characters
        .replace(/\*/g, '.*') // Replace * with .*
      const regex = new RegExp(`^(refs/heads/)?${pattern}$`)

      const matchedWorktrees = orchestraMembers.filter(wt => {
        const branch = wt.branch || ''
        return regex.test(branch) || regex.test(branch.replace('refs/heads/', ''))
      })

      if (matchedWorktrees.length > 0) {
        return { filteredWorktrees: matchedWorktrees, needsInteractiveSelection: false }
      }
    } else {
      // Normal exact match
      const targetWorktree = orchestraMembers.find(
        wt => wt.branch === branchName || wt.branch === `refs/heads/${branchName}`
      )
      if (targetWorktree) {
        return { filteredWorktrees: [targetWorktree], needsInteractiveSelection: false }
      }
    }
  }

  // Need fzf or interactive selection
  return {
    filteredWorktrees: orchestraMembers,
    needsInteractiveSelection: true,
  }
}

// Validate worktree deletion safety
export function validateWorktreeDeletion(
  worktree: Worktree,
  options: { force?: boolean } = {}
): {
  isValid: boolean
  warnings: string[]
  requiresConfirmation: boolean
} {
  const warnings: string[] = []
  let requiresConfirmation = false

  // Check if locked
  if (worktree.locked) {
    warnings.push(`Worktree is locked: ${worktree.path}`)
  }

  // Check if prunable
  if (worktree.prunable) {
    warnings.push(`Prunable worktree: ${worktree.path}`)
  }

  // Require confirmation if no force flag
  if (!options.force && warnings.length > 0) {
    requiresConfirmation = true
  }

  return {
    isValid: true,
    warnings,
    requiresConfirmation,
  }
}

// Execute worktree deletion
export async function executeWorktreeDeletion(
  gitManager: GitWorktreeManager,
  worktree: Worktree,
  options: { force?: boolean; removeRemote?: boolean } = {}
): Promise<{ success: boolean; branchName?: string }> {
  try {
    // Get branch name
    const branchName = worktree.branch?.replace('refs/heads/', '') || worktree.branch

    // Delete worktree
    await gitManager.deleteWorktree(branchName!, options.force)

    return { success: true, branchName }
  } catch (error) {
    throw new DeleteCommandError(error instanceof Error ? error.message : t('errors.general'))
  }
}

// Check if current directory is in specified worktree
export function isCurrentDirectoryInWorktree(worktreePath: string): boolean {
  const currentDir = process.cwd()
  return currentDir.startsWith(worktreePath)
}

// Select worktrees with fzf
async function selectWorktreesWithFzf(
  filteredWorktrees: Worktree[],
  options: { force?: boolean } = {}
): Promise<Worktree[]> {
  const fzfInput = filteredWorktrees
    .map(w => {
      const status = []
      if (w.locked) status.push(chalk.red(t('delete.locked')))
      if (w.prunable) status.push(chalk.yellow(t('delete.prunable')))

      const statusStr = status.length > 0 ? ` [${status.join(', ')}]` : ''
      const branch = w.branch?.replace('refs/heads/', '') || w.branch
      return `${branch}${statusStr} | ${w.path}`
    })
    .join('\n')

  const fzfProcess = spawn(
    'fzf',
    [
      '--ansi',
      '--multi',
      '--header=退場させる演奏者を選択 (Tab で複数選択, Ctrl-C でキャンセル)',
      '--preview',
      'echo {} | cut -d"|" -f2 | xargs ls -la',
      '--preview-window=right:50%:wrap',
    ],
    {
      stdio: ['pipe', 'pipe', 'inherit'],
    }
  )

  fzfProcess.stdin.write(fzfInput)
  fzfProcess.stdin.end()

  let selected = ''
  fzfProcess.stdout.on('data', data => {
    selected += data.toString()
  })

  return new Promise<Worktree[]>((resolve, reject) => {
    fzfProcess.on('close', async code => {
      if (code !== 0 || !selected.trim()) {
        reject(new DeleteCommandError('キャンセルされました'))
        return
      }

      const selectedBranches = selected
        .trim()
        .split('\n')
        .map(line =>
          line
            .split('|')[0]
            ?.trim()
            .replace(/\[.*\]/, '')
            .trim()
        )
        .filter(Boolean)

      const targetWorktrees = filteredWorktrees.filter((wt: Worktree) => {
        const branch = wt.branch?.replace('refs/heads/', '')
        return selectedBranches.includes(branch)
      })

      // --forceオプションがない場合は最終確認プロンプトを表示
      if (!options.force && targetWorktrees.length > 0) {
        console.log(chalk.yellow('\n⚠️  以下の選択したworktreeを本当に削除しますか？'))
        targetWorktrees.forEach(wt => {
          const branch = wt.branch?.replace('refs/heads/', '') || wt.branch
          console.log(`  ${chalk.green('✅')} ${chalk.cyan(branch)}`)
        })

        const { confirmDelete } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmDelete',
            message: '削除を実行しますか？',
            default: false,
          },
        ])

        if (!confirmDelete) {
          reject(new DeleteCommandError('キャンセルされました'))
          return
        }
      }

      resolve(targetWorktrees)
    })
  })
}

// 削除対象のワークツリーを決定
async function determineTargetWorktrees(
  filteredWorktrees: Worktree[],
  needsInteractiveSelection: boolean,
  branchName?: string,
  options: { fzf?: boolean; force?: boolean } = {}
): Promise<Worktree[]> {
  if (!needsInteractiveSelection) {
    return filteredWorktrees
  }

  if (options.fzf && !branchName) {
    return selectWorktreesWithFzf(filteredWorktrees, options)
  }

  if (branchName) {
    if (branchName.includes('*')) {
      if (filteredWorktrees.length === 0) {
        throw new DeleteCommandError('指定されたパターンに一致する演奏者が見つかりません')
      }
      return filteredWorktrees
    } else {
      const targetWorktree = filteredWorktrees.find(wt => {
        const branch = wt.branch?.replace('refs/heads/', '')
        return branch === branchName || wt.branch === branchName
      })

      if (!targetWorktree) {
        const similarBranches = filteredWorktrees
          .filter(wt => wt.branch && wt.branch.includes(branchName))
          .map(wt => wt.branch?.replace('refs/heads/', '') || wt.branch)

        if (similarBranches.length > 0) {
          console.log(chalk.yellow('\n類似した演奏者:'))
          similarBranches.forEach(branch => {
            console.log(`  - ${chalk.cyan(branch)}`)
          })
        }

        throw new DeleteCommandError('指定された演奏者が見つかりません')
      }

      return [targetWorktree]
    }
  }

  throw new DeleteCommandError('削除対象を指定してください')
}

// 削除対象の詳細を表示
async function displayDeletionDetails(targetWorktrees: Worktree[], config: Config): Promise<void> {
  console.log(chalk.bold('\n🪽  退場対象の演奏者:\n'))

  const deletionDetails = await Promise.all(
    targetWorktrees.map(async wt => {
      const branch = wt.branch?.replace('refs/heads/', '') || wt.branch
      const size = await getDirectorySize(wt.path)
      return { worktree: wt, branch, size }
    })
  )

  deletionDetails.forEach(({ branch, size, worktree }) => {
    const displayPath = formatPath(worktree.path, config)
    console.log(
      `  ${chalk.cyan(branch || 'unknown')} ${chalk.gray(`(${size})`)} - ${chalk.gray(displayPath)}`
    )
    if (worktree.locked) {
      console.log(`    ${chalk.red('⚠️  ロックされています')}: ${worktree.reason || '理由不明'}`)
    }
  })

  console.log(chalk.gray(`\n合計: ${targetWorktrees.length} 名の演奏者`))
}

// 削除実行
async function executeWorktreesDeletion(
  targetWorktrees: Worktree[],
  gitManager: GitWorktreeManager,
  options: { force?: boolean; removeRemote?: boolean; keepSession?: boolean } = {}
): Promise<void> {
  const results: { branch: string; status: 'success' | 'failed'; error?: string }[] = []

  for (const worktree of targetWorktrees) {
    const branch = worktree.branch?.replace('refs/heads/', '') || worktree.branch || 'unknown'
    const deleteSpinner = ora(`演奏者 '${chalk.cyan(branch)}' が退場中...`).start()

    try {
      await gitManager.deleteWorktree(
        worktree.branch?.replace('refs/heads/', '') || '',
        options.force
      )
      deleteSpinner.succeed(`演奏者 '${chalk.cyan(branch)}' が退場しました`)

      if (options.removeRemote && worktree.branch) {
        await deleteRemoteBranch(worktree.branch.replace('refs/heads/', ''))
      }

      // tmuxセッションの削除
      if (!options.keepSession) {
        try {
          // create.tsと同じ正規化ロジックを適用
          const tmuxSessionName = branch.replace(/[^a-zA-Z0-9_-]/g, '-')
          // tmuxセッションが存在するかチェック
          await execa('tmux', ['has-session', '-t', tmuxSessionName])
          // 存在する場合は削除
          await execa('tmux', ['kill-session', '-t', tmuxSessionName])
          console.log(`  ${chalk.gray(`tmuxセッション '${tmuxSessionName}' を削除しました`)}`)
        } catch {
          // セッションが存在しない場合は何もしない
        }
      }

      results.push({ branch, status: 'success' })
    } catch (error) {
      deleteSpinner.fail(`演奏者 '${chalk.cyan(branch)}' が退場できませんでした`)
      results.push({
        branch,
        status: 'failed',
        error: error instanceof Error ? error.message : '不明なエラー',
      })
    }
  }

  // 結果サマリー
  console.log(chalk.bold('\n🎼 退場結果:\n'))

  const successCount = results.filter(r => r.status === 'success').length
  const failedCount = results.filter(r => r.status === 'failed').length

  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : '❌'
    const statusText = result.status === 'success' ? chalk.green('成功') : chalk.red('失敗')

    console.log(`${icon} ${chalk.cyan(result.branch)} - ${statusText}`)
    if (result.error) {
      console.log(`   ${chalk.red(result.error)}`)
    }
  })

  console.log(chalk.gray(`\n合計: ${successCount} 成功, ${failedCount} 失敗`))

  if (successCount > 0) {
    const message =
      successCount === 1 ? '1名の演奏者が退場しました' : `${successCount}名の演奏者が退場しました`
    console.log(chalk.green(`\n✨ ${message}`))
  }
}

export const deleteCommand = new Command('delete')
  .alias('rm')
  .description('演奏者（worktree）が退場')
  .argument('[branch-name]', '削除するブランチ名（ワイルドカード使用可: feature/demo-*）')
  .option('-f, --force', '強制削除')
  .option('-r, --remove-remote', 'リモートブランチも削除')
  .option('--keep-session', 'tmuxセッションを保持')
  .option('--fzf', 'fzfで選択（複数選択可）')
  .option('--current', '現在のworktreeを削除')
  .exitOverride()
  .action(
    async (
      branchName?: string,
      options: DeleteOptions & { fzf?: boolean; current?: boolean; keepSession?: boolean } = {}
    ) => {
      const spinner = ora('演奏者を確認中...').start()

      try {
        const gitManager = new GitWorktreeManager()
        const configManager = new ConfigManager()
        await configManager.loadProjectConfig()
        const config = configManager.getAll()

        // Gitリポジトリかチェック
        const isGitRepo = await gitManager.isGitRepository()
        if (!isGitRepo) {
          throw new DeleteCommandError('このディレクトリはGitリポジトリではありません')
        }

        // ワークツリー一覧を取得
        const worktrees = await gitManager.listWorktrees()
        const { filteredWorktrees, needsInteractiveSelection } = prepareWorktreeSelection(
          worktrees,
          branchName,
          options
        )

        if (filteredWorktrees.length === 0) {
          spinner.fail('演奏者が存在しません')
          return
        }

        if (options.fzf && !branchName) {
          spinner.stop()
        }

        const targetWorktrees = await determineTargetWorktrees(
          filteredWorktrees,
          needsInteractiveSelection,
          branchName,
          options
        )

        if (options.fzf && !branchName) {
          spinner.start()
        }

        spinner.stop()

        // 削除対象のworktree内から削除しようとしているかチェック
        for (const worktree of targetWorktrees) {
          if (isCurrentDirectoryInWorktree(worktree.path)) {
            throw new DeleteCommandError(
              `現在のディレクトリが削除対象のworktree内にあります。\n` +
                `別のディレクトリから実行してください。\n` +
                `例: cd .. && mst delete ${worktree.branch?.replace('refs/heads/', '') || branchName}`
            )
          }
        }

        await displayDeletionDetails(targetWorktrees, config)

        // fzf使用時は selectWorktreesWithFzf 内で確認済み、そうでなければここで確認
        if (!options.force && !(options.fzf && !branchName)) {
          const { confirmDelete } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmDelete',
              message: chalk.yellow('本当に演奏者を退場させますか？'),
              default: false,
            },
          ])

          if (!confirmDelete) {
            console.log(chalk.gray('キャンセルされました'))
            return
          }
        }

        console.log()
        await executeWorktreesDeletion(targetWorktrees, gitManager, options)
      } catch (error) {
        spinner.fail('エラーが発生しました')
        if (error instanceof DeleteCommandError) {
          console.error(chalk.red(error.message))
          process.exitCode = 1
        } else {
          console.error(chalk.red(error instanceof Error ? error.message : '不明なエラー'))
          process.exitCode = 1
        }
      }
    }
  )
