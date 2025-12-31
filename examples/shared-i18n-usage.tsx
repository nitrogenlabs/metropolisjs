/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import {useState} from 'react';
import {Metropolis} from '../src/index';
import {i18n} from '../src/utils/i18n';

import type {FC} from 'react';

// GothamJS would import t from i18next like this:
// import {t as i18n} from 'i18next';

// Mock GothamJS component that uses the same i18next instance
const GothamJSComponent: FC = () => {
  // In a real GothamJS component, you would import {t as i18n} from 'i18next'
  // This gives you the same function name as MetropolisJS for consistency
  // For this example, we'll simulate it by using the same i18n function
  // that MetropolisJS uses, which internally uses i18next

  return (
    <div className="gotham-component">
      <h2>{i18n('gotham_title')}</h2>
      <p>{i18n('gotham_description')}</p>
      <button>{i18n('gotham_action')}</button>
      <span>{i18n('shared_text')}</span>
    </div>
  );
};

// Shared translations that both MetropolisJS and GothamJS can use
const sharedTranslations = {
  // MetropolisJS specific translations
  'welcome': 'Welcome to MetropolisJS!',
  'save': 'Save',
  'cancel': 'Cancel',
  'loading': 'Loading...',

  // GothamJS specific translations
  'gotham_title': 'GothamJS Component',
  'gotham_description': 'This component uses the same i18next instance',
  'gotham_action': 'Gotham Action',

  // Shared translations that both libraries can use
  'shared_text': 'This text is shared between MetropolisJS and GothamJS',
  'common_button': 'Common Button',
  'error_message': 'An error occurred',
  'success_message': 'Operation completed successfully',

  // Interpolation examples
  'hello_user': 'Hello {{name}}!',
  'items_count': 'You have {{count}} items',
  'welcome_back': 'Welcome back, {{name}}! You have {{count}} new messages.'
};

// Example showing how both libraries work together
const ProjectX: FC = () => {
  return (
    <Metropolis
      translations={sharedTranslations}
      config={{
        development: {
          environment: 'development',
          app: {
            api: {
              url: 'https://api.projectx.com',
              public: 'https://api.projectx.com/public'
            },
            urls: {
              websocket: 'wss://ws.projectx.com'
            }
          }
        }
      }}
    >
      <div className="project-x">
        {/* MetropolisJS components */}
        <div className="metropolis-section">
          <h1>{i18n('welcome')}</h1>
          <p>{i18n('hello_user', {name: 'John'})}</p>
          <button>{i18n('save')}</button>
          <button>{i18n('cancel')}</button>
          <p>{i18n('shared_text')}</p>
        </div>

        {/* GothamJS components - using the same translations */}
        <GothamJSComponent />

        {/* More shared usage */}
        <div className="shared-section">
          <button>{i18n('common_button')}</button>
          <p>{i18n('items_count', {count: 5})}</p>
          <p>{i18n('welcome_back', {name: 'Alice', count: 3})}</p>
        </div>
      </div>
    </Metropolis>
  );
};

// Example of how GothamJS would typically be used in a real project
const RealWorldExample: FC = () => {
  // In a real project, GothamJS would be imported like this:
  // import {GothamComponent} from '@nlabs/gothamjs';
  // import {t} from 'i18next';

  return (
    <Metropolis
      translations={{
        'metropolis_title': 'MetropolisJS Dashboard',
        'gotham_widget_title': 'GothamJS Widget',
        'shared_status': 'Status: {{status}}',
        'shared_user_info': 'User: {{username}} ({{role}})',
        'shared_actions_edit': 'Edit',
        'shared_actions_delete': 'Delete',
        'shared_actions_view': 'View',
        'shared_actions_create': 'Create'
      }}
    >
      <div>
        {/* MetropolisJS components */}
        <header>
          <h1>{i18n('metropolis_title')}</h1>
        </header>

        {/* GothamJS components would use the same translations */}
        <div className="gotham-widget">
          {/* In real GothamJS:
          <GothamWidget
            title={t('gotham_widget_title')}
            status={t('shared_status', {status: 'active'})}
            userInfo={t('shared_user_info', {username: 'john', role: 'admin'})}
            actions={{
              edit: t('shared_actions.edit'),
              delete: t('shared_actions.delete'),
              view: t('shared_actions.view')
            }}
          />
          */}
        </div>
      </div>
    </Metropolis>
  );
};

// Example showing dynamic translation updates
const DynamicTranslationExample: FC = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const translations = {
    en: {
      'welcome': 'Welcome to ProjectX!',
      'gotham_title': 'GothamJS Component',
      'shared_text': 'Shared text in English'
    },
    es: {
      'welcome': '¡Bienvenido a ProjectX!',
      'gotham_title': 'Componente GothamJS',
      'shared_text': 'Texto compartido en español'
    },
    fr: {
      'welcome': 'Bienvenue sur ProjectX!',
      'gotham_title': 'Composant GothamJS',
      'shared_text': 'Texte partagé en français'
    }
  };

  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    // Both MetropolisJS and GothamJS would automatically
    // use the new language since they share the same i18next instance
  };

  return (
    <Metropolis translations={translations[currentLanguage]}>
      <div>
        <div className="language-selector">
          <button onClick={() => handleLanguageChange('en')}>English</button>
          <button onClick={() => handleLanguageChange('es')}>Español</button>
          <button onClick={() => handleLanguageChange('fr')}>Français</button>
        </div>

        {/* MetropolisJS component */}
        <div className="metropolis">
          <h1>{i18n('welcome')}</h1>
        </div>

        {/* GothamJS component - automatically uses the same language */}
        <div className="gotham">
          <h2>{i18n('gotham_title')}</h2>
          <p>{i18n('shared_text')}</p>
        </div>
      </div>
    </Metropolis>
  );
};

export {
  DynamicTranslationExample,
  GothamJSComponent, ProjectX,
  RealWorldExample, sharedTranslations
};

