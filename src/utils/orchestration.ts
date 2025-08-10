import { execa } from 'execa'
import chalk from 'chalk'
import path from 'path'
import { writeFile, appendFile, mkdir, readFile } from 'fs/promises'
import { GitWorktreeManager } from '../core/git.js'
import { ConfigManager } from '../core/config.js'
import { FeatureConfig, MaestroConfig, SessionConfig } from '../types/orchestration.js'
import { OrchestraState, FeatureState, SessionState } from '../types/orchestration.js'
import ora from 'ora'
import { t } from '../i18n/index.js'

// Check if tmux is installed
export async function checkTmuxInstalled(): Promise<boolean> {
  try {
    await execa('tmux', ['-V'])
    return true
  } catch {
    return false
  }
}

// Generate tmux session name from feature and session
export function getSessionName(feature: string, session: string): string {
  return `${feature}-${session}`.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 30)
}

// Create tmux session with configured panes
export async function createTmuxSession(
  feature: string,
  session: SessionConfig,
  worktreePath: string
): Promise<string> {
  const sessionName = getSessionName(feature, session.name)
  const shell = process.env.SHELL || '/bin/bash'
  
  // Check if session already exists
  try {
    await execa('tmux', ['has-session', '-t', sessionName])
    console.log(chalk.yellow(`  Session ${sessionName} already exists, skipping...`))
    return sessionName
  } catch {
    // Session doesn't exist, create it
  }
  
  // Create detached tmux session
  await execa('tmux', [
    'new-session',
    '-d',
    '-s', sessionName,
    '-c', worktreePath,
    shell, '-l'
  ])
  
  // Create additional panes
  for (let i = 1; i < session.panes; i++) {
    const splitArgs = [
      'split-window',
      '-t', sessionName,
      '-c', worktreePath
    ]
    
    // Alternate between horizontal and vertical splits for better layout
    if (session.layout === 'even-horizontal' || session.layout === 'main-horizontal') {
      splitArgs.push('-h')
    } else if (session.layout === 'even-vertical' || session.layout === 'main-vertical') {
      splitArgs.push('-v')
    } else if (i % 2 === 0) {
      splitArgs.push('-h')
    } else {
      splitArgs.push('-v')
    }
    
    splitArgs.push(shell, '-l')
    await execa('tmux', splitArgs)
  }
  
  // Apply layout if specified
  if (session.layout) {
    await execa('tmux', ['select-layout', '-t', sessionName, session.layout])
  }
  
  // Set window name
  await execa('tmux', ['rename-window', '-t', sessionName, session.name])
  
  return sessionName
}

// Inject prompts into tmux panes
export async function injectPrompts(
  sessionName: string,
  prompts: string[]
): Promise<void> {
  for (let i = 0; i < prompts.length; i++) {
    const target = `${sessionName}:0.${i}`
    const prompt = prompts[i]
    
    if (!prompt) continue
    
    // Clear any existing text (send Ctrl+C to cancel any running command)
    await execa('tmux', ['send-keys', '-t', target, 'C-c'])
    
    // Small delay to ensure the pane is ready
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Send the prompt text
    await execa('tmux', ['send-keys', '-t', target, prompt])
    
    // Add execution hint (without pressing Enter)
    await execa('tmux', ['send-keys', '-t', target, ' # [Press Enter to execute]'])
  }
}

// Create customized CLAUDE.md for worktree
export async function customizeClaudeMd(
  feature: FeatureConfig,
  worktreePath: string,
  mode: 'shared' | 'split' = 'split'
): Promise<void> {
  const claudePath = path.join(worktreePath, 'CLAUDE.md')
  
  const orchestrationContext = `

## Orchestration Context

This worktree is part of an orchestrated development plan.

**Feature**: ${feature.feature}
**Description**: ${feature.description}

${feature.claude_context || ''}

### Sessions and Tasks
${feature.sessions.map(s => `
- **${s.name}** (${s.panes} panes):
${s.prompts.map((p, i) => `  - Pane ${i}: ${p.split('\n')[0]}`).join('\n')}
`).join('\n')}

${feature.agents && feature.agents.length > 0 ? `
### Assigned Agents
${feature.agents.map(a => `- ${a}`).join('\n')}

Use these agents via the /agents command when appropriate.
` : ''}

${feature.dependencies && feature.dependencies.length > 0 ? `
### Dependencies
This feature depends on: ${feature.dependencies.join(', ')}
Ensure these are completed first or coordinate with their implementations.
` : ''}

---
*See MAESTRO.yml in the main branch for the complete orchestration plan.*
`
  
  if (mode === 'split') {
    // Create new CLAUDE.md with orchestration context
    const content = `# ${feature.feature} - Claude Code Instructions

${orchestrationContext}

## Implementation Guidelines

Add your specific implementation notes here.
`
    await writeFile(claudePath, content)
  } else {
    // Append to existing CLAUDE.md
    await appendFile(claudePath, orchestrationContext)
  }
}

// Create all worktrees for features
export async function createWorktrees(
  features: FeatureConfig[],
  baseBranch: string = 'main',
  parallel: boolean = true
): Promise<Map<string, string>> {
  const manager = new GitWorktreeManager()
  const worktreePaths = new Map<string, string>()
  
  const createWorktree = async (feature: FeatureConfig) => {
    const branchName = feature.branch_prefix 
      ? `${feature.branch_prefix}${feature.feature}`
      : feature.feature
    
    try {
      const worktreePath = await manager.createWorktree(branchName, baseBranch)
      worktreePaths.set(feature.feature, worktreePath)
      console.log(chalk.green(`  ✓ Created worktree for ${feature.feature}`))
    } catch (error) {
      console.error(chalk.red(`  ✗ Failed to create worktree for ${feature.feature}: ${error}`))
      throw error
    }
  }
  
  if (parallel) {
    await Promise.all(features.map(createWorktree))
  } else {
    for (const feature of features) {
      await createWorktree(feature)
    }
  }
  
  return worktreePaths
}

// Save orchestration state
export async function saveOrchestraState(state: OrchestraState): Promise<void> {
  const stateDir = '.maestro'
  const statePath = path.join(stateDir, 'orchestra.state.json')
  
  await mkdir(stateDir, { recursive: true })
  await writeFile(statePath, JSON.stringify(state, null, 2))
}

// Load orchestration state
export async function loadOrchestraState(): Promise<OrchestraState | null> {
  try {
    const statePath = path.join('.maestro', 'orchestra.state.json')
    const content = await readFile(statePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

// Get tmux session status
export async function getTmuxSessionStatus(sessionName: string): Promise<'active' | 'inactive' | 'not-found'> {
  try {
    const { stdout } = await execa('tmux', [
      'list-sessions',
      '-F', '#{session_name}:#{session_attached}',
    ])
    
    const sessions = stdout.split('\n').filter(Boolean)
    const session = sessions.find(s => s.startsWith(`${sessionName}:`))
    
    if (!session) return 'not-found'
    
    const [, attached] = session.split(':')
    return attached === '1' ? 'active' : 'inactive'
  } catch {
    return 'not-found'
  }
}

// Create an orchestra session (wrapper for compatibility)
export async function createOrchestraSession(
  feature: FeatureConfig,
  options: { skipWorktree?: boolean } = {},
  t: any
): Promise<void> {
  const manager = new GitWorktreeManager()
  let worktreePath: string
  
  if (!options.skipWorktree) {
    const branchName = feature.feature
    worktreePath = await manager.createWorktree(branchName, feature.base || 'main')
  } else {
    worktreePath = await manager.getWorktreePath(feature.feature)
  }
  
  // Create tmux sessions
  for (const session of feature.sessions || []) {
    const sessionName = await createTmuxSession(feature.feature, session, worktreePath)
    
    // Inject prompts
    if (session.prompts && session.prompts.length > 0) {
      await injectPrompts(sessionName, session.prompts)
    }
  }
  
  // Create CLAUDE.md
  if (feature.claude_context || feature.agents) {
    await customizeClaudeMd(feature, worktreePath)
  }
}

// Attach to a tmux session
export async function attachToSession(
  sessionName: string,
  t: any
): Promise<void> {
  await execa('tmux', ['attach-session', '-t', sessionName], { stdio: 'inherit' })
}

// Get running orchestra sessions
export async function getRunningOrchestraSessions(filter?: string): Promise<string[]> {
  try {
    const { stdout } = await execa('tmux', ['list-sessions', '-F', '#{session_name}'])
    const sessions = stdout.split('\n').filter(Boolean)
    
    if (filter) {
      return sessions.filter(s => s.includes(filter))
    }
    
    return sessions
  } catch {
    return []
  }
}

// Display implementation summary
export function displayImplementationSummary(
  features: FeatureConfig[],
  worktreePaths: Map<string, string>,
  sessions: Map<string, string[]>
): void {
  console.log(chalk.cyan.bold('\n✨ Orchestration Complete!\n'))
  
  const totalSessions = Array.from(sessions.values()).flat().length
  const totalPanes = features.reduce((sum, f) => 
    sum + f.sessions.reduce((s, session) => s + session.panes, 0), 0
  )
  
  console.log(chalk.green(`Created ${features.length} features with ${totalSessions} tmux sessions (${totalPanes} total panes):\n`))
  
  for (const feature of features) {
    console.log(chalk.cyan(`📁 ${feature.feature}`))
    const sessionList = sessions.get(feature.feature) || []
    for (const session of sessionList) {
      const sessionConfig = feature.sessions.find(s => getSessionName(feature.feature, s.name) === session)
      const paneCount = sessionConfig?.panes || 1
      console.log(chalk.gray(`   • ${session} (${paneCount} panes)`))
    }
  }
  
  console.log(chalk.yellow('\n📋 Next Steps:'))
  console.log(chalk.white('  1. Attach to a session:'), chalk.cyan('mst ta <session-name>'))
  console.log(chalk.white('  2. View all sessions:'), chalk.cyan('mst orchestra'))
  console.log(chalk.white('  3. See orchestration status:'), chalk.cyan('mst orchestra status'))
  
  console.log(chalk.gray('\n💡 Tip: Prompts are pre-filled in each pane. Press Enter to execute them.'))
}