// Orchestration type definitions for MAESTRO.yml

export interface MaestroConfig {
  version: string
  created: string
  description?: string
  orchestra: FeatureConfig[]
  settings?: OrchestraSettings
}

export interface FeatureConfig {
  feature: string
  description: string
  branch_prefix?: string
  sessions: SessionConfig[]
  claude_context?: string
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
  parallel_creation?: boolean
  auto_install_deps?: boolean
  claude_md_mode?: 'shared' | 'split'
  base_branch?: string
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