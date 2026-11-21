import 'server-only';
import type { Locale } from './config';

const dictionaries = {
  en: () => import('./dictionaries/en.json').then((module) => module.default),
  fa: () => import('./dictionaries/fa.json').then((module) => module.default),
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)['en']>>;

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}