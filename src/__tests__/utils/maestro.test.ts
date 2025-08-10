import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'js-yaml'
import {
  loadMaestroConfig,
  saveMaestroConfig,
  validateMaestroConfig,
  resolveDependencies,
} from '../../utils/maestro.js'
import { maestroConfigSchema } from '../../schemas/maestro.js'
import type { MaestroConfig, FeatureConfig } from '../../types/orchestration.js'

vi.mock('fs/promises')
vi.mock('js-yaml')

describe('maestro utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadMaestroConfig', () => {
    it('should load and parse MAESTRO.yml', async () => {
      const mockConfig: MaestroConfig = {
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

      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue('yaml content')
      vi.mocked(yaml.load).mockReturnValue(mockConfig)

      const result = await loadMaestroConfig()

      expect(fs.access).toHaveBeenCalledWith('MAESTRO.yml')
      expect(fs.readFile).toHaveBeenCalledWith('MAESTRO.yml', 'utf8')
      expect(yaml.load).toHaveBeenCalledWith('yaml content')
      expect(result).toEqual(mockConfig)
    })

    it('should return null when MAESTRO.yml does not exist', async () => {
      const error = new Error('File not found') as any
      error.code = 'ENOENT'
      vi.mocked(fs.access).mockRejectedValue(error)

      const result = await loadMaestroConfig()

      expect(result).toBeNull()
    })

    it('should throw error for invalid YAML', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue('invalid: yaml: content:')
      vi.mocked(yaml.load).mockImplementation(() => {
        throw new Error('Invalid YAML')
      })

      await expect(loadMaestroConfig()).rejects.toThrow('Failed to load MAESTRO.yml: Invalid YAML')
    })

    it('should handle empty file', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.readFile).mockResolvedValue('')
      vi.mocked(yaml.load).mockReturnValue(null)

      const result = await loadMaestroConfig()

      expect(result).toBeNull()
    })
  })

  describe('saveMaestroConfig', () => {
    it('should save config as YAML', async () => {
      const config: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test project',
        orchestra: [
          {
            feature: 'auth',
            description: 'Authentication',
            base: 'main',
            sessions: [
              {
                name: 'dev',
                panes: 3,
                layout: 'tiled',
                prompts: ['npm run dev', 'npm test', 'git status'],
              },
            ],
            claude_context: 'Implement OAuth2',
            agents: ['code-reviewer'],
            dependencies: [],
          },
        ],
        settings: {
          parallel: true,
          auto_attach: false,
        },
      }

      const yamlString = 'mocked yaml string'
      vi.mocked(yaml.dump).mockReturnValue(yamlString)
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await saveMaestroConfig(config)

      expect(yaml.dump).toHaveBeenCalledWith(config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false,
        quotingType: '"',
        forceQuotes: false,
      })
      expect(fs.writeFile).toHaveBeenCalledWith('MAESTRO.yml', yamlString, 'utf8')
    })

    it('should handle write errors', async () => {
      const config: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [],
      }

      vi.mocked(yaml.dump).mockReturnValue('yaml')
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Permission denied'))

      await expect(saveMaestroConfig(config)).rejects.toThrow('Permission denied')
    })

    it('should handle YAML serialization errors', async () => {
      const config: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [],
      }

      vi.mocked(yaml.dump).mockImplementation(() => {
        throw new Error('Circular reference')
      })

      await expect(saveMaestroConfig(config)).rejects.toThrow('Circular reference')
    })
  })

  describe('validateMaestroConfig', () => {
    it('should validate valid config', () => {
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

      const result = validateMaestroConfig(validConfig)

      expect(result).toBe(true)
    })

    it('should reject invalid version', () => {
      const invalidConfig = {
        version: '1.0', // Valid version - schema accepts format X.Y
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [],
      }

      // Try with actually invalid version format
      const actuallyInvalidConfig = {
        version: 'invalid', // Not X.Y format
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [],
      }

      const result = validateMaestroConfig(actuallyInvalidConfig as any)

      expect(result).toBe(false)
    })

    it('should reject missing required fields', () => {
      const invalidConfig = {
        version: '1.0',
        // Missing created and orchestra
      }

      const result = validateMaestroConfig(invalidConfig as any)

      expect(result).toBe(false)
    })

    it('should reject invalid feature structure', () => {
      const invalidConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        orchestra: [
          {
            // Missing required fields
            feature: 'test',
          },
        ],
      }

      const result = validateMaestroConfig(invalidConfig as any)

      expect(result).toBe(false)
    })

    it('should validate session structure', () => {
      const configWithSessions: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [
          {
            feature: 'test',
            description: 'Test',
            base: 'main',
            sessions: [
              {
                name: 'dev',
                panes: 3,
                layout: 'tiled',
                prompts: ['cmd1', 'cmd2', 'cmd3'],
              },
            ],
          },
        ],
      }

      const result = validateMaestroConfig(configWithSessions)

      expect(result).toBe(true)
    })

    it('should reject invalid pane count', () => {
      const invalidConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        orchestra: [
          {
            feature: 'test',
            description: 'Test',
            base: 'main',
            sessions: [
              {
                name: 'dev',
                panes: 50, // Too many panes
                layout: 'tiled',
                prompts: [],
              },
            ],
          },
        ],
      }

      const result = validateMaestroConfig(invalidConfig as any)

      expect(result).toBe(false)
    })

    it('should validate optional fields', () => {
      const configWithOptionals: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test with optionals',
        orchestra: [
          {
            feature: 'test',
            description: 'Test',
            base: 'develop',
            sessions: [],
            claude_context: 'Use TypeScript',
            agents: ['code-reviewer', 'test-writer'],
            dependencies: ['auth', 'api'],
          },
        ],
        settings: {
          parallel: true,
          auto_attach: true,
          default_layout: 'tiled',
        },
      }

      const result = validateMaestroConfig(configWithOptionals)

      expect(result).toBe(true)
    })
  })

  describe('resolveDependencies', () => {
    const configWithDeps: MaestroConfig = {
      version: '1.0',
      created: '2024-01-01T00:00:00Z',
      description: 'Test',
      orchestra: [
        {
          feature: 'auth',
          description: 'Authentication',
          base: 'main',
          sessions: [],
        },
        {
          feature: 'api',
          description: 'API',
          base: 'main',
          sessions: [],
          dependencies: ['auth'],
        },
        {
          feature: 'ui',
          description: 'UI',
          base: 'main',
          sessions: [],
          dependencies: ['auth', 'api'],
        },
        {
          feature: 'admin',
          description: 'Admin',
          base: 'main',
          sessions: [],
          dependencies: ['ui'],
        },
      ],
    }

    it('should resolve simple dependencies', () => {
      const result = resolveDependencies(['api'], configWithDeps)

      expect(result).toEqual(['auth', 'api'])
    })

    it('should resolve nested dependencies', () => {
      const result = resolveDependencies(['ui'], configWithDeps)

      expect(result).toEqual(['auth', 'api', 'ui'])
    })

    it('should resolve deep nested dependencies', () => {
      const result = resolveDependencies(['admin'], configWithDeps)

      expect(result).toEqual(['auth', 'api', 'ui', 'admin'])
    })

    it('should handle multiple features', () => {
      const result = resolveDependencies(['api', 'admin'], configWithDeps)

      expect(result).toEqual(['auth', 'api', 'ui', 'admin'])
    })

    it('should handle features with no dependencies', () => {
      const result = resolveDependencies(['auth'], configWithDeps)

      expect(result).toEqual(['auth'])
    })

    it('should detect circular dependencies', () => {
      const circularConfig: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [
          {
            feature: 'a',
            description: 'A',
            base: 'main',
            sessions: [],
            dependencies: ['b'],
          },
          {
            feature: 'b',
            description: 'B',
            base: 'main',
            sessions: [],
            dependencies: ['c'],
          },
          {
            feature: 'c',
            description: 'C',
            base: 'main',
            sessions: [],
            dependencies: ['a'],
          },
        ],
      }

      expect(() => resolveDependencies(['a'], circularConfig)).toThrow(
        'Circular dependency detected'
      )
    })

    it('should handle self-referential dependencies', () => {
      const selfRefConfig: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [
          {
            feature: 'self',
            description: 'Self',
            base: 'main',
            sessions: [],
            dependencies: ['self'],
          },
        ],
      }

      expect(() => resolveDependencies(['self'], selfRefConfig)).toThrow(
        'Circular dependency detected'
      )
    })

    it('should handle missing dependencies gracefully', () => {
      const missingDepConfig: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [
          {
            feature: 'orphan',
            description: 'Orphan',
            base: 'main',
            sessions: [],
            dependencies: ['non-existent'],
          },
        ],
      }

      // Should skip non-existent dependencies
      const result = resolveDependencies(['orphan'], missingDepConfig)
      expect(result).toEqual(['orphan'])
    })

    it('should maintain correct order with complex dependencies', () => {
      const complexConfig: MaestroConfig = {
        version: '1.0',
        created: '2024-01-01T00:00:00Z',
        description: 'Test',
        orchestra: [
          {
            feature: 'base1',
            description: 'Base 1',
            base: 'main',
            sessions: [],
          },
          {
            feature: 'base2',
            description: 'Base 2',
            base: 'main',
            sessions: [],
          },
          {
            feature: 'middle1',
            description: 'Middle 1',
            base: 'main',
            sessions: [],
            dependencies: ['base1'],
          },
          {
            feature: 'middle2',
            description: 'Middle 2',
            base: 'main',
            sessions: [],
            dependencies: ['base2'],
          },
          {
            feature: 'top',
            description: 'Top',
            base: 'main',
            sessions: [],
            dependencies: ['middle1', 'middle2'],
          },
        ],
      }

      const result = resolveDependencies(['top'], complexConfig)
      
      // Dependencies should come before dependents
      expect(result.indexOf('base1')).toBeLessThan(result.indexOf('middle1'))
      expect(result.indexOf('base2')).toBeLessThan(result.indexOf('middle2'))
      expect(result.indexOf('middle1')).toBeLessThan(result.indexOf('top'))
      expect(result.indexOf('middle2')).toBeLessThan(result.indexOf('top'))
      expect(result).toEqual(['base1', 'middle1', 'base2', 'middle2', 'top'])
    })

    it('should handle empty feature list', () => {
      const result = resolveDependencies([], configWithDeps)
      expect(result).toEqual([])
    })
  })
})