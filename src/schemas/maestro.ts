import { z } from 'zod'

// Zod schemas for MAESTRO.yml validation

export const SessionConfigSchema = z.object({
  name: z.string().min(1, 'Session name is required'),
  panes: z.number().min(1).max(30, 'Panes must be between 1 and 30'),
  layout: z
    .enum(['even-horizontal', 'even-vertical', 'main-horizontal', 'main-vertical', 'tiled'])
    .optional(),
  prompts: z.array(z.string()),
})

export const FeatureConfigSchema = z.object({
  feature: z.string().min(1, 'Feature name is required').regex(/^[a-zA-Z0-9-_]+$/, 'Feature name must be alphanumeric with dashes/underscores'),
  description: z.string().min(1, 'Description is required'),
  base: z.string().optional(),
  sessions: z.array(SessionConfigSchema),
  claude_context: z.string().optional(),
  agents: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
})

export const OrchestraSettingsSchema = z.object({
  parallel_creation: z.boolean().optional().default(true),
  auto_install_deps: z.boolean().optional().default(true),
  claude_md_mode: z.enum(['shared', 'split']).optional().default('split'),
  base_branch: z.string().optional().default('main'),
})

export const MaestroConfigSchema = z.object({
  version: z.string().regex(/^\d+\.\d+$/, 'Version must be in format X.Y'),
  created: z.string(), // Will be validated as date string
  description: z.string().optional(),
  orchestra: z.array(FeatureConfigSchema),
  settings: OrchestraSettingsSchema.optional(),
})

// Validation helper
export function validateMaestroConfig(config: unknown): z.infer<typeof MaestroConfigSchema> {
  return MaestroConfigSchema.parse(config)
}

// Type exports
export type MaestroConfig = z.infer<typeof MaestroConfigSchema>
export type FeatureConfig = z.infer<typeof FeatureConfigSchema>
export type SessionConfig = z.infer<typeof SessionConfigSchema>
export type OrchestraSettings = z.infer<typeof OrchestraSettingsSchema>