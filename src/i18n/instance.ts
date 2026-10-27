import i18next from 'i18next';

/**
 * The i18next instance, typed with only what this app uses. i18next's own
 * types need TypeScript 5, and the CRA build checks with 4.9, so everything
 * goes through this instead of importing i18next directly.
 */
export interface I18nInstance {
  language: string;
  resolvedLanguage?: string;
  options: Record<string, unknown>;
  use(module: unknown): I18nInstance;
  init(options: Record<string, unknown>): Promise<unknown>;
  t(key: string, options?: Record<string, unknown>): string;
  changeLanguage(language: string): Promise<unknown>;
  on(event: string, listener: (...args: any[]) => void): void;
}

export const i18n = i18next as unknown as I18nInstance;
