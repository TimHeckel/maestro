import { en } from './en.js'
import { ja } from './ja.js'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import os from 'os'

export type Language = 'en' | 'ja'

class I18nManager {
  private currentLanguage: Language = 'ja' // Default to Japanese for backward compatibility
  private translations = { en, ja }

  constructor() {
    this.loadLanguage()
  }

  /**
   * Load language from config files
   * Priority: project .maestro.json > global config > system locale > default (ja)
   */
  private loadLanguage() {
    // For tests, always use Japanese for backward compatibility
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      this.currentLanguage = 'ja'
      return
    }

    // 1. Check project config
    const projectConfigPath = path.join(process.cwd(), '.maestro.json')
    if (existsSync(projectConfigPath)) {
      try {
        const config = JSON.parse(readFileSync(projectConfigPath, 'utf-8'))
        if (config.language && this.isValidLanguage(config.language)) {
          this.currentLanguage = config.language
          return
        }
      } catch {
        // Ignore errors, continue to next priority
      }
    }

    // 2. Check global config
    const globalConfigPath = path.join(os.homedir(), '.maestro', 'config.json')
    if (existsSync(globalConfigPath)) {
      try {
        const config = JSON.parse(readFileSync(globalConfigPath, 'utf-8'))
        if (config.language && this.isValidLanguage(config.language)) {
          this.currentLanguage = config.language
          return
        }
      } catch {
        // Ignore errors, continue to next priority
      }
    }

    // 3. Check system locale
    const locale = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES || ''
    if (locale.toLowerCase().includes('en')) {
      this.currentLanguage = 'en'
    } else if (locale.toLowerCase().includes('ja')) {
      this.currentLanguage = 'ja'
    }
    // Otherwise keep default (ja)
  }

  private isValidLanguage(lang: string): lang is Language {
    return lang === 'en' || lang === 'ja'
  }

  /**
   * Set the current language and save to project config
   */
  setLanguage(language: Language) {
    this.currentLanguage = language

    // Save to project config
    const projectConfigPath = path.join(process.cwd(), '.maestro.json')
    if (existsSync(projectConfigPath)) {
      try {
        const config = JSON.parse(readFileSync(projectConfigPath, 'utf-8'))
        config.language = language
        writeFileSync(projectConfigPath, JSON.stringify(config, null, 2) + '\n')
      } catch {
        // Ignore save errors
      }
    }

    // Also save to global config
    const globalConfigDir = path.join(os.homedir(), '.maestro')
    const globalConfigPath = path.join(globalConfigDir, 'config.json')
    try {
      if (!existsSync(globalConfigDir)) {
        mkdirSync(globalConfigDir, { recursive: true })
      }
      let globalConfig = {}
      if (existsSync(globalConfigPath)) {
        globalConfig = JSON.parse(readFileSync(globalConfigPath, 'utf-8'))
      }
      globalConfig = { ...globalConfig, language }
      writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2) + '\n')
    } catch {
      // Ignore save errors for global config
    }
  }

  /**
   * Get current language
   */
  getLanguage(): Language {
    return this.currentLanguage
  }

  /**
   * Get translation for a key path
   * @param keyPath - Dot-separated path to translation key (e.g., 'init.welcome')
   * @param params - Optional parameters for string interpolation
   */
  t(keyPath: string, params?: Record<string, string | number>): string {
    const keys = keyPath.split('.')
    let translation: any = this.translations[this.currentLanguage]

    for (const key of keys) {
      if (translation && typeof translation === 'object' && key in translation) {
        translation = translation[key]
      } else {
        // Fallback to English if key not found
        translation = this.getEnglishFallback(keyPath)
        break
      }
    }

    if (typeof translation !== 'string') {
      return keyPath // Return key if translation not found
    }

    // Replace parameters
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        translation = translation.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
      }
    }

    return translation
  }

  private getEnglishFallback(keyPath: string): string {
    const keys = keyPath.split('.')
    let translation: any = this.translations.en

    for (const key of keys) {
      if (translation && typeof translation === 'object' && key in translation) {
        translation = translation[key]
      } else {
        return keyPath
      }
    }

    return typeof translation === 'string' ? translation : keyPath
  }
}

// Export singleton instance
export const i18n = new I18nManager()

// Export convenience function
export function t(keyPath: string, params?: Record<string, string | number>): string {
  return i18n.t(keyPath, params)
}
