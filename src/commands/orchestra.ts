import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { execa } from 'execa'
import { 
  loadOrchestraState,
  getTmuxSessionStatus,
  checkTmuxInstalled
} from '../utils/orchestration.js'
import { loadMaestroConfig, maestroExists } from '../utils/maestro.js'
import { attachToTmuxWithProperTTY } from '../utils/tty.js'
import { t } from '../i18n/index.js'

export const orchestraCommand = new Command('orchestra')
  .description('Manage and view orchestration status / オーケストレーションの管理と状態表示')
  .option('-s, --status', 'Show detailed orchestration status / 詳細なステータス表示')
  .option('-a, --attach', 'Interactively attach to a session / インタラクティブにセッションに接続')
  .option('-v, --validate', 'Validate MAESTRO.yml / MAESTRO.ymlを検証')
  .option('-l, --list', 'List all orchestrated sessions / すべてのセッションを一覧表示')
  .exitOverride()
  .action(async (options: { status?: boolean; attach?: boolean; validate?: boolean; list?: boolean }) => {
    try {
      // Default to list if no options
      if (!options.status && !options.attach && !options.validate && !options.list) {
        options.list = true
      }
      
      // Check tmux for relevant commands
      if ((options.attach || options.list || options.status) && !(await checkTmuxInstalled())) {
        console.error(chalk.red('✖ tmux is required for this command'))
        process.exit(1)
      }
      
      // Validate command
      if (options.validate) {
        await validateMaestro()
        return
      }
      
      // Status command
      if (options.status) {
        await showOrchestraStatus()
        return
      }
      
      // List command
      if (options.list) {
        await listOrchestraSessions()
        return
      }
      
      // Attach command
      if (options.attach) {
        await attachToOrchestraSession()
        return
      }
      
    } catch (error) {
      console.error(chalk.red('Orchestra command failed:'), error)
      process.exit(1)
    }
  })

async function validateMaestro() {
  if (!(await maestroExists())) {
    console.error(chalk.red('✖ MAESTRO.yml not found'))
    console.log(chalk.gray('Run'), chalk.cyan('mst plan'), chalk.gray('to create an orchestration plan'))
    process.exit(1)
  }
  
  try {
    const config = await loadMaestroConfig()
    console.log(chalk.green('✓ MAESTRO.yml is valid'))
    console.log(chalk.gray(`  Version: ${config.version}`))
    console.log(chalk.gray(`  Features: ${config.orchestra.length}`))
    
    const totalSessions = config.orchestra.reduce((sum, f) => sum + f.sessions.length, 0)
    const totalPanes = config.orchestra.reduce((sum, f) => 
      sum + f.sessions.reduce((s, session) => s + session.panes, 0), 0
    )
    
    console.log(chalk.gray(`  Sessions: ${totalSessions}`))
    console.log(chalk.gray(`  Total panes: ${totalPanes}`))
    
    // Check for dependencies
    const hasDeps = config.orchestra.some(f => f.dependencies && f.dependencies.length > 0)
    if (hasDeps) {
      console.log(chalk.blue('  ✓ Dependencies defined'))
    }
    
    // Check for agents
    const hasAgents = config.orchestra.some(f => f.agents && f.agents.length > 0)
    if (hasAgents) {
      console.log(chalk.blue('  ✓ Agents configured'))
    }
    
  } catch (error) {
    console.error(chalk.red('✖ MAESTRO.yml validation failed:'), error)
    process.exit(1)
  }
}

async function showOrchestraStatus() {
  const state = await loadOrchestraState()
  
  if (!state) {
    console.log(chalk.yellow('No orchestration has been implemented yet'))
    console.log(chalk.gray('Run'), chalk.cyan('mst implement'), chalk.gray('to execute your orchestration plan'))
    return
  }
  
  console.log(chalk.cyan.bold('\n🎼 Orchestration Status\n'))
  console.log(chalk.gray(`Created: ${new Date(state.created_at).toLocaleString()}`))
  console.log(chalk.gray(`Status: ${state.status}`))
  console.log()
  
  for (const feature of state.features) {
    const statusIcon = feature.status === 'completed' ? '✓' : 
                       feature.status === 'active' ? '▶' : '○'
    
    console.log(chalk.cyan(`${statusIcon} ${feature.feature}`))
    console.log(chalk.gray(`  Path: ${feature.worktree_path}`))
    console.log(chalk.gray(`  Status: ${feature.status}`))
    
    if (feature.sessions.length > 0) {
      console.log(chalk.gray('  Sessions:'))
      
      for (const session of feature.sessions) {
        const tmuxStatus = await getTmuxSessionStatus(session.session_name)
        const statusEmoji = tmuxStatus === 'active' ? '🟢' :
                           tmuxStatus === 'inactive' ? '🟡' : '⭕'
        
        console.log(chalk.gray(`    ${statusEmoji} ${session.session_name} (${session.panes} panes)`))
        
        if (tmuxStatus === 'active') {
          console.log(chalk.green(`       Active - attached ${session.attached_count} times`))
        } else if (tmuxStatus === 'inactive') {
          console.log(chalk.yellow(`       Inactive - use 'mst ta ${session.session_name}' to attach`))
        } else {
          console.log(chalk.red(`       Not found - may need to recreate`))
        }
      }
    }
    console.log()
  }
}

async function listOrchestraSessions() {
  const state = await loadOrchestraState()
  
  if (!state) {
    console.log(chalk.yellow('No orchestration has been implemented yet'))
    return
  }
  
  // Get all tmux sessions
  let tmuxSessions: string[] = []
  try {
    const { stdout } = await execa('tmux', ['list-sessions', '-F', '#{session_name}'])
    tmuxSessions = stdout.split('\n').filter(Boolean)
  } catch {
    // No tmux sessions
  }
  
  console.log(chalk.cyan.bold('\n🎼 Orchestrated Sessions\n'))
  
  // Build session list
  const orchestraSessions: string[] = []
  
  for (const feature of state.features) {
    for (const session of feature.sessions) {
      if (tmuxSessions.includes(session.session_name)) {
        orchestraSessions.push(session.session_name)
        
        const status = await getTmuxSessionStatus(session.session_name)
        const statusIcon = status === 'active' ? chalk.green('●') : chalk.yellow('○')
        
        console.log(`${statusIcon} ${chalk.white(session.session_name.padEnd(30))} ${chalk.gray(`(${session.panes} panes)`)}`)
      }
    }
  }
  
  if (orchestraSessions.length === 0) {
    console.log(chalk.gray('No active orchestrated sessions found'))
    console.log(chalk.gray('Run'), chalk.cyan('mst implement'), chalk.gray('to create sessions'))
  } else {
    console.log(chalk.gray(`\n${orchestraSessions.length} active sessions`))
    console.log(chalk.gray('Attach with:'), chalk.cyan('mst ta <session-name>'))
  }
}

async function attachToOrchestraSession() {
  const state = await loadOrchestraState()
  
  if (!state) {
    console.log(chalk.yellow('No orchestration has been implemented yet'))
    return
  }
  
  // Get available sessions
  const availableSessions: { name: string; value: string; description: string }[] = []
  
  for (const feature of state.features) {
    for (const session of feature.sessions) {
      const status = await getTmuxSessionStatus(session.session_name)
      
      if (status !== 'not-found') {
        const statusText = status === 'active' ? chalk.green('[active]') : chalk.yellow('[inactive]')
        availableSessions.push({
          name: `${session.session_name} ${statusText}`,
          value: session.session_name,
          description: `${feature.feature} - ${session.panes} panes`,
        })
      }
    }
  }
  
  if (availableSessions.length === 0) {
    console.log(chalk.yellow('No sessions available to attach'))
    console.log(chalk.gray('Run'), chalk.cyan('mst implement'), chalk.gray('to create sessions'))
    return
  }
  
  // Select session
  const { selectedSession } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedSession',
      message: 'Select session to attach:',
      choices: availableSessions,
    },
  ])
  
  // Show tmux help
  console.log(chalk.gray(`
💡 Quick tmux navigation:
  • Ctrl+B, ↑/↓/←/→  Navigate between panes
  • Ctrl+B, o        Cycle through panes  
  • Ctrl+B, z        Toggle pane zoom
  • Ctrl+B, d        Detach from session
  `))
  
  // Attach to session
  console.log(chalk.cyan(`Attaching to ${selectedSession}...`))
  await attachToTmuxWithProperTTY(selectedSession)
  
  // Update attach count
  for (const feature of state.features) {
    for (const session of feature.sessions) {
      if (session.session_name === selectedSession) {
        session.attached_count++
        break
      }
    }
  }
}