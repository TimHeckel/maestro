import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import ora from 'ora'
import { detectPackageManager, type PackageManager } from '../utils/packageManager.js'
import { i18n, t, type Language } from '../i18n/index.js'

export interface InitOptions {
  minimal?: boolean
  packageManager?: PackageManager
  template?: string
  yes?: boolean
}

export interface ProjectType {
  name: string
  detected: boolean
  packageManager?: PackageManager
  setupCommands?: string[]
  syncFiles?: string[]
}

export const initCommand = new Command('init')
  .description('Initialize Maestro configuration for project / プロジェクトにMaestro設定を初期化')
  .option('-m, --minimal', 'Initialize with minimal configuration / ミニマル設定で初期化')
  .option(
    '-p, --package-manager <manager>',
    'Specify package manager (pnpm/npm/yarn/none) / パッケージマネージャーを指定'
  )
  .option('-t, --template <name>', 'Specify template / テンプレートを指定')
  .option('-y, --yes', 'Skip prompts and use defaults / プロンプトをスキップしてデフォルト値を使用')
  .exitOverride()
  .action(async (options: InitOptions) => {
    try {
      console.log(chalk.cyan('🎼 Welcome to Maestro Setup!\n'))

      // Language selection first (skip for --minimal or --yes)
      if (!options.yes && !options.minimal) {
        const { language } = await inquirer.prompt([
          {
            type: 'list',
            name: 'language',
            message: 'Select your preferred language / 使用する言語を選択してください',
            choices: [
              { name: 'English', value: 'en' },
              { name: '日本語 (Japanese)', value: 'ja' },
            ],
            default: i18n.getLanguage(),
          },
        ])
        i18n.setLanguage(language as Language)
      }

      // 既存の.maestro.jsonチェック
      const configPath = path.join(process.cwd(), '.maestro.json')
      if (existsSync(configPath)) {
        if (!options.yes) {
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: t('init.existingConfig'),
              default: false,
            },
          ])
          if (!overwrite) {
            console.log(chalk.yellow(t('init.configCancelled')))
            return
          }
        }
      }

      // プロジェクトタイプの検出
      const projectType = detectProjectType()
      console.log(
        chalk.gray(
          t('init.detectedProject', {
            type: projectType.name,
            status: projectType.detected ? t('init.detectedStatus') : t('init.noAutoDetect'),
          }) + '\n'
        )
      )

      let config: Record<string, unknown>

      if (options.minimal) {
        config = createMinimalConfig()
      } else if (options.yes) {
        config = createDefaultConfig(projectType, options.packageManager)
      } else {
        config = await createInteractiveConfig(projectType)
      }

      // 設定ファイルを書き込み
      const spinner = ora(t('init.creatingConfig')).start()
      try {
        writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
        spinner.succeed(t('init.configCreated'))
      } catch (error) {
        spinner.fail(t('init.configFailed'))
        throw error
      }

      // 使用方法の表示
      console.log(chalk.green('\n' + t('init.setupComplete') + '\n'))
      console.log(chalk.cyan(t('init.nextSteps')))
      console.log(chalk.gray('  ' + t('init.createCommand')))
      console.log(chalk.gray('  ' + t('init.listCommand')))
      console.log(chalk.gray('  ' + t('init.helpCommand')))

      const postCreate = config.postCreate as { commands?: string[] } | undefined
      if (postCreate?.commands && postCreate.commands.length > 0) {
        console.log(
          chalk.yellow('\n' + t('init.autoCommands', { commands: postCreate.commands.join(', ') }))
        )
      }
    } catch (error) {
      console.error(chalk.red(t('common.error') + ':'), error)
      process.exit(1)
    }
  })

export function detectProjectType(): ProjectType {
  const cwd = process.cwd()

  // package.jsonの存在確認とパッケージマネージャー検出
  if (existsSync(path.join(cwd, 'package.json'))) {
    const packageJson = JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf-8'))

    const packageManager = detectPackageManager(cwd)

    // プロジェクトタイプの判定
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }

    if (dependencies['next']) {
      return {
        name: 'Next.js',
        detected: true,
        packageManager,
        setupCommands: [`${packageManager} install`],
        syncFiles: ['.env', '.env.local', '.env.development.local'],
      }
    } else if (dependencies['react']) {
      return {
        name: 'React',
        detected: true,
        packageManager,
        setupCommands: [`${packageManager} install`],
        syncFiles: ['.env', '.env.local'],
      }
    } else if (dependencies['vue']) {
      return {
        name: 'Vue.js',
        detected: true,
        packageManager,
        setupCommands: [`${packageManager} install`],
        syncFiles: ['.env', '.env.local'],
      }
    } else {
      return {
        name: 'Node.js',
        detected: true,
        packageManager,
        setupCommands: [`${packageManager} install`],
        syncFiles: ['.env'],
      }
    }
  }

  // Pythonプロジェクト
  if (
    existsSync(path.join(cwd, 'requirements.txt')) ||
    existsSync(path.join(cwd, 'pyproject.toml'))
  ) {
    return {
      name: 'Python',
      detected: true,
      packageManager: 'none',
      setupCommands: ['pip install -r requirements.txt'],
      syncFiles: ['.env'],
    }
  }

  // Go プロジェクト
  if (existsSync(path.join(cwd, 'go.mod'))) {
    return {
      name: 'Go',
      detected: true,
      packageManager: 'none',
      setupCommands: ['go mod download'],
      syncFiles: ['.env'],
    }
  }

  return {
    name: 'Generic',
    detected: false,
    packageManager: 'none',
    setupCommands: [],
    syncFiles: ['.env'],
  }
}

export function createMinimalConfig() {
  return {
    language: i18n.getLanguage(),
    worktrees: {
      path: '.git/orchestra-members',
    },
    development: {
      autoSetup: true,
      defaultEditor: 'cursor',
    },
  }
}

export function createDefaultConfig(
  projectType: ProjectType,
  packageManager?: PackageManager
): Record<string, unknown> {
  let commands: string[] = []

  if (packageManager && packageManager !== 'none') {
    // 明示的にpackage managerが指定された場合は、それを使用
    commands = [`${packageManager} install`]
  } else if (projectType.setupCommands && projectType.setupCommands.length > 0) {
    // プロジェクトタイプに特有のsetupCommandsがある場合
    commands = projectType.setupCommands
  } else {
    // デフォルトまたは検出されたpackage managerを使用
    const pm = projectType.packageManager || 'npm'
    if (pm !== 'none') {
      commands = [`${pm} install`]
    }
  }

  return {
    language: i18n.getLanguage(),
    worktrees: {
      path: '.git/orchestra-members',
      branchPrefix: 'feature/',
    },
    development: {
      autoSetup: true,
      defaultEditor: 'cursor',
    },
    postCreate: {
      copyFiles: projectType.syncFiles || ['.env'],
      commands,
    },
    hooks: {
      beforeDelete:
        i18n.getLanguage() === 'ja'
          ? 'echo "演奏者を削除します: $ORCHESTRA_MEMBER"'
          : 'echo "Removing orchestra member: $ORCHESTRA_MEMBER"',
    },
  }
}

export async function createInteractiveConfig(
  projectType: ProjectType
): Promise<Record<string, unknown>> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'packageManager',
      message: t('init.prompts.packageManager'),
      choices: [
        { name: 'pnpm', value: 'pnpm' },
        { name: 'npm', value: 'npm' },
        { name: 'yarn', value: 'yarn' },
        { name: t('init.prompts.packageManagerNone'), value: 'none' },
      ],
      default: projectType.packageManager || 'pnpm',
    },
    {
      type: 'input',
      name: 'worktreePath',
      message: t('init.prompts.worktreePath'),
      default: '.git/orchestra-members',
    },
    {
      type: 'input',
      name: 'branchPrefix',
      message: t('init.prompts.branchPrefix'),
      default: 'feature/',
    },
    {
      type: 'list',
      name: 'defaultEditor',
      message: t('init.prompts.defaultEditor'),
      choices: [
        { name: 'Cursor', value: 'cursor' },
        { name: 'VS Code', value: 'vscode' },
        { name: 'Vim', value: 'vim' },
        { name: t('init.prompts.defaultEditorOther'), value: 'other' },
      ],
      default: 'cursor',
    },
    {
      type: 'confirm',
      name: 'autoSetup',
      message: t('init.prompts.autoSetup'),
      default: true,
    },
    {
      type: 'confirm',
      name: 'copyEnvFiles',
      message: t('init.prompts.copyEnvFiles'),
      default: true,
      when: answers => answers.autoSetup,
    },
    {
      type: 'input',
      name: 'syncFiles',
      message: t('init.prompts.syncFiles'),
      default: (projectType.syncFiles || ['.env']).join(', '),
      when: answers => answers.copyEnvFiles,
      filter: (input: string) =>
        input
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
    },
  ])

  const commands = []
  if (answers.autoSetup && answers.packageManager !== 'none') {
    commands.push(`${answers.packageManager} install`)
  }

  return {
    language: i18n.getLanguage(),
    worktrees: {
      path: answers.worktreePath,
      branchPrefix: answers.branchPrefix,
    },
    development: {
      autoSetup: answers.autoSetup,
      defaultEditor: answers.defaultEditor,
    },
    postCreate: {
      copyFiles: answers.syncFiles || [],
      commands,
    },
    hooks: {
      beforeDelete:
        i18n.getLanguage() === 'ja'
          ? 'echo "演奏者を削除します: $ORCHESTRA_MEMBER"'
          : 'echo "Removing orchestra member: $ORCHESTRA_MEMBER"',
    },
  }
}
