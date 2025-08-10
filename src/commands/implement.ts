import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { 
  checkTmuxInstalled,
  createWorktrees,
  createTmuxSession,
  injectPrompts,
  customizeClaudeMd,
  saveOrchestraState,
  displayImplementationSummary
} from '../utils/orchestration.js'
import { 
  loadMaestroConfig,
  validateDependencies,
  getFeatureOrder,
  displayOrchestrationSummary
} from '../utils/maestro.js'
import { OrchestraState } from '../types/orchestration.js'
import { GitWorktreeManager } from '../core/git.js'
import { t } from '../i18n/index.js'
import { detectPackageManager } from '../utils/packageManager.js'
import { execa } from 'execa'
import path from 'path'

export const implementCommand = new Command('implement')
  .description('Execute the orchestration plan from MAESTRO.yml / MAESTRO.ymlからオーケストレーションプランを実行')
  .option('--dry-run', 'Show what would be created without executing / 実行せずに作成内容を表示')
  .option('--skip-deps', 'Skip dependency installation / 依存関係のインストールをスキップ')
  .option('--sequential', 'Create features sequentially (not parallel) / 順次作成（並列ではなく）')
  .exitOverride()
  .action(async (options: { dryRun?: boolean; skipDeps?: boolean; sequential?: boolean }) => {
    try {
      // Check tmux requirement
      if (!(await checkTmuxInstalled())) {
        console.error(chalk.red('✖ mst implement requires tmux. Install with: brew install tmux'))
        process.exit(1)
      }
      
      // Check Git repository
      const manager = new GitWorktreeManager()
      if (!(await manager.isGitRepository())) {
        console.error(chalk.red('✖ Not in a Git repository'))
        process.exit(1)
      }
      
      // Load MAESTRO.yml
      console.log(chalk.cyan('📖 Loading MAESTRO.yml...'))
      const config = await loadMaestroConfig()
      
      // Validate dependencies
      const validation = validateDependencies(config)
      if (!validation.valid) {
        console.error(chalk.red('✖ Invalid dependencies:'))
        validation.errors.forEach(err => console.error(chalk.red(`  - ${err}`)))
        process.exit(1)
      }
      
      // Show plan summary
      displayOrchestrationSummary(config)
      
      if (options.dryRun) {
        console.log(chalk.yellow('\n📝 Dry run mode - no changes will be made'))
        
        const order = getFeatureOrder(config)
        console.log(chalk.cyan('\nExecution order:'))
        order.forEach((f, i) => console.log(chalk.gray(`  ${i + 1}. ${f}`)))
        
        console.log(chalk.cyan('\nWould create:'))
        for (const feature of config.orchestra) {
          console.log(chalk.gray(`  - Worktree: ${feature.feature}`))
          for (const session of feature.sessions) {
            const sessionName = `${feature.feature}-${session.name}`.replace(/[^a-zA-Z0-9-]/g, '-')
            console.log(chalk.gray(`    - Session: ${sessionName} (${session.panes} panes)`))
          }
        }
        return
      }
      
      console.log(chalk.cyan.bold('\n🎼 Starting Orchestration...\n'))
      
      // Get features in dependency order
      const featureOrder = getFeatureOrder(config)
      const orderedFeatures = featureOrder.map(name => 
        config.orchestra.find(f => f.feature === name)!
      )
      
      // Create worktrees
      const createSpinner = ora('Creating worktrees...').start()
      const worktreePaths = await createWorktrees(
        orderedFeatures,
        config.settings?.base_branch || 'main',
        !options.sequential && (config.settings?.parallel_creation ?? true)
      )
      createSpinner.succeed(`Created ${worktreePaths.size} worktrees`)
      
      // Install dependencies if needed
      if (!options.skipDeps && config.settings?.auto_install_deps) {
        const depSpinner = ora('Installing dependencies...').start()
        
        for (const [feature, worktreePath] of worktreePaths) {
          const packageManager = detectPackageManager(worktreePath)
          if (packageManager) {
            try {
              await execa(packageManager, ['install'], {
                cwd: worktreePath,
                stdio: 'ignore',
              })
              depSpinner.text = `Installed dependencies for ${feature}`
            } catch (error) {
              console.warn(chalk.yellow(`  ⚠ Failed to install deps for ${feature}`))
            }
          }
        }
        
        depSpinner.succeed('Dependencies installed')
      }
      
      // Create tmux sessions and inject prompts
      const sessionMap = new Map<string, string[]>()
      const sessionSpinner = ora('Creating tmux sessions...').start()
      
      for (const feature of orderedFeatures) {
        const worktreePath = worktreePaths.get(feature.feature)
        if (!worktreePath) continue
        
        const featureSessions: string[] = []
        
        for (const session of feature.sessions) {
          sessionSpinner.text = `Creating session ${feature.feature}-${session.name}...`
          
          // Create tmux session
          const sessionName = await createTmuxSession(feature.feature, session, worktreePath)
          featureSessions.push(sessionName)
          
          // Inject prompts
          await injectPrompts(sessionName, session.prompts)
        }
        
        sessionMap.set(feature.feature, featureSessions)
        
        // Customize CLAUDE.md
        await customizeClaudeMd(
          feature,
          worktreePath,
          config.settings?.claude_md_mode || 'split'
        )
      }
      
      sessionSpinner.succeed('All tmux sessions created')
      
      // Save orchestration state
      const state: OrchestraState = {
        created_at: new Date().toISOString(),
        status: 'active',
        features: orderedFeatures.map(f => ({
          feature: f.feature,
          worktree_path: worktreePaths.get(f.feature) || '',
          status: 'created',
          created_at: new Date().toISOString(),
          sessions: f.sessions.map(s => ({
            name: s.name,
            session_name: `${f.feature}-${s.name}`.replace(/[^a-zA-Z0-9-]/g, '-'),
            panes: s.panes,
            status: 'created',
            attached_count: 0,
          })),
        })),
      }
      
      await saveOrchestraState(state)
      
      // Display summary
      displayImplementationSummary(orderedFeatures, worktreePaths, sessionMap)
      
    } catch (error) {
      console.error(chalk.red('Implementation failed:'), error)
      process.exit(1)
    }
  })