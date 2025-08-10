import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as inquirer from 'inquirer'
import { execa } from 'execa'
import * as path from 'path'
import ora from 'ora'
import { implementCommand } from '../../commands/implement.js'
import * as maestroUtils from '../../utils/maestro.js'
import * as orchestrationUtils from '../../utils/orchestration.js'
import { GitWorktreeManager } from '../../core/git.js'
import * as i18n from '../../i18n/index.js'
import type { MaestroConfig, FeatureConfig } from '../../types/orchestration.js'

vi.mock('inquirer')
vi.mock('execa')
vi.mock('ora')
vi.mock('../../utils/maestro.js')
vi.mock('../../utils/orchestration.js')
vi.mock('../../core/git.js')
vi.mock('../../i18n/index.js')

describe('implement command', () => {
  const mockT = vi.fn((key: string) => key)
  const mockGitManager = {
    createWorktree: vi.fn(),
    deleteWorktree: vi.fn(),
    listWorktrees: vi.fn(),
    getCurrentBranch: vi.fn(),
    getAllBranches: vi.fn(),
  }
  const mockSpinner = {
    start: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    stop: vi.fn(),
    text: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(i18n.getTranslator).mockReturnValue(mockT)
    vi.mocked(GitWorktreeManager.getInstance).mockResolvedValue(mockGitManager as any)
    vi.mocked(ora).mockReturnValue(mockSpinner as any)
    vi.mocked(execa).mockResolvedValue({ stdout: 'tmux available' } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('basic functionality', () => {
    it('should check tmux availability', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('tmux not found'))
      
      await expect(implementCommand({})).rejects.toThrow()
      expect(execa).toHaveBeenCalledWith('which', ['tmux'])
      expect(mockT).toHaveBeenCalledWith('errors.tmuxRequired')
    })

    it('should load MAESTRO.yml', async () => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(null)

      await expect(implementCommand({})).rejects.toThrow()
      expect(maestroUtils.loadMaestroConfig).toHaveBeenCalled()
      expect(mockT).toHaveBeenCalledWith('orchestra.noMaestroFile')
    })

    it('should validate MAESTRO.yml', async () => {
      const invalidConfig = {
        version: '1.0',
        orchestra: [], // Empty orchestra
      } as MaestroConfig

      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(invalidConfig)
      vi.mocked(maestroUtils.validateMaestroConfig).mockReturnValue(false)

      await expect(implementCommand({})).rejects.toThrow()
      expect(maestroUtils.validateMaestroConfig).toHaveBeenCalledWith(invalidConfig)
      expect(mockT).toHaveBeenCalledWith('orchestra.invalidMaestroFile')
    })
  })

  describe('feature selection', () => {
    const validConfig: MaestroConfig = {
      version: '1.0',
      created: '2024-01-01T00:00:00Z',
      description: 'Test project',
      orchestra: [
        {
          feature: 'auth',
          description: 'Authentication',
          base: 'main',
          sessions: [],
        },
        {
          feature: 'api',
          description: 'API layer',
          base: 'main',
          sessions: [],
        },
      ],
    }

    beforeEach(() => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(validConfig)
      vi.mocked(maestroUtils.validateMaestroConfig).mockReturnValue(true)
      mockGitManager.listWorktrees.mockResolvedValue([])
    })

    it('should prompt for feature selection when not specified', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ features: ['auth'] })
      vi.mocked(orchestrationUtils.createOrchestraSession).mockResolvedValue(undefined)

      await implementCommand({})

      expect(inquirer.prompt).toHaveBeenCalledWith([{
        type: 'checkbox',
        name: 'features',
        message: expect.any(String),
        choices: expect.arrayContaining([
          expect.objectContaining({ value: 'auth' }),
          expect.objectContaining({ value: 'api' }),
        ]),
      }])
    })

    it('should use specified features from options', async () => {
      vi.mocked(orchestrationUtils.createOrchestraSession).mockResolvedValue(undefined)

      await implementCommand({ features: ['api'] })

      expect(inquirer.prompt).not.toHaveBeenCalled()
      expect(orchestrationUtils.createOrchestraSession).toHaveBeenCalledWith(
        expect.objectContaining({ feature: 'api' }),
        expect.any(Object),
        mockT
      )
    })

    it('should implement all features with --all flag', async () => {
      vi.mocked(orchestrationUtils.createOrchestraSession).mockResolvedValue(undefined)

      await implementCommand({ all: true })

      expect(inquirer.prompt).not.toHaveBeenCalled()
      expect(orchestrationUtils.createOrchestraSession).toHaveBeenCalledTimes(2)
    })

    it('should skip already implemented features', async () => {
      mockGitManager.listWorktrees.mockResolvedValue([
        { path: '/path/to/auth', branch: 'auth', head: 'abc123' },
      ])
      
      vi.mocked(inquirer.prompt).mockResolvedValue({ features: ['auth', 'api'] })
      vi.mocked(orchestrationUtils.createOrchestraSession).mockResolvedValue(undefined)

      const consoleSpy = vi.spyOn(console, 'log')
      
      await implementCommand({})

      expect(mockT).toHaveBeenCalledWith('orchestra.featureAlreadyImplemented')
      expect(orchestrationUtils.createOrchestraSession).toHaveBeenCalledTimes(1)
      expect(orchestrationUtils.createOrchestraSession).toHaveBeenCalledWith(
        expect.objectContaining({ feature: 'api' }),
        expect.any(Object),
        mockT
      )
    })
  })

  describe('dependency resolution', () => {
    const configWithDeps: MaestroConfig = {
      version: '1.0',
      created: '2024-01-01T00:00:00Z',
      description: 'Test project',
      orchestra: [
        {
          feature: 'auth',
          description: 'Authentication',
          base: 'main',
          sessions: [],
        },
        {
          feature: 'api',
          description: 'API layer',
          base: 'main',
          sessions: [],
          dependencies: ['auth'],
        },
        {
          feature: 'ui',
          description: 'User interface',
          base: 'main',
          sessions: [],
          dependencies: ['auth', 'api'],
        },
      ],
    }

    beforeEach(() => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(configWithDeps)
      vi.mocked(maestroUtils.validateMaestroConfig).mockReturnValue(true)
      mockGitManager.listWorktrees.mockResolvedValue([])
    })

    it('should resolve dependencies correctly', async () => {
      vi.mocked(maestroUtils.resolveDependencies).mockReturnValue(['auth', 'api', 'ui'])
      vi.mocked(inquirer.prompt).mockResolvedValue({ features: ['ui'] })
      vi.mocked(orchestrationUtils.createOrchestraSession).mockResolvedValue(undefined)

      await implementCommand({})

      expect(maestroUtils.resolveDependencies).toHaveBeenCalledWith(['ui'], configWithDeps)
      expect(orchestrationUtils.createOrchestraSession).toHaveBeenCalledTimes(3)
      
      // Verify order of execution
      const calls = vi.mocked(orchestrationUtils.createOrchestraSession).mock.calls
      expect(calls[0][0].feature).toBe('auth')
      expect(calls[1][0].feature).toBe('api')
      expect(calls[2][0].feature).toBe('ui')
    })

    it('should handle circular dependencies', async () => {
      const circularConfig: MaestroConfig = {
        ...configWithDeps,
        orchestra: [
          {
            feature: 'a',
            description: 'Feature A',
            base: 'main',
            sessions: [],
            dependencies: ['b'],
          },
          {
            feature: 'b',
            description: 'Feature B',
            base: 'main',
            sessions: [],
            dependencies: ['a'],
          },
        ],
      }

      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(circularConfig)
      vi.mocked(maestroUtils.resolveDependencies).mockImplementation(() => {
        throw new Error('Circular dependency detected')
      })
      vi.mocked(inquirer.prompt).mockResolvedValue({ features: ['a'] })

      await expect(implementCommand({})).rejects.toThrow('Circular dependency')
    })
  })

  describe('parallel implementation', () => {
    const parallelConfig: MaestroConfig = {
      version: '1.0',
      created: '2024-01-01T00:00:00Z',
      description: 'Test project',
      orchestra: [
        {
          feature: 'feature1',
          description: 'Feature 1',
          base: 'main',
          sessions: [{
            name: 'dev',
            panes: 2,
            layout: 'even-horizontal',
            prompts: ['npm run dev', 'npm test'],
          }],
        },
        {
          feature: 'feature2',
          description: 'Feature 2',
          base: 'main',
          sessions: [{
            name: 'dev',
            panes: 2,
            layout: 'even-horizontal',
            prompts: ['npm run dev', 'npm test'],
          }],
        },
      ],
    }

    beforeEach(() => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(parallelConfig)
      vi.mocked(maestroUtils.validateMaestroConfig).mockReturnValue(true)
      mockGitManager.listWorktrees.mockResolvedValue([])
    })

    it('should implement features in parallel when --parallel is set', async () => {
      let creationOrder: string[] = []
      vi.mocked(orchestrationUtils.createOrchestraSession).mockImplementation(async (feature) => {
        creationOrder.push(feature.feature)
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      const startTime = Date.now()
      await implementCommand({ all: true, parallel: true })
      const duration = Date.now() - startTime

      expect(orchestrationUtils.createOrchestraSession).toHaveBeenCalledTimes(2)
      // Parallel execution should be faster than sequential
      expect(duration).toBeLessThan(30)
    })

    it('should implement features sequentially by default', async () => {
      let creationOrder: string[] = []
      vi.mocked(orchestrationUtils.createOrchestraSession).mockImplementation(async (feature) => {
        creationOrder.push(feature.feature)
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      await implementCommand({ all: true })

      expect(creationOrder).toEqual(['feature1', 'feature2'])
      expect(orchestrationUtils.createOrchestraSession).toHaveBeenCalledTimes(2)
    })
  })

  describe('dry run mode', () => {
    const testConfig: MaestroConfig = {
      version: '1.0',
      created: '2024-01-01T00:00:00Z',
      description: 'Test project',
      orchestra: [
        {
          feature: 'test-feature',
          description: 'Test feature',
          base: 'main',
          sessions: [{
            name: 'dev',
            panes: 3,
            layout: 'tiled',
            prompts: ['vim', 'npm test', 'npm run dev'],
          }],
          claude_context: 'Test context',
          agents: ['code-reviewer'],
        },
      ],
    }

    beforeEach(() => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(testConfig)
      vi.mocked(maestroUtils.validateMaestroConfig).mockReturnValue(true)
      mockGitManager.listWorktrees.mockResolvedValue([])
    })

    it('should show execution plan without creating resources', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      await implementCommand({ all: true, dryRun: true })

      expect(mockT).toHaveBeenCalledWith('orchestra.dryRunMode')
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test-feature'))
      expect(orchestrationUtils.createOrchestraSession).not.toHaveBeenCalled()
      expect(mockGitManager.createWorktree).not.toHaveBeenCalled()
    })

    it('should display feature details in dry run', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      await implementCommand({ all: true, dryRun: true })

      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(output).toContain('test-feature')
      expect(output).toContain('Test feature')
      expect(output).toContain('main')
      expect(output).toContain('dev')
      expect(output).toContain('3')
      expect(output).toContain('tiled')
    })
  })

  describe('error handling', () => {
    const testConfig: MaestroConfig = {
      version: '1.0',
      created: '2024-01-01T00:00:00Z',
      description: 'Test project',
      orchestra: [
        {
          feature: 'test-feature',
          description: 'Test feature',
          base: 'main',
          sessions: [],
        },
      ],
    }

    beforeEach(() => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(testConfig)
      vi.mocked(maestroUtils.validateMaestroConfig).mockReturnValue(true)
      mockGitManager.listWorktrees.mockResolvedValue([])
    })

    it('should handle worktree creation failure', async () => {
      const error = new Error('Failed to create worktree')
      vi.mocked(orchestrationUtils.createOrchestraSession).mockRejectedValue(error)
      vi.mocked(inquirer.prompt).mockResolvedValue({ features: ['test-feature'] })

      await expect(implementCommand({})).rejects.toThrow('Failed to create worktree')
      expect(mockSpinner.fail).toHaveBeenCalled()
    })

    it('should rollback on partial failure', async () => {
      const multiFeatureConfig: MaestroConfig = {
        ...testConfig,
        orchestra: [
          testConfig.orchestra[0],
          {
            feature: 'feature2',
            description: 'Feature 2',
            base: 'main',
            sessions: [],
          },
        ],
      }

      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(multiFeatureConfig)
      vi.mocked(orchestrationUtils.createOrchestraSession)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Failed on second feature'))
      
      vi.mocked(inquirer.prompt).mockResolvedValue({ features: ['test-feature', 'feature2'] })

      await expect(implementCommand({})).rejects.toThrow('Failed on second feature')
      
      // Verify rollback attempt
      expect(mockT).toHaveBeenCalledWith('orchestra.implementationFailed')
    })

    it('should handle missing tmux session configuration gracefully', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ features: ['test-feature'] })
      vi.mocked(orchestrationUtils.createOrchestraSession).mockResolvedValue(undefined)

      await implementCommand({})

      // Should complete without error even with no sessions
      expect(mockSpinner.succeed).toHaveBeenCalled()
    })
  })

  describe('success messages', () => {
    const testConfig: MaestroConfig = {
      version: '1.0',
      created: '2024-01-01T00:00:00Z',
      description: 'Test project',
      orchestra: [
        {
          feature: 'success-feature',
          description: 'Success test',
          base: 'main',
          sessions: [{
            name: 'dev',
            panes: 2,
            layout: 'even-horizontal',
            prompts: ['npm run dev', 'npm test'],
          }],
        },
      ],
    }

    beforeEach(() => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(testConfig)
      vi.mocked(maestroUtils.validateMaestroConfig).mockReturnValue(true)
      mockGitManager.listWorktrees.mockResolvedValue([])
    })

    it('should show success message after implementation', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ features: ['success-feature'] })
      vi.mocked(orchestrationUtils.createOrchestraSession).mockResolvedValue(undefined)

      await implementCommand({})

      expect(mockSpinner.succeed).toHaveBeenCalled()
      expect(mockT).toHaveBeenCalledWith('orchestra.implementationComplete')
      expect(mockT).toHaveBeenCalledWith('orchestra.attachHint')
    })

    it('should list created sessions', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({ features: ['success-feature'] })
      vi.mocked(orchestrationUtils.createOrchestraSession).mockResolvedValue(undefined)
      
      const consoleSpy = vi.spyOn(console, 'log')

      await implementCommand({})

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('success-feature'))
    })
  })
})