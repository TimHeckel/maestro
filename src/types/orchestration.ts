// Orchestration type definitions for .maestro.json orchestration section
// These match the Config['orchestration'] structure

import { Config } from '../core/config.js'

// Re-export from Config for backward compatibility
export type MaestroConfig = Config['orchestration']

// Feature configuration (maps to features array items)
export interface FeatureConfig {
  name: string  // Changed from 'feature' to 'name' to match schema
  description: string
  base?: string  // Base branch
  sessions?: SessionConfig[]
  claudeContext?: string  // Changed from claude_context
  agents?: string[]
  dependencies?: string[]
}

export interface SessionConfig {
  name: string
  panes: number
  layout?: 'even-horizontal' | 'even-vertical' | 'main-horizontal' | 'main-vertical' | 'tiled'
  prompts: string[]
}

export interface OrchestraSettings {
  parallel?: boolean  // Changed from parallel_creation
  autoAttach?: boolean  // Changed from auto_attach
}

// Runtime state tracking
export interface OrchestraState {
  created_at: string
  features: FeatureState[]
  status: 'planning' | 'implementing' | 'active' | 'completed'
}

export interface FeatureState {
  feature: string
  worktree_path: string
  sessions: SessionState[]
  status: 'pending' | 'created' | 'active' | 'completed'
  created_at?: string
  completed_at?: string
}

export interface SessionState {
  name: string
  session_name: string  // Full tmux session name
  panes: number
  status: 'pending' | 'created' | 'active'
  attached_count: number
}