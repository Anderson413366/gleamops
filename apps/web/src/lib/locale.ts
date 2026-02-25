import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@gleamops/shared';

const BASE_LANGUAGE_MAP: Record<string, Locale> = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  pt: 'pt-BR',
  ro: 'ro',
};

const INTL_LOCALE_MAP: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  'pt-BR': 'pt-BR',
  ro: 'ro-RO',
};

export function toSupportedLocale(candidate: string | null | undefined): Locale | null {
  if (!candidate) return null;

  const normalized = candidate.trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === lower);
  if (exact) return exact;

  const baseLanguage = lower.split('-')[0] ?? '';
  return BASE_LANGUAGE_MAP[baseLanguage] ?? null;
}

export function resolvePreferredLocale(candidates: ReadonlyArray<string | null | undefined>): Locale {
  for (const candidate of candidates) {
    const resolved = toSupportedLocale(candidate);
    if (resolved) return resolved;
  }
  return DEFAULT_LOCALE;
}

export function getIntlLocale(locale: Locale): string {
  return INTL_LOCALE_MAP[locale] ?? INTL_LOCALE_MAP[DEFAULT_LOCALE];
}
