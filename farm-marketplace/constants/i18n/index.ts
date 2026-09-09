import { LanguageCode, LanguageOption, TranslationKeys } from './types';
import { en } from './en';
import { hi } from './hi';
import { kn } from './kn';
import { ml } from './ml';

export * from './types';

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
];

export const translations: Record<LanguageCode, TranslationKeys> = {
  en,
  hi,
  kn,
  ml,
};

export const defaultLanguage: LanguageCode = 'en';

export function getTranslation(lang: LanguageCode): TranslationKeys {
  return translations[lang] || translations[defaultLanguage];
}
