import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'
import { checkTmuxInstalled } from '../utils/orchestration.js'
import { 
  maestroExists, 
  saveMaestroConfig, 
  generateDefaultMaestroConfig,
  displayOrchestrationSummary 
} from '../utils/maestro.js'
import { FeatureConfig, SessionConfig } from '../types/orchestration.js'
import { t } from '../i18n/index.js'

export const planCommand = new Command('plan')
  .description('Plan an orchestrated development workflow / 開発ワークフローのオーケストレーションを計画')
  .option('-y, --yes', 'Skip confirmation prompts / 確認プロンプトをスキップ')
  .option('--example', 'Generate example MAESTRO.yml / サンプルMAESTRO.ymlを生成')
  .exitOverride()
  .action(async (options: { yes?: boolean; example?: boolean }) => {
    try {
      // Check tmux requirement
      if (!(await checkTmuxInstalled())) {
        console.error(chalk.red('✖ mst plan requires tmux. Install with: brew install tmux'))
        process.exit(1)
      }
      
      // Check if MAESTRO.yml already exists
      if (await maestroExists()) {
        if (!options.yes) {
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: 'MAESTRO.yml already exists. Overwrite?',
              default: false,
            },
          ])
          
          if (!overwrite) {
            console.log(chalk.yellow('Planning cancelled'))
            return
          }
        }
      }
      
      console.log(chalk.cyan.bold('🎼 Maestro Orchestration Planner\n'))
      
      // Generate example if requested
      if (options.example) {
        await generateExampleMaestro()
        return
      }
      
      // Interactive planning session
      const config = generateDefaultMaestroConfig()
      
      // Get orchestration description
      if (!options.yes) {
        const { description } = await inquirer.prompt([
          {
            type: 'input',
            name: 'description',
            message: 'Describe your orchestration plan:',
            default: 'Multi-feature development plan',
          },
        ])
        config.description = description
      }
      
      // Plan features
      const features: FeatureConfig[] = []
      let addMore = true
      
      while (addMore) {
        console.log(chalk.cyan(`\n📋 Feature ${features.length + 1}`))
        
        const feature = await planFeature(options.yes)
        features.push(feature)
        
        if (!options.yes) {
          const { continue: cont } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'continue',
              message: 'Add another feature?',
              default: features.length < 2,
            },
          ])
          addMore = cont
        } else {
          addMore = false
        }
      }
      
      config.orchestra = features
      
      // Configure settings
      if (!options.yes) {
        const { settings } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'settings',
            message: 'Configure advanced settings?',
            default: false,
          },
        ])
        
        if (settings) {
          config.settings = await configureSettings()
        }
      }
      
      // Save configuration
      const spinner = ora('Saving MAESTRO.yml...').start()
      await saveMaestroConfig(config)
      spinner.succeed('MAESTRO.yml saved')
      
      // Display summary
      displayOrchestrationSummary(config)
      
      console.log(chalk.green.bold('\n✨ Orchestration plan ready!'))
      console.log(chalk.cyan('Run'), chalk.white('mst implement'), chalk.cyan('to execute the plan'))
      
    } catch (error) {
      console.error(chalk.red('Planning failed:'), error)
      process.exit(1)
    }
  })

async function planFeature(skipPrompts?: boolean): Promise<FeatureConfig> {
  if (skipPrompts) {
    // Generate minimal feature for --yes mode
    return {
      feature: 'sample-feature',
      description: 'Sample feature',
      sessions: [
        {
          name: 'main',
          panes: 2,
          prompts: [
            '# Implement feature logic',
            'npm test --watch',
          ],
        },
      ],
    }
  }
  
  // Feature basic info
  const { feature, description, branchPrefix } = await inquirer.prompt([
    {
      type: 'input',
      name: 'feature',
      message: 'Feature name (alphanumeric with dashes):',
      validate: (input: string) => {
        if (!/^[a-zA-Z0-9-_]+$/.test(input)) {
          return 'Feature name must be alphanumeric with dashes/underscores'
        }
        return true
      },
    },
    {
      type: 'input',
      name: 'description',
      message: 'Feature description:',
      validate: (input: string) => input.length > 0 || 'Description is required',
    },
    {
      type: 'input',
      name: 'branchPrefix',
      message: 'Branch prefix (optional, e.g., "feature/"):',
      default: '',
    },
  ])
  
  // Plan sessions
  const sessions: SessionConfig[] = []
  const { sessionCount } = await inquirer.prompt([
    {
      type: 'number',
      name: 'sessionCount',
      message: 'How many tmux sessions for this feature?',
      default: 1,
      validate: (input: number) => input > 0 && input <= 5 || 'Between 1-5 sessions',
    },
  ])
  
  for (let i = 0; i < sessionCount; i++) {
    console.log(chalk.gray(`  Session ${i + 1}:`))
    
    const session = await planSession()
    sessions.push(session)
  }
  
  // Claude context
  const { addContext } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addContext',
      message: 'Add Claude-specific context for this feature?',
      default: true,
    },
  ])
  
  let claudeContext: string | undefined
  if (addContext) {
    const { context } = await inquirer.prompt([
      {
        type: 'editor',
        name: 'context',
        message: 'Enter Claude context (opens editor):',
        default: '## Implementation Guidelines\n\n- Use existing patterns\n- Follow project conventions\n',
      },
    ])
    claudeContext = context
  }
  
  // Agents
  const { useAgents } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useAgents',
      message: 'Assign Claude agents to this feature?',
      default: false,
    },
  ])
  
  let agents: string[] | undefined
  if (useAgents) {
    const { agentList } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'agentList',
        message: 'Select agents:',
        choices: [
          'code-reviewer',
          'security-scanner',
          'test-writer',
          'documentation-writer',
          'performance-analyzer',
        ],
      },
    ])
    agents = agentList
  }
  
  return {
    feature,
    description,
    branch_prefix: branchPrefix || undefined,
    sessions,
    claude_context: claudeContext,
    agents,
  }
}

async function planSession(): Promise<SessionConfig> {
  const { name, panes, layout } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: '    Session name:',
      default: 'main',
      validate: (input: string) => input.length > 0 || 'Name is required',
    },
    {
      type: 'number',
      name: 'panes',
      message: '    Number of panes:',
      default: 2,
      validate: (input: number) => input > 0 && input <= 10 || 'Between 1-10 panes',
    },
    {
      type: 'list',
      name: 'layout',
      message: '    Pane layout:',
      choices: [
        { name: 'Default', value: undefined },
        { name: 'Even Horizontal', value: 'even-horizontal' },
        { name: 'Even Vertical', value: 'even-vertical' },
        { name: 'Main Horizontal', value: 'main-horizontal' },
        { name: 'Main Vertical', value: 'main-vertical' },
        { name: 'Tiled', value: 'tiled' },
      ],
    },
  ])
  
  // Get prompts for each pane
  const prompts: string[] = []
  for (let i = 0; i < panes; i++) {
    const { prompt } = await inquirer.prompt([
      {
        type: 'input',
        name: 'prompt',
        message: `    Prompt for pane ${i + 1}:`,
        default: i === 0 ? '# Implement feature' : 'npm test --watch',
      },
    ])
    prompts.push(prompt)
  }
  
  return {
    name,
    panes,
    layout: layout || undefined,
    prompts,
  }
}

async function configureSettings() {
  return await inquirer.prompt([
    {
      type: 'confirm',
      name: 'parallel_creation',
      message: 'Create worktrees in parallel?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'auto_install_deps',
      message: 'Auto-install dependencies?',
      default: true,
    },
    {
      type: 'list',
      name: 'claude_md_mode',
      message: 'CLAUDE.md mode:',
      choices: [
        { name: 'Split (independent per worktree)', value: 'split' },
        { name: 'Shared (symlink to main)', value: 'shared' },
      ],
      default: 'split',
    },
    {
      type: 'input',
      name: 'base_branch',
      message: 'Base branch for worktrees:',
      default: 'main',
    },
  ])
}

async function generateExampleMaestro() {
  const example = {
    version: '1.0',
    created: new Date().toISOString(),
    description: 'Example orchestration for a full-stack feature',
    orchestra: [
      {
        feature: 'user-auth',
        description: 'Complete authentication system',
        branch_prefix: 'feature/',
        sessions: [
          {
            name: 'backend',
            panes: 3,
            layout: 'main-vertical',
            prompts: [
              '# Implement OAuth2 endpoints in /api/auth',
              'npm test --watch auth',
              'npm run dev',
            ],
          },
          {
            name: 'frontend',
            panes: 2,
            layout: 'even-horizontal',
            prompts: [
              '# Create login/signup React components',
              'npm test --watch',
            ],
          },
        ],
        claude_context: `## Authentication Implementation

- Use Passport.js for OAuth2
- Implement JWT with refresh tokens
- Add rate limiting
- Follow REST conventions`,
        agents: ['code-reviewer', 'security-scanner'],
      },
      {
        feature: 'payment',
        description: 'Stripe payment integration',
        branch_prefix: 'feature/',
        sessions: [
          {
            name: 'api',
            panes: 2,
            prompts: [
              '# Integrate Stripe checkout and webhooks',
              'npm run stripe:listen',
            ],
          },
        ],
        dependencies: ['user-auth'],
      },
    ],
    settings: {
      parallel_creation: true,
      auto_install_deps: true,
      claude_md_mode: 'split',
      base_branch: 'main',
    },
  }
  
  const spinner = ora('Generating example MAESTRO.yml...').start()
  await saveMaestroConfig(example)
  spinner.succeed('Example MAESTRO.yml created')
  
  displayOrchestrationSummary(example)
  
  console.log(chalk.green.bold('\n✨ Example orchestration ready!'))
  console.log(chalk.cyan('Review MAESTRO.yml and run'), chalk.white('mst implement'), chalk.cyan('to execute'))
}