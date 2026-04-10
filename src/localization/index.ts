import commands from './en/commands.json';
import common from './en/common.json';
import errors from './en/errors.json';
import interactions from './en/interactions.json';

const resources = {
  en: {
    common,
    errors,
    commands,
    interactions,
  },
} as const;

type Locale = keyof typeof resources;
type TranslationParams = Record<string, string | number>;

function getNestedValue(source: unknown, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((currentValue, segment) => {
    if (currentValue && typeof currentValue === 'object' && segment in currentValue) {
      return (currentValue as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);

  return typeof value === 'string' ? value : undefined;
}

export function t(
  key: string,
  params: TranslationParams = {},
  locale: Locale = 'en'
): string {
  const template = getNestedValue(resources[locale], key);

  if (!template) {
    return key;
  }

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => {
    return String(params[token] ?? `{{${token}}}`);
  });
}

export { resources };
