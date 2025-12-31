/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { init, t } from 'i18next';

// Import types from the main index
import type { ComplexTranslations, SimpleTranslations } from '../index.js';

let initialized = false;
let currentResources: Record<string, Record<string, Record<string, string>>> = {};

export const buildI18nResources = (
  translations: ComplexTranslations
) => {
  const resources: Record<string, Record<string, Record<string, string>>> = {};

  for(const key in translations) {
    const {locale, value, namespace} = translations[key];
    const lang = locale || 'en';
    const ns = namespace || 'translations';

    if(!resources[lang]) {
      resources[lang] = {};
    }
    if(!resources[lang][ns]) {
      resources[lang][ns] = {};
    }
    resources[lang][ns][key] = value;
  }

  return resources;
};

export const buildSimpleI18nResources = (
  translations: SimpleTranslations
) => {
  const resources: Record<string, Record<string, Record<string, string>>> = {};

  for(const key in translations) {
    const value = translations[key];
    const lang = 'en'; // Default to English
    const ns = 'translations'; // Default namespace

    if(!resources[lang]) {
      resources[lang] = {};
    }
    if(!resources[lang][ns]) {
      resources[lang][ns] = {};
    }
    resources[lang][ns][key] = value;
  }

  return resources;
};

export const initI18n = (
  translations: SimpleTranslations | ComplexTranslations
) => {
  if(initialized) {
    return;
  }

  let resources: Record<string, Record<string, Record<string, string>>> = {};

  // Check if it's a simple key-value format or complex format
  if (translations && Object.keys(translations).length > 0) {
    const firstKey = Object.keys(translations)[0];
    const firstValue = translations[firstKey];

    if (typeof firstValue === 'string') {
      // Simple key-value format
      resources = buildSimpleI18nResources(translations as SimpleTranslations);
    } else {
      // Complex format with locale and namespace
      resources = buildI18nResources(translations as ComplexTranslations);
    }
  }

  currentResources = resources;
  const defaultLang = Object.keys(resources)[0] || 'en';
  const namespaces = Object.keys(resources[defaultLang] || {});

  init({
    defaultNS: 'translations',
    fallbackLng: defaultLang,
    interpolation: {escapeValue: false},
    lng: defaultLang,
    ns: namespaces,
    resources
  });

  initialized = true;
};

export const updateI18nResources = (
  translations: ComplexTranslations
) => {
  const newResources = buildI18nResources(translations);

  Object.entries(newResources).forEach(([lng, namespaces]) => {
    Object.entries(namespaces).forEach(([ns, keys]) => {
      if(!currentResources[lng]) {
        currentResources[lng] = {};
      }
      if(!currentResources[lng][ns]) {
        currentResources[lng][ns] = {};
      }
      Object.assign(currentResources[lng][ns], keys);
    });
  });
};

export const i18n = (
  key: string,
  params?: Record<string, any>,
  lng?: string,
  ns?: string
): string => {
  if(!initialized) {
    return key;
  }

  return t(key, {
    ...(params || {}),
    lng,
    ns: ns || 'translations'
  });
};