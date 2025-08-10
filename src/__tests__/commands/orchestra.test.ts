import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as inquirer from 'inquirer'
import { execa } from 'execa'
import chalk from 'chalk'
import { orchestraCommand } from '../../commands/orchestra.js'
import * as maestroUtils from '../../utils/maestro.js'
import * as orchestrationUtils from '../../utils/orchestration.js'
import * as i18n from '../../i18n/index.js'
import type { MaestroConfig } from '../../types/orchestration.js'

vi.mock('inquirer')
vi.mock('execa')
vi.mock('chalk')
vi.mock('../../utils/maestro.js')
vi.mock('../../utils/orchestration.js')
vi.mock('../../i18n/index.js')

describe('orchestra command', () => {
  const mockT = vi.fn((key: string) => key)
  
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(i18n.getTranslator).mockReturnValue(mockT)
    vi.mocked(chalk.cyan).mockImplementation((text) => text as any)
    vi.mocked(chalk.green).mockImplementation((text) => text as any)
    vi.mocked(chalk.yellow).mockImplementation((text) => text as any)
    vi.mocked(chalk.red).mockImplementation((text) => text as any)
    vi.mocked(chalk.gray).mockImplementation((text) => text as any)
    vi.mocked(chalk.bold).mockImplementation((text) => text as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('status subcommand', () => {
    it('should show status when no MAESTRO.yml exists', async () => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(null)
      const consoleSpy = vi.spyOn(console, 'log')

      await orchestraCommand({ status: true })

      expect(mockT).toHaveBeenCalledWith('orchestra.noOrchestration')
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should show orchestration status with tmux sessions', async () => {
      const config: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test project',
        orchestra: [
          {
            feature: 'auth',
            description: 'Authentication',
            base: 'main',
            sessions: [{
              name: 'dev',
              panes: 2,
              layout: 'even-horizontal',
              prompts: [],
            }],
          },
          {
            feature: 'api',
            description: 'API layer',
            base: 'main',
            sessions: [],
          },
        ],
      }

      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(config)
      vi.mocked(execa).mockResolvedValue({ 
        stdout: 'auth-dev: 1 windows\napi: 1 windows' 
      } as any)

      const consoleSpy = vi.spyOn(console, 'log')

      await orchestraCommand({ status: true })

      expect(mockT).toHaveBeenCalledWith('orchestra.orchestrationStatus')
      expect(execa).toHaveBeenCalledWith('tmux', ['list-sessions'], expect.any(Object))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('auth'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('api'))
    })

    it('should handle tmux not available', async () => {
      const config: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test project',
        orchestra: [
          {
            feature: 'test',
            description: 'Test feature',
            base: 'main',
            sessions: [],
          },
        ],
      }

      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(config)
      vi.mocked(execa).mockRejectedValue(new Error('tmux not found'))

      const consoleSpy = vi.spyOn(console, 'log')

      await orchestraCommand({ status: true })

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('orchestra.notRunning'))
    })
  })

  describe('attach subcommand', () => {
    const config: MaestroConfig = {
      version: '1.0',
      created: '2024-01-01T00:00:00Z',
      description: 'Test project',
      orchestra: [
        {
          feature: 'auth',
          description: 'Authentication',
          base: 'main',
          sessions: [{
            name: 'backend',
            panes: 2,
            layout: 'even-horizontal',
            prompts: [],
          }],
        },
        {
          feature: 'ui',
          description: 'User interface',
          base: 'main',
          sessions: [
            {
              name: 'frontend',
              panes: 2,
              layout: 'even-horizontal',
              prompts: [],
            },
            {
              name: 'storybook',
              panes: 1,
              layout: 'even-horizontal',
              prompts: [],
            },
          ],
        },
      ],
    }

    beforeEach(() => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(config)
    })

    it('should prompt for session selection when multiple exist', async () => {
      vi.mocked(execa).mockResolvedValue({ 
        stdout: 'auth-backend: 1 windows\nui-frontend: 1 windows\nui-storybook: 1 windows' 
      } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ session: 'ui-frontend' })
      vi.mocked(orchestrationUtils.attachToSession).mockResolvedValue(undefined)

      await orchestraCommand({ attach: true })

      expect(inquirer.prompt).toHaveBeenCalledWith([{
        type: 'list',
        name: 'session',
        message: expect.any(String),
        choices: expect.arrayContaining([
          expect.stringContaining('auth-backend'),
          expect.stringContaining('ui-frontend'),
          expect.stringContaining('ui-storybook'),
        ]),
      }])
      expect(orchestrationUtils.attachToSession).toHaveBeenCalledWith('ui-frontend', mockT)
    })

    it('should auto-attach when only one session exists', async () => {
      const singleConfig: MaestroConfig = {
        ...config,
        orchestra: [config.orchestra[0]],
      }
      
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(singleConfig)
      vi.mocked(execa).mockResolvedValue({ 
        stdout: 'auth-backend: 1 windows' 
      } as any)
      vi.mocked(orchestrationUtils.attachToSession).mockResolvedValue(undefined)

      await orchestraCommand({ attach: true })

      expect(inquirer.prompt).not.toHaveBeenCalled()
      expect(orchestrationUtils.attachToSession).toHaveBeenCalledWith('auth-backend', mockT)
    })

    it('should handle no running sessions', async () => {
      vi.mocked(execa).mockRejectedValue(new Error('no sessions'))
      const consoleSpy = vi.spyOn(console, 'log')

      await orchestraCommand({ attach: true })

      expect(mockT).toHaveBeenCalledWith('orchestra.noRunningSessions')
      expect(consoleSpy).toHaveBeenCalled()
      expect(orchestrationUtils.attachToSession).not.toHaveBeenCalled()
    })

    it('should handle specific feature attachment', async () => {
      vi.mocked(execa).mockResolvedValue({ 
        stdout: 'ui-frontend: 1 windows\nui-storybook: 1 windows' 
      } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ session: 'ui-storybook' })
      vi.mocked(orchestrationUtils.attachToSession).mockResolvedValue(undefined)

      await orchestraCommand({ attach: 'ui' })

      expect(inquirer.prompt).toHaveBeenCalledWith([{
        type: 'list',
        name: 'session',
        message: expect.any(String),
        choices: expect.arrayContaining([
          expect.stringContaining('ui-frontend'),
          expect.stringContaining('ui-storybook'),
        ]),
      }])
    })
  })

  describe('kill subcommand', () => {
    const config: MaestroConfig = {
      version: '1.0',
      created: '2024-01-01T00:00:00Z',
      description: 'Test project',
      orchestra: [
        {
          feature: 'auth',
          description: 'Authentication',
          base: 'main',
          sessions: [{
            name: 'dev',
            panes: 2,
            layout: 'even-horizontal',
            prompts: [],
          }],
        },
      ],
    }

    beforeEach(() => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(config)
    })

    it('should kill specific session', async () => {
      vi.mocked(execa).mockResolvedValue({ 
        stdout: 'auth-dev: 1 windows' 
      } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ 
        session: 'auth-dev',
        confirm: true,
      })

      const consoleSpy = vi.spyOn(console, 'log')

      await orchestraCommand({ kill: 'auth' })

      expect(execa).toHaveBeenCalledWith('tmux', ['kill-session', '-t', 'auth-dev'])
      expect(mockT).toHaveBeenCalledWith('orchestra.sessionKilled')
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should kill all sessions with --all flag', async () => {
      vi.mocked(execa).mockResolvedValue({ 
        stdout: 'auth-dev: 1 windows\napi-test: 1 windows' 
      } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true })

      await orchestraCommand({ kill: true, all: true })

      expect(execa).toHaveBeenCalledWith('tmux', ['kill-session', '-t', 'auth-dev'])
      expect(execa).toHaveBeenCalledWith('tmux', ['kill-session', '-t', 'api-test'])
      expect(mockT).toHaveBeenCalledWith('orchestra.allSessionsKilled')
    })

    it('should handle cancellation', async () => {
      vi.mocked(execa).mockResolvedValue({ 
        stdout: 'auth-dev: 1 windows' 
      } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ 
        session: 'auth-dev',
        confirm: false,
      })

      const consoleSpy = vi.spyOn(console, 'log')

      await orchestraCommand({ kill: 'auth' })

      expect(execa).not.toHaveBeenCalledWith('tmux', ['kill-session', '-t', 'auth-dev'])
      expect(mockT).toHaveBeenCalledWith('orchestra.killCancelled')
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('validate subcommand', () => {
    it('should validate valid MAESTRO.yml', async () => {
      const validConfig: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Valid project',
        orchestra: [
          {
            feature: 'valid-feature',
            description: 'Valid feature',
            base: 'main',
            sessions: [],
          },
        ],
      }

      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(validConfig)
      vi.mocked(maestroUtils.validateMaestroConfig).mockReturnValue(true)

      const consoleSpy = vi.spyOn(console, 'log')

      await orchestraCommand({ validate: true })

      expect(maestroUtils.validateMaestroConfig).toHaveBeenCalledWith(validConfig)
      expect(mockT).toHaveBeenCalledWith('orchestra.validationSuccess')
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should report validation errors', async () => {
      const invalidConfig = {
        version: '2.0', // Invalid version
        orchestra: [],
      } as any

      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(invalidConfig)
      vi.mocked(maestroUtils.validateMaestroConfig).mockReturnValue(false)

      const consoleSpy = vi.spyOn(console, 'error')

      await orchestraCommand({ validate: true })

      expect(mockT).toHaveBeenCalledWith('orchestra.validationFailed')
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should handle missing MAESTRO.yml', async () => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(null)

      const consoleSpy = vi.spyOn(console, 'log')

      await orchestraCommand({ validate: true })

      expect(mockT).toHaveBeenCalledWith('orchestra.noMaestroFile')
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('list (default) behavior', () => {
    it('should list all sessions when no subcommand provided', async () => {
      const config: MaestroConfig = {
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
              prompts: [],
            }],
          },
          {
            feature: 'feature2',
            description: 'Feature 2',
            base: 'main',
            sessions: [{
              name: 'test',
              panes: 1,
              layout: 'even-horizontal',
              prompts: [],
            }],
          },
        ],
      }

      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(config)
      vi.mocked(execa).mockResolvedValue({ 
        stdout: 'feature1-dev: 1 windows\nfeature2-test: 1 windows' 
      } as any)

      const consoleSpy = vi.spyOn(console, 'log')

      await orchestraCommand({})

      expect(mockT).toHaveBeenCalledWith('orchestra.runningSessions')
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('feature1-dev'))
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('feature2-test'))
    })

    it('should show message when no sessions are running', async () => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue({
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [],
      })
      vi.mocked(execa).mockRejectedValue(new Error('no sessions'))

      const consoleSpy = vi.spyOn(console, 'log')

      await orchestraCommand({})

      expect(mockT).toHaveBeenCalledWith('orchestra.noRunningSessions')
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle tmux errors gracefully', async () => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue({
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [{
          feature: 'test',
          description: 'Test',
          base: 'main',
          sessions: [],
        }],
      })
      
      const tmuxError = new Error('tmux: command not found')
      vi.mocked(execa).mockRejectedValue(tmuxError)

      const consoleSpy = vi.spyOn(console, 'log')

      await orchestraCommand({ status: true })

      // Should not throw, but handle gracefully
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should handle file read errors', async () => {
      const fileError = new Error('Permission denied')
      vi.mocked(maestroUtils.loadMaestroConfig).mockRejectedValue(fileError)

      await expect(orchestraCommand({ status: true })).rejects.toThrow('Permission denied')
    })

    it('should handle attachment errors', async () => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue({
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [{
          feature: 'test',
          description: 'Test',
          base: 'main',
          sessions: [{
            name: 'dev',
            panes: 2,
            layout: 'even-horizontal',
            prompts: [],
          }],
        }],
      })
      vi.mocked(execa).mockResolvedValue({ stdout: 'test-dev: 1 windows' } as any)
      vi.mocked(orchestrationUtils.attachToSession).mockRejectedValue(
        new Error('Failed to attach')
      )

      await expect(orchestraCommand({ attach: true })).rejects.toThrow('Failed to attach')
    })
  })

  describe('feature filtering', () => {
    const multiFeatureConfig: MaestroConfig = {
      version: '1.0',
      created: '2024-01-01T00:00:00Z',
      description: 'Multi-feature project',
      orchestra: [
        {
          feature: 'auth',
          description: 'Authentication',
          base: 'main',
          sessions: [
            { name: 'backend', panes: 2, layout: 'even-horizontal', prompts: [] },
            { name: 'frontend', panes: 2, layout: 'even-horizontal', prompts: [] },
          ],
        },
        {
          feature: 'api',
          description: 'API',
          base: 'main',
          sessions: [
            { name: 'server', panes: 3, layout: 'tiled', prompts: [] },
          ],
        },
        {
          feature: 'ui',
          description: 'UI',
          base: 'main',
          sessions: [
            { name: 'app', panes: 2, layout: 'even-horizontal', prompts: [] },
          ],
        },
      ],
    }

    beforeEach(() => {
      vi.mocked(maestroUtils.loadMaestroConfig).mockResolvedValue(multiFeatureConfig)
    })

    it('should filter sessions by feature name for status', async () => {
      vi.mocked(execa).mockResolvedValue({ 
        stdout: 'auth-backend: 1 windows\nauth-frontend: 1 windows\napi-server: 1 windows\nui-app: 1 windows' 
      } as any)

      const consoleSpy = vi.spyOn(console, 'log')

      await orchestraCommand({ status: 'auth' })

      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n')
      expect(output).toContain('auth')
      expect(output).toContain('backend')
      expect(output).toContain('frontend')
      expect(output).not.toContain('api')
      expect(output).not.toContain('ui')
    })

    it('should filter sessions for attachment', async () => {
      vi.mocked(execa).mockResolvedValue({ 
        stdout: 'auth-backend: 1 windows\nauth-frontend: 1 windows' 
      } as any)
      vi.mocked(inquirer.prompt).mockResolvedValue({ session: 'auth-backend' })
      vi.mocked(orchestrationUtils.attachToSession).mockResolvedValue(undefined)

      await orchestraCommand({ attach: 'auth' })

      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any
      expect(promptCall.choices).toHaveLength(2)
      expect(promptCall.choices.every((c: string) => c.includes('auth'))).toBe(true)
    })
  })
})