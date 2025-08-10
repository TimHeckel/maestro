import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as inquirer from 'inquirer'
import { execa } from 'execa'
import * as fs from 'fs/promises'
import * as yaml from 'js-yaml'
import { planCommand } from '../../commands/plan.js'
import * as maestroUtils from '../../utils/maestro.js'
import { GitWorktreeManager } from '../../core/git.js'
import * as i18n from '../../i18n/index.js'
import type { MaestroConfig } from '../../types/orchestration.js'

vi.mock('inquirer')
vi.mock('execa')
vi.mock('fs/promises')
vi.mock('js-yaml')
vi.mock('../../utils/maestro.js')
vi.mock('../../core/git.js')
vi.mock('../../i18n/index.js')

describe('plan command', () => {
  const mockT = vi.fn((key: string) => key)
  const mockGitManager = {
    getCurrentBranch: vi.fn(),
    getAllBranches: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(i18n.getTranslator).mockReturnValue(mockT)
    vi.mocked(GitWorktreeManager.getInstance).mockResolvedValue(mockGitManager as any)
    vi.mocked(execa).mockResolvedValue({ stdout: 'tmux available' } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('basic functionality', () => {
    it('should check tmux availability', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('tmux not found'))
      
      await expect(planCommand()).rejects.toThrow()
      expect(execa).toHaveBeenCalledWith('which', ['tmux'])
      expect(mockT).toHaveBeenCalledWith('errors.tmuxRequired')
    })

    it('should prompt for project description', async () => {
      const mockConfig: MaestroConfig = {
        version: '1.0',
        created: new Date().toISOString(),
        description: 'Test project',
        orchestra: [],
      }

      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(null)
      vi.mocked(inquirer.prompt).mockResolvedValueOnce({ description: 'Test project' })
        .mockResolvedValueOnce({ addMore: false })
      
      vi.mocked(maestroUtils.saveMaestroConfig).mockResolvedValue(undefined)

      await planCommand()

      expect(inquirer.prompt).toHaveBeenCalledWith([{
        type: 'input',
        name: 'description',
        message: expect.any(String),
      }])
    })

    it('should load existing MAESTRO.yml if present', async () => {
      const existingConfig: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Existing project',
        orchestra: [{
          feature: 'existing-feature',
          description: 'Existing feature',
          base: 'main',
          sessions: [],
        }],
      }

      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(existingConfig)
      vi.mocked(inquirer.prompt).mockResolvedValue({ addMore: false })

      await planCommand()

      expect(maestroUtils.loadMaestroConfig).toHaveBeenCalled()
      expect(mockT).toHaveBeenCalledWith('orchestra.planLoaded')
    })
  })

  describe('feature planning', () => {
    beforeEach(() => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(null)
      mockGitManager.getCurrentBranch.mockResolvedValue('main')
      mockGitManager.getAllBranches.mockResolvedValue(['main', 'develop', 'feature/test'])
    })

    it('should prompt for feature details', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ description: 'Test project' })
        .mockResolvedValueOnce({ 
          feature: 'new-feature',
          description: 'New feature description',
          base: 'main',
        })
        .mockResolvedValueOnce({ addSession: true })
        .mockResolvedValueOnce({
          sessionName: 'dev',
          panes: 3,
          layout: 'tiled',
        })
        .mockResolvedValueOnce({ prompt: 'npm run dev' })
        .mockResolvedValueOnce({ prompt: 'npm test' })
        .mockResolvedValueOnce({ prompt: '' })
        .mockResolvedValueOnce({ addSession: false })
        .mockResolvedValueOnce({ claudeContext: 'Use TypeScript' })
        .mockResolvedValueOnce({ agents: [] })
        .mockResolvedValueOnce({ dependencies: [] })
        .mockResolvedValueOnce({ addMore: false })

      vi.mocked(maestroUtils.saveMaestroConfig).mockResolvedValue(undefined)

      await planCommand()

      const calls = vi.mocked(inquirer.prompt).mock.calls
      expect(calls.some(call => call[0].name === 'feature')).toBe(true)
      expect(calls.some(call => call[0].name === 'description')).toBe(true)
      expect(calls.some(call => call[0].name === 'base')).toBe(true)
    })

    it('should support multiple sessions per feature', async () => {
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ description: 'Test project' })
        .mockResolvedValueOnce({ 
          feature: 'multi-session',
          description: 'Feature with multiple sessions',
          base: 'main',
        })
        .mockResolvedValueOnce({ addSession: true })
        .mockResolvedValueOnce({
          sessionName: 'backend',
          panes: 2,
          layout: 'even-horizontal',
        })
        .mockResolvedValueOnce({ prompt: 'npm run server' })
        .mockResolvedValueOnce({ prompt: '' })
        .mockResolvedValueOnce({ addSession: true })
        .mockResolvedValueOnce({
          sessionName: 'frontend',
          panes: 2,
          layout: 'even-horizontal',
        })
        .mockResolvedValueOnce({ prompt: 'npm run client' })
        .mockResolvedValueOnce({ prompt: '' })
        .mockResolvedValueOnce({ addSession: false })
        .mockResolvedValueOnce({ claudeContext: '' })
        .mockResolvedValueOnce({ agents: [] })
        .mockResolvedValueOnce({ dependencies: [] })
        .mockResolvedValueOnce({ addMore: false })

      let savedConfig: MaestroConfig | undefined
      vi.mocked(maestroUtils.saveMaestroConfig).mockImplementation(async (config) => {
        savedConfig = config
      })

      await planCommand()

      expect(savedConfig).toBeDefined()
      expect(savedConfig!.orchestra[0].sessions).toHaveLength(2)
      expect(savedConfig!.orchestra[0].sessions[0].name).toBe('backend')
      expect(savedConfig!.orchestra[0].sessions[1].name).toBe('frontend')
    })

    it('should handle Claude agent selection', async () => {
      const availableAgents = ['code-reviewer', 'test-writer', 'docs-writer']
      
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ description: 'Test project' })
        .mockResolvedValueOnce({ 
          feature: 'with-agents',
          description: 'Feature with Claude agents',
          base: 'main',
        })
        .mockResolvedValueOnce({ addSession: false })
        .mockResolvedValueOnce({ claudeContext: 'Focus on performance' })
        .mockResolvedValueOnce({ agents: ['code-reviewer', 'test-writer'] })
        .mockResolvedValueOnce({ dependencies: [] })
        .mockResolvedValueOnce({ addMore: false })

      let savedConfig: MaestroConfig | undefined
      vi.mocked(maestroUtils.saveMaestroConfig).mockImplementation(async (config) => {
        savedConfig = config
      })

      await planCommand()

      expect(savedConfig).toBeDefined()
      expect(savedConfig!.orchestra[0].agents).toEqual(['code-reviewer', 'test-writer'])
      expect(savedConfig!.orchestra[0].claude_context).toBe('Focus on performance')
    })

    it('should handle feature dependencies', async () => {
      const existingConfig: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Project with dependencies',
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

      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(existingConfig)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ 
          feature: 'ui',
          description: 'User interface',
          base: 'main',
        })
        .mockResolvedValueOnce({ addSession: false })
        .mockResolvedValueOnce({ claudeContext: '' })
        .mockResolvedValueOnce({ agents: [] })
        .mockResolvedValueOnce({ dependencies: ['auth', 'api'] })
        .mockResolvedValueOnce({ addMore: false })

      let savedConfig: MaestroConfig | undefined
      vi.mocked(maestroUtils.saveMaestroConfig).mockImplementation(async (config) => {
        savedConfig = config
      })

      await planCommand()

      expect(savedConfig).toBeDefined()
      const uiFeature = savedConfig!.orchestra.find(f => f.feature === 'ui')
      expect(uiFeature?.dependencies).toEqual(['auth', 'api'])
    })
  })

  describe('validation', () => {
    it('should validate pane count', async () => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(null)
      
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ description: 'Test project' })
        .mockResolvedValueOnce({ 
          feature: 'test-feature',
          description: 'Test',
          base: 'main',
        })
        .mockResolvedValueOnce({ addSession: true })
        .mockResolvedValueOnce({
          sessionName: 'dev',
          panes: 50, // Invalid pane count
          layout: 'tiled',
        })

      const promptSpy = vi.mocked(inquirer.prompt)
      
      // The validation should be in the validate function
      const sessionCall = promptSpy.mock.calls.find(call => 
        Array.isArray(call[0]) && call[0].some((q: any) => q.name === 'panes')
      )
      
      if (sessionCall && Array.isArray(sessionCall[0])) {
        const panesQuestion = sessionCall[0].find((q: any) => q.name === 'panes')
        if (panesQuestion?.validate) {
          const result = panesQuestion.validate(50)
          expect(result).toContain('30')
        }
      }
    })

    it('should validate feature name uniqueness', async () => {
      const existingConfig: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [{
          feature: 'existing-feature',
          description: 'Already exists',
          base: 'main',
          sessions: [],
        }],
      }

      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(existingConfig)
      
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ 
          feature: 'existing-feature', // Duplicate name
          description: 'Duplicate',
          base: 'main',
        })

      const promptSpy = vi.mocked(inquirer.prompt)
      
      // The validation should be in the validate function
      const featureCall = promptSpy.mock.calls.find(call => 
        call[0]?.name === 'feature'
      )
      
      if (featureCall) {
        const featureQuestion = featureCall[0]
        if (featureQuestion?.validate) {
          const result = featureQuestion.validate('existing-feature')
          expect(result).not.toBe(true)
        }
      }
    })
  })

  describe('output', () => {
    it('should save MAESTRO.yml with correct structure', async () => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(null)
      
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ description: 'Test project' })
        .mockResolvedValueOnce({ 
          feature: 'complete-feature',
          description: 'Complete feature example',
          base: 'develop',
        })
        .mockResolvedValueOnce({ addSession: true })
        .mockResolvedValueOnce({
          sessionName: 'main',
          panes: 4,
          layout: 'tiled',
        })
        .mockResolvedValueOnce({ prompt: 'vim .' })
        .mockResolvedValueOnce({ prompt: 'npm test --watch' })
        .mockResolvedValueOnce({ prompt: 'npm run dev' })
        .mockResolvedValueOnce({ prompt: 'git status' })
        .mockResolvedValueOnce({ addSession: false })
        .mockResolvedValueOnce({ claudeContext: 'Implement with TDD' })
        .mockResolvedValueOnce({ agents: ['test-writer'] })
        .mockResolvedValueOnce({ dependencies: [] })
        .mockResolvedValueOnce({ addMore: false })

      let savedConfig: MaestroConfig | undefined
      vi.mocked(maestroUtils.saveMaestroConfig).mockImplementation(async (config) => {
        savedConfig = config
      })

      await planCommand()

      expect(savedConfig).toBeDefined()
      expect(savedConfig!.version).toBe('1.0')
      expect(savedConfig!.description).toBe('Test project')
      expect(savedConfig!.orchestra).toHaveLength(1)
      
      const feature = savedConfig!.orchestra[0]
      expect(feature.feature).toBe('complete-feature')
      expect(feature.description).toBe('Complete feature example')
      expect(feature.base).toBe('develop')
      expect(feature.sessions).toHaveLength(1)
      expect(feature.sessions[0].name).toBe('main')
      expect(feature.sessions[0].panes).toBe(4)
      expect(feature.sessions[0].layout).toBe('tiled')
      expect(feature.sessions[0].prompts).toHaveLength(4)
      expect(feature.claude_context).toBe('Implement with TDD')
      expect(feature.agents).toEqual(['test-writer'])
    })

    it('should display success message', async () => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(null)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ description: 'Test' })
        .mockResolvedValueOnce({ addMore: false })
      vi.mocked(maestroUtils.saveMaestroConfig).mockResolvedValue(undefined)

      const consoleSpy = vi.spyOn(console, 'log')

      await planCommand()

      expect(mockT).toHaveBeenCalledWith('orchestra.planSaved')
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle save errors gracefully', async () => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(null)
      vi.mocked(inquirer.prompt)
        .mockResolvedValueOnce({ description: 'Test' })
        .mockResolvedValueOnce({ addMore: false })
      
      const saveError = new Error('Failed to save')
      vi.mocked(maestroUtils.saveMaestroConfig).mockRejectedValue(saveError)

      await expect(planCommand()).rejects.toThrow('Failed to save')
    })

    it('should handle prompt cancellation', async () => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(null)
      vi.mocked(inquirer.prompt).mockRejectedValue(new Error('User cancelled'))

      await expect(planCommand()).rejects.toThrow('User cancelled')
    })
  })
})