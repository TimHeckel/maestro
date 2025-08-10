import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import * as fs from 'fs/promises'
import * as path from 'path'
import {
  createOrchestraSession,
  attachToSession,
  getRunningOrchestraSessions,
} from '../../utils/orchestration.js'
import { GitWorktreeManager } from '../../core/git.js'
import type { FeatureConfig } from '../../types/orchestration.js'

vi.mock('execa')
vi.mock('fs/promises')
vi.mock('../../core/git.js')

describe('orchestration utils', () => {
  const mockT = vi.fn((key: string, params?: any) => {
    if (params) {
      return `${key}: ${JSON.stringify(params)}`
    }
    return key
  })
  
  const mockGitManager = {
    createWorktree: vi.fn(),
    deleteWorktree: vi.fn(),
    listWorktrees: vi.fn(),
    getWorktreePath: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock the GitWorktreeManager constructor instead of getInstance
    vi.mocked(GitWorktreeManager).mockImplementation(() => mockGitManager as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createOrchestraSession', () => {
    const baseFeature: FeatureConfig = {
      feature: 'test-feature',
      description: 'Test feature',
      base: 'main',
      sessions: [],
    }

    it('should create worktree first', async () => {
      mockGitManager.createWorktree.mockResolvedValue('/path/to/worktree')
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/worktree')

      await createOrchestraSession(baseFeature, {}, mockT)

      expect(mockGitManager.createWorktree).toHaveBeenCalledWith(
        'test-feature',
        'main'
      )
    })

    it('should skip worktree creation if skipWorktree is true', async () => {
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/worktree')

      await createOrchestraSession(baseFeature, { skipWorktree: true }, mockT)

      expect(mockGitManager.createWorktree).not.toHaveBeenCalled()
    })

    it('should create tmux sessions for each session config', async () => {
      const featureWithSessions: FeatureConfig = {
        ...baseFeature,
        sessions: [
          {
            name: 'backend',
            panes: 2,
            layout: 'even-horizontal',
            prompts: ['npm run server', 'npm test'],
          },
          {
            name: 'frontend',
            panes: 2,
            layout: 'even-horizontal',
            prompts: ['npm run client', 'npm test'],
          },
        ],
      }

      mockGitManager.createWorktree.mockResolvedValue({
        path: '/path/to/worktree',
        branch: 'test-feature',
        head: 'abc123',
      })
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/worktree')
      vi.mocked(execa).mockResolvedValue({ stdout: '' } as any)

      await createOrchestraSession(featureWithSessions, {}, mockT)

      // Should create two tmux sessions
      expect(execa).toHaveBeenCalledWith(
        'tmux',
        expect.arrayContaining(['new-session', '-d', '-s', 'test-feature-backend']),
        expect.any(Object)
      )
      expect(execa).toHaveBeenCalledWith(
        'tmux',
        expect.arrayContaining(['new-session', '-d', '-s', 'test-feature-frontend']),
        expect.any(Object)
      )
    })

    it('should create multiple panes in tmux session', async () => {
      const featureWithPanes: FeatureConfig = {
        ...baseFeature,
        sessions: [
          {
            name: 'dev',
            panes: 4,
            layout: 'tiled',
            prompts: ['vim', 'npm test', 'npm run dev', 'git status'],
          },
        ],
      }

      mockGitManager.createWorktree.mockResolvedValue({
        path: '/path/to/worktree',
        branch: 'test-feature',
        head: 'abc123',
      })
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/worktree')
      vi.mocked(execa).mockResolvedValue({ stdout: '' } as any)

      await createOrchestraSession(featureWithPanes, {}, mockT)

      // Should split panes 3 times (to create 4 panes total)
      const splitCalls = vi.mocked(execa).mock.calls.filter(
        call => call[1].includes('split-window')
      )
      expect(splitCalls).toHaveLength(3)
    })

    it('should send prompts to panes', async () => {
      const featureWithPrompts: FeatureConfig = {
        ...baseFeature,
        sessions: [
          {
            name: 'dev',
            panes: 3,
            layout: 'tiled',
            prompts: ['vim .', 'npm test --watch', 'npm run dev'],
          },
        ],
      }

      mockGitManager.createWorktree.mockResolvedValue({
        path: '/path/to/worktree',
        branch: 'test-feature',
        head: 'abc123',
      })
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/worktree')
      vi.mocked(execa).mockResolvedValue({ stdout: '' } as any)

      await createOrchestraSession(featureWithPrompts, {}, mockT)

      // Should send prompts to each pane
      expect(execa).toHaveBeenCalledWith(
        'tmux',
        ['send-keys', '-t', 'test-feature-dev:0.0', 'vim .'],
        expect.any(Object)
      )
      expect(execa).toHaveBeenCalledWith(
        'tmux',
        ['send-keys', '-t', 'test-feature-dev:0.1', 'npm test --watch'],
        expect.any(Object)
      )
      expect(execa).toHaveBeenCalledWith(
        'tmux',
        ['send-keys', '-t', 'test-feature-dev:0.2', 'npm run dev'],
        expect.any(Object)
      )
    })

    it('should apply tmux layout', async () => {
      const featureWithLayout: FeatureConfig = {
        ...baseFeature,
        sessions: [
          {
            name: 'dev',
            panes: 4,
            layout: 'main-vertical',
            prompts: [],
          },
        ],
      }

      mockGitManager.createWorktree.mockResolvedValue({
        path: '/path/to/worktree',
        branch: 'test-feature',
        head: 'abc123',
      })
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/worktree')
      vi.mocked(execa).mockResolvedValue({ stdout: '' } as any)

      await createOrchestraSession(featureWithLayout, {}, mockT)

      expect(execa).toHaveBeenCalledWith(
        'tmux',
        ['select-layout', '-t', 'test-feature-dev', 'main-vertical'],
        expect.any(Object)
      )
    })

    it('should create CLAUDE.md with context', async () => {
      const featureWithClaude: FeatureConfig = {
        ...baseFeature,
        claude_context: 'Implement using TypeScript and React',
        agents: ['code-reviewer', 'test-writer'],
      }

      mockGitManager.createWorktree.mockResolvedValue({
        path: '/path/to/worktree',
        branch: 'test-feature',
        head: 'abc123',
      })
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/worktree')
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await createOrchestraSession(featureWithClaude, {}, mockT)

      // Verify CLAUDE.md was written with context
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join('/path/to/worktree', 'CLAUDE.md'),
        expect.stringContaining('Implement using TypeScript and React'),
        undefined
      )
    })

    it('should handle session creation failure', async () => {
      const featureWithSession: FeatureConfig = {
        ...baseFeature,
        sessions: [
          {
            name: 'dev',
            panes: 2,
            layout: 'even-horizontal',
            prompts: [],
          },
        ],
      }

      mockGitManager.createWorktree.mockResolvedValue({
        path: '/path/to/worktree',
        branch: 'test-feature',
        head: 'abc123',
      })
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/worktree')
      
      const tmuxError = new Error('Failed to create tmux session')
      vi.mocked(execa).mockRejectedValue(tmuxError)

      await expect(
        createOrchestraSession(featureWithSession, {}, mockT)
      ).rejects.toThrow('Failed to create tmux session')
    })

    it('should rollback worktree on failure', async () => {
      const featureWithSession: FeatureConfig = {
        ...baseFeature,
        sessions: [
          {
            name: 'dev',
            panes: 2,
            layout: 'even-horizontal',
            prompts: [],
          },
        ],
      }

      mockGitManager.createWorktree.mockResolvedValue({
        path: '/path/to/worktree',
        branch: 'test-feature',
        head: 'abc123',
      })
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/worktree')
      
      vi.mocked(execa).mockRejectedValue(new Error('tmux error'))

      try {
        await createOrchestraSession(featureWithSession, {}, mockT)
      } catch (error) {
        // Expected to throw
      }

      expect(mockGitManager.deleteWorktree).toHaveBeenCalledWith('test-feature', true)
    })

    it('should handle panes without prompts', async () => {
      const featureWithEmptyPrompts: FeatureConfig = {
        ...baseFeature,
        sessions: [
          {
            name: 'dev',
            panes: 3,
            layout: 'tiled',
            prompts: [], // Empty prompts array
          },
        ],
      }

      mockGitManager.createWorktree.mockResolvedValue({
        path: '/path/to/worktree',
        branch: 'test-feature',
        head: 'abc123',
      })
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/worktree')
      vi.mocked(execa).mockResolvedValue({ stdout: '' } as any)

      await createOrchestraSession(featureWithEmptyPrompts, {}, mockT)

      // Should not send any prompts
      const sendKeyCalls = vi.mocked(execa).mock.calls.filter(
        call => call[1].includes('send-keys')
      )
      expect(sendKeyCalls).toHaveLength(0)
    })
  })

  describe('attachToSession', () => {
    it('should attach to existing tmux session', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: '' } as any)

      await attachToSession('test-feature-dev', mockT)

      expect(execa).toHaveBeenCalledWith(
        'tmux',
        ['attach-session', '-t', 'test-feature-dev'],
        { stdio: 'inherit' }
      )
    })

    it('should handle non-existent session', async () => {
      const error = new Error('session not found')
      vi.mocked(execa).mockRejectedValue(error)

      await expect(attachToSession('non-existent', mockT)).rejects.toThrow(
        'session not found'
      )
    })

    it('should handle tmux not installed', async () => {
      const error = new Error('tmux: command not found')
      vi.mocked(execa).mockRejectedValue(error)

      await expect(attachToSession('test-session', mockT)).rejects.toThrow(
        'tmux: command not found'
      )
    })
  })

  describe('getRunningOrchestraSessions', () => {
    it('should return list of running tmux sessions', async () => {
      vi.mocked(execa).mockResolvedValue({
        stdout: 'auth-backend: 1 windows\napi-server: 2 windows\nui-app: 1 windows',
      } as any)

      const sessions = await getRunningOrchestraSessions()

      expect(sessions).toEqual(['auth-backend', 'api-server', 'ui-app'])
    })

    it('should return empty array when no sessions', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('no server running'))

      const sessions = await getRunningOrchestraSessions()

      expect(sessions).toEqual([])
    })

    it('should handle empty stdout', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: '' } as any)

      const sessions = await getRunningOrchestraSessions()

      expect(sessions).toEqual([])
    })

    it('should parse session names correctly', async () => {
      vi.mocked(execa).mockResolvedValue({
        stdout: `feature-branch-dev: 1 windows (created Mon Jan  1 12:00:00 2024)
another-feature-test: 2 windows (created Mon Jan  1 13:00:00 2024) (attached)
simple: 1 windows`,
      } as any)

      const sessions = await getRunningOrchestraSessions()

      expect(sessions).toEqual(['feature-branch-dev', 'another-feature-test', 'simple'])
    })

    it('should filter orchestra-specific sessions if filter provided', async () => {
      vi.mocked(execa).mockResolvedValue({
        stdout: 'auth-backend: 1 windows\nregular-session: 1 windows\napi-server: 1 windows',
      } as any)

      const sessions = await getRunningOrchestraSessions('auth')

      expect(sessions).toEqual(['auth-backend'])
    })
  })

  describe('error handling', () => {
    it('should handle worktree creation with existing directory', async () => {
      const feature: FeatureConfig = {
        feature: 'existing-feature',
        description: 'Existing feature',
        base: 'main',
        sessions: [],
      }

      const error = new Error('Directory already exists')
      mockGitManager.createWorktree.mockRejectedValue(error)

      await expect(createOrchestraSession(feature, {}, mockT)).rejects.toThrow(
        'Directory already exists'
      )
    })

    it('should handle invalid tmux layout', async () => {
      const featureWithInvalidLayout: FeatureConfig = {
        feature: 'test',
        description: 'Test',
        base: 'main',
        sessions: [
          {
            name: 'dev',
            panes: 2,
            layout: 'invalid-layout' as any,
            prompts: [],
          },
        ],
      }

      mockGitManager.createWorktree.mockResolvedValue({
        path: '/path/to/worktree',
        branch: 'test',
        head: 'abc123',
      })
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/worktree')
      
      // Layout command should fail
      vi.mocked(execa)
        .mockResolvedValueOnce({ stdout: '' } as any) // session creation
        .mockResolvedValueOnce({ stdout: '' } as any) // split window
        .mockRejectedValueOnce(new Error('Invalid layout')) // layout command

      await expect(
        createOrchestraSession(featureWithInvalidLayout, {}, mockT)
      ).rejects.toThrow('Invalid layout')
    })

    it('should handle permission errors', async () => {
      const feature: FeatureConfig = {
        feature: 'test',
        description: 'Test',
        base: 'main',
        sessions: [],
        claude_context: 'Test context',
      }

      mockGitManager.createWorktree.mockResolvedValue({
        path: '/path/to/worktree',
        branch: 'test',
        head: 'abc123',
      })
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/worktree')
      
      vi.mocked(fs.writeFile).mockRejectedValue(
        new Error('Permission denied')
      )

      await expect(createOrchestraSession(feature, {}, mockT)).rejects.toThrow(
        'Permission denied'
      )
    })
  })

  describe('complex scenarios', () => {
    it('should handle feature with multiple sessions and complex prompts', async () => {
      const complexFeature: FeatureConfig = {
        feature: 'complex-app',
        description: 'Complex application',
        base: 'develop',
        sessions: [
          {
            name: 'backend',
            panes: 4,
            layout: 'tiled',
            prompts: [
              'cd backend && npm run dev',
              'cd backend && npm test --watch',
              'cd backend && tail -f logs/app.log',
              'htop',
            ],
          },
          {
            name: 'frontend',
            panes: 3,
            layout: 'main-horizontal',
            prompts: [
              'cd frontend && npm run dev',
              'cd frontend && npm run storybook',
              'cd frontend && npm test --watch',
            ],
          },
          {
            name: 'database',
            panes: 2,
            layout: 'even-vertical',
            prompts: [
              'docker-compose up db',
              'docker exec -it db psql',
            ],
          },
        ],
        claude_context: 'Build a full-stack application with React and Node.js',
        agents: ['fullstack-developer', 'code-reviewer', 'test-writer'],
        dependencies: ['auth', 'api'],
      }

      mockGitManager.createWorktree.mockResolvedValue({
        path: '/path/to/complex-app',
        branch: 'complex-app',
        head: 'def456',
      })
      mockGitManager.getWorktreePath.mockResolvedValue('/path/to/complex-app')
      vi.mocked(execa).mockResolvedValue({ stdout: '' } as any)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await createOrchestraSession(complexFeature, {}, mockT)

      // Verify all sessions were created
      expect(execa).toHaveBeenCalledWith(
        'tmux',
        expect.arrayContaining(['new-session', '-d', '-s', 'complex-app-backend']),
        expect.any(Object)
      )
      expect(execa).toHaveBeenCalledWith(
        'tmux',
        expect.arrayContaining(['new-session', '-d', '-s', 'complex-app-frontend']),
        expect.any(Object)
      )
      expect(execa).toHaveBeenCalledWith(
        'tmux',
        expect.arrayContaining(['new-session', '-d', '-s', 'complex-app-database']),
        expect.any(Object)
      )

      // Verify CLAUDE.md was created with all context
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join('/path/to/complex-app', 'CLAUDE.md'),
        expect.stringContaining('Build a full-stack application with React and Node.js'),
        undefined
      )
    })
  })
})