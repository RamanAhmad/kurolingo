/**
 * i18n/index.js — Kurdolingo Internationalization Engine
 *
 * Neue Sprache hinzufügen:
 *   1. src/i18n/locales/xx.js erstellen (de.js als Vorlage)
 *      RTL: _meta: { dir: 'rtl' } setzen
 *   2. Hier: import + LOCALES + AVAILABLE_LANGS Eintrag
 *   3. Fertig — kein weiterer Code nötig
 *
 * Verwendung:
 *   const t = useT();
 *   t('lesson.check')                   → "Prüfen" / "Check" / "تحقق"
 *   t('home.welcome', { name: 'Ali' })  → "Willkommen, Ali!"
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';

import de from './locales/de';
import en from './locales/en';
import ar from './locales/ar';
import ku from './locales/ku';
import fr from './locales/fr';
import tr from './locales/tr';
import fa from './locales/fa';

const LOCALES = { de, en, ar, ku, fr, tr, fa };

// ── Language store (persisted in localStorage) ────────────────────────────────
export const useLangStore = create(
  persist(
    (set) => ({
      lang: 'de',
      setLang: (lang) => { if (LOCALES[lang]) set({ lang }); },
    }),
    { name: 'kl-lang' }
  )
);

// ── RTL hook: syncs <html dir> and <html lang> ────────────────────────────────
export function useRTL() {
  const lang = useLangStore(s => s.lang);
  useEffect(() => {
    const dir = LOCALES[lang]?._meta?.dir || 'ltr';
    document.documentElement.dir  = dir;
    document.documentElement.lang = lang;
  }, [lang]);
  return LOCALES[lang]?._meta?.dir === 'rtl';
}

// ── Translation hook ──────────────────────────────────────────────────────────
export function useT() {
  const lang    = useLangStore(s => s.lang);
  const strings = LOCALES[lang] || LOCALES.de;

  return function t(key, vars = {}) {
    const val = key.split('.').reduce((obj, k) => obj?.[k], strings);
    if (val === undefined) {
      const fallback = key.split('.').reduce((obj, k) => obj?.[k], LOCALES.de);
      if (fallback === undefined) return key;
      return interpolate(fallback, vars);
    }
    return interpolate(val, vars);
  };
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str ?? '';
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}

// ── Available languages for picker ───────────────────────────────────────────
export const AVAILABLE_LANGS = [
  { code: 'de', label: 'Deutsch',  flag: '🇩🇪', dir: 'ltr' },
  { code: 'en', label: 'English',  flag: '🇬🇧', dir: 'ltr' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'tr', label: 'Türkçe',   flag: '🇹🇷', dir: 'ltr' },
  { code: 'ku', label: 'Kurdî',    flag: 'KU_FLAG', dir: 'ltr' },
  { code: 'ar', label: 'العربية',  flag: '🇸🇦', dir: 'rtl' },
  { code: 'fa', label: 'فارسی',    flag: '🇮🇷', dir: 'rtl' },
];

export function isRTL(lang) {
  return LOCALES[lang]?._meta?.dir === 'rtl';
}
