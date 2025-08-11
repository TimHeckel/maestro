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
  getTopologicalOrder,
  displayOrchestrationSummary
} from '../utils/maestro.js'
import { OrchestraState, FeatureConfig } from '../types/orchestration.js'
import { GitWorktreeManager } from '../core/git.js'
import { t } from '../i18n/index.js'
import { detectPackageManager } from '../utils/packageManager.js'
import { execa } from 'execa'
import path from 'path'

export const implementCommand = new Command('implement')
  .description('Execute the orchestration plan from .maestro.json')
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
      
      // Load orchestration plan
      console.log(chalk.cyan('📖 Loading orchestration plan from .maestro.json...'))
      const config = await loadMaestroConfig()
      
      if (!config) {
        console.error(chalk.red('✖ No orchestration plan found. Run "mst plan" first.'))
        process.exit(1)
      }
      
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
        
        const order = getTopologicalOrder(config)
        console.log(chalk.cyan('\nExecution order:'))
        order.forEach((f, i) => console.log(chalk.gray(`  ${i + 1}. ${f}`)))
        
        console.log(chalk.cyan('\nWould create:'))
        for (const feature of config.features || []) {
          console.log(chalk.gray(`  - Worktree: ${feature.name}`))
          if (feature.sessions) {
            for (const session of feature.sessions) {
              const sessionName = `${feature.name}-${session.name}`.replace(/[^a-zA-Z0-9-]/g, '-')
              console.log(chalk.gray(`    - Session: ${sessionName} (${session.panes} panes)`))
            }
          }
        }
        return
      }
      
      console.log(chalk.cyan.bold('\n🎼 Starting Orchestration...\n'))
      
      // Get features in dependency order
      const featureOrder = getTopologicalOrder(config)
      const orderedFeatures = featureOrder
        .map(name => config.features?.find(f => f.name === name))
        .filter(f => f !== undefined) as NonNullable<typeof config.features>
      
      // Create worktrees
      const createSpinner = ora('Creating worktrees...').start()
      const worktreePaths = await createWorktrees(
        orderedFeatures,
        'main',  // Use main as default, features have their own base
        !options.sequential && (config.settings?.parallel ?? true)
      )
      createSpinner.succeed(`Created ${worktreePaths.size} worktrees`)
      
      // Install dependencies if needed
      if (!options.skipDeps) {
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
        const worktreePath = worktreePaths.get(feature.name)
        if (!worktreePath) continue
        
        const featureSessions: string[] = []
        
        if (feature.sessions) {
          for (const session of feature.sessions) {
            sessionSpinner.text = `Creating session ${feature.name}-${session.name}...`
            
            // Create tmux session
            const sessionName = await createTmuxSession(feature.name, session, worktreePath)
            featureSessions.push(sessionName)
            
            // Inject prompts
            await injectPrompts(sessionName, session.prompts)
          }
        }
        
        sessionMap.set(feature.name, featureSessions)
        
        // Customize CLAUDE.md if context provided
        if (feature.claudeContext || feature.agents) {
          await customizeClaudeMd(
            feature,
            worktreePath,
            'split'  // Default to split mode for orchestration
          )
        }
      }
      
      sessionSpinner.succeed('All tmux sessions created')
      
      // Save orchestration state
      const state: OrchestraState = {
        created_at: new Date().toISOString(),
        status: 'active',
        features: orderedFeatures.map(f => ({
          feature: f.name,
          worktree_path: worktreePaths.get(f.name) || '',
          status: 'created',
          created_at: new Date().toISOString(),
          sessions: (f.sessions || []).map(s => ({
            name: s.name,
            session_name: `${f.name}-${s.name}`.replace(/[^a-zA-Z0-9-]/g, '-'),
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