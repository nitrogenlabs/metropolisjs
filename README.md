# MetropolisJS: Seamless Frontend-Backend Integration Framework

> **The Ultimate Frontend Integration Library for Modern Web Applications**

[![npm version](https://img.shields.io/npm/v/@nlabs/metropolisjs.svg?style=flat-square)](https://www.npmjs.com/package/@nlabs/metropolisjs)
[![npm downloads](https://img.shields.io/npm/dm/@nlabs/metropolisjs.svg?style=flat-square)](https://www.npmjs.com/package/@nlabs/metropolisjs)
[![Issues](http://img.shields.io/github/issues/nitrogenlabs/metropolisjs.svg?style=flat-square)](https://github.com/nitrogenlabs/metropolisjs/issues)
[![TypeScript](https://badges.frapsoft.com/typescript/version/typescript-next.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![Chat](https://img.shields.io/discord/446122412715802649.svg)](https://discord.gg/Ttgev58)

MetropolisJS is the bridge that connects your frontend dreams to backend reality. Built on the powerful combination of **Reaktor** (backend services) and **ArkhamJS** (frontend data store), MetropolisJS provides a seamless, real-time integration layer that handles everything from user authentication to real-time messaging and notifications.

## 🚀 Why MetropolisJS?

### ✨ **Seamless Integration**

Connect your React frontend to Reaktor-powered backend services with zero configuration headaches. MetropolisJS handles all the complex data flow, state management, and real-time communication.

### 🔄 **Real-Time Everything**

Built-in WebSocket and Server-Sent Events (SSE) support for instant messaging, live notifications, and real-time data synchronization. Your users will never miss a beat.

### 🛡️ **Type-Safe & Reliable**

Full TypeScript support with comprehensive type definitions. Catch errors at compile time, not runtime.

### 🎯 **Developer Experience First**

Clean, intuitive APIs that make complex operations feel simple. Focus on building features, not boilerplate.

## 🎯 What Can You Build?

MetropolisJS powers applications that need:

- **🔐 User Authentication & Authorization**
- **💬 Real-Time Messaging Systems**
- **🔔 Live Notifications**
- **📱 Social Media Features** (posts, reactions, tags)
- **📍 Location-Based Services**
- **🖼️ Media Management** (images, files)
- **📅 Event Management**
- **👥 User Connections & Relationships**

## 🛠️ Quick Start

### Installation

```bash
npm install @nlabs/metropolisjs @nlabs/arkhamjs @nlabs/arkhamjs-utils-react
```

### Basic Setup

```tsx
import {Metropolis, useUserActions, useMessageActions, useWebsocketActions} from '@nlabs/metropolisjs';

const App = () => {
  return (
    <Metropolis config={{
      development: {
        environment: 'development',
        app: {
          api: {
            url: 'http://localhost:3000/app',
            public: 'http://localhost:3000/public'
          }
        }
      }
    }}>
      <YourApp />
    </Metropolis>
  );
};

const YourApp = () => {
  // Use specialized hooks for better performance
  const userActions = useUserActions();
  const messageActions = useMessageActions();
  const websocketActions = useWebsocketActions();

  // Start building amazing features!
  return <div>Your app content</div>;
};
```

### Using Actions

MetropolisJS provides multiple ways to access actions:

```tsx
// Option 1: Specialized hooks (recommended - best performance)
const userActions = useUserActions();
const postActions = usePostActions();

// Option 2: Selective creation
const {userActions, postActions} = useMetropolis(['user', 'post']);

// Option 3: All actions (default behavior)
const {userActions, postActions, messageActions} = useMetropolis();
```

## ⚙️ Configuration

The `Metropolis` component accepts three main props: `config`, `adapters`, and `translations`. Here's how to configure each:

### Configuration Object

The `config` prop accepts a `MetropolisConfiguration` object that supports environment-specific settings:

```tsx
<Metropolis
  config={{
    // Environment-specific configurations
    development: {
      environment: 'development',
      app: {
        api: {
          url: 'http://localhost:3000/app',
          public: 'http://localhost:3000/public',
          uploadImage: 'http://localhost:3000/upload'
        },
        urls: {
          websocket: 'ws://localhost:3000'
        },
        session: {
          maxMinutes: 1440, // 24 hours
          minMinutes: 15
        },
        name: 'My App',
        version: '1.0.0'
      },
      isAuth: () => {
        // Custom authentication check
        const session = flux.getState('user.session', {});
        return !!session.userActive;
      }
    },
    production: {
      environment: 'production',
      app: {
        api: {
          url: 'https://api.example.com/app',
          public: 'https://api.example.com/public',
          uploadImage: 'https://api.example.com/upload'
        },
        urls: {
          websocket: 'wss://api.example.com'
        },
        session: {
          maxMinutes: 2880, // 48 hours
          minMinutes: 30
        }
      }
    }
  }}
>
  <YourApp />
</Metropolis>
```

#### Configuration Options

**Environment Configuration** (`MetropolisEnvironmentConfiguration`):
- `environment`: `'development' | 'production' | 'test' | 'local'` - Current environment
- `app`: Application-specific configuration
  - `api`: API endpoint configuration
    - `url`: Main API endpoint
    - `public`: Public API endpoint
    - `uploadImage`: Image upload endpoint
  - `urls`: Additional URL configurations
    - `websocket`: WebSocket server URL
  - `session`: Session management settings
    - `maxMinutes`: Maximum session duration in minutes
    - `minMinutes`: Minimum session duration in minutes
  - `name`: Application name
  - `version`: Application version
- `isAuth`: Function that returns a boolean indicating if the user is authenticated
- `adapters`: Custom adapters (can also be passed as a separate prop)

### Custom Adapters

Pass custom adapters to override default data transformation behavior:

```tsx
import {parseUser, parseMessage} from '@nlabs/metropolisjs';

<Metropolis
  adapters={{
    User: parseUser,
    Message: parseMessage,
    // Add other custom adapters as needed
    Content: customContentAdapter,
    Event: customEventAdapter,
    Image: customImageAdapter,
    Location: customLocationAdapter,
    Post: customPostAdapter,
    Profile: customProfileAdapter,
    Reaction: customReactionAdapter,
    Tag: customTagAdapter,
    Translation: customTranslationAdapter
  }}
>
  <YourApp />
</Metropolis>
```

### Translations

MetropolisJS supports both simple and complex translation formats:

#### Simple Translations

```tsx
<Metropolis
  translations={{
    'welcome': 'Welcome to MetropolisJS!',
    'save': 'Save',
    'cancel': 'Cancel',
    'hello_user': 'Hello {{name}}!',
    'items_count': 'You have {{count}} items'
  }}
>
  <YourApp />
</Metropolis>
```

#### Complex Translations (with locale and namespace)

```tsx
<Metropolis
  translations={{
    'welcome': {
      value: 'Welcome to MetropolisJS!',
      locale: 'en',
      namespace: 'common'
    },
    'save': {
      value: 'Save',
      locale: 'en',
      namespace: 'actions'
    }
  }}
>
  <YourApp />
</Metropolis>
```

### Complete Configuration Example

```tsx
import {Metropolis} from '@nlabs/metropolisjs';
import {parseUser, parseMessage} from '@nlabs/metropolisjs';

const App = () => {
  return (
    <Metropolis
      config={{
        development: {
          environment: 'development',
          app: {
            api: {
              url: 'http://localhost:3000/app',
              public: 'http://localhost:3000/public'
            },
            urls: {
              websocket: 'ws://localhost:3000'
            },
            session: {
              maxMinutes: 1440,
              minMinutes: 15
            }
          },
          isAuth: () => {
            // Your custom auth logic
            return true;
          }
        },
        production: {
          environment: 'production',
          app: {
            api: {
              url: 'https://api.example.com/app',
              public: 'https://api.example.com/public'
            },
            urls: {
              websocket: 'wss://api.example.com'
            }
          }
        }
      }}
      adapters={{
        User: parseUser,
        Message: parseMessage
      }}
      translations={{
        'welcome': 'Welcome!',
        'save': 'Save',
        'cancel': 'Cancel'
      }}
    >
      <YourApp />
    </Metropolis>
  );
};
```

### Environment Detection

MetropolisJS automatically detects the environment based on:
1. The `environment` property in your config
2. `process.env.stage` (if set)
3. `process.env.NODE_ENV` (fallback)
4. Defaults to `'local'` if none are set

The configuration system will merge environment-specific settings with default values, allowing you to override only what you need.

### User Authentication Example

```tsx
import {useUserActions} from '@nlabs/metropolisjs';

const LoginForm = () => {
  const userActions = useUserActions(); // Specialized hook - only creates user actions
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const session = await userActions.signIn(username, password);
      console.log('User logged in successfully!', session);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Sign In</button>
    </form>
  );
};
```

### Real-Time Messaging

```tsx
import {useMessageActions, useWebsocketActions} from '@nlabs/metropolisjs';

const ChatComponent = () => {
  const messageActions = useMessageActions();
  const websocketActions = useWebsocketActions();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Initialize WebSocket connection
    websocketActions.wsInit();

    // Load existing messages
    messageActions.list().then(setMessages);
  }, []);

  const sendMessage = async (content) => {
    await messageActions.add({ content });
    // Message automatically appears in real-time for all connected users!
  };

  return (
    <div>
      {messages.map(message => (
        <div key={message.messageId}>{message.content}</div>
      ))}
      <button onClick={() => sendMessage('Hello World!')}>
        Send Message
      </button>
    </div>
  );
};
```

## 🏗️ Architecture

MetropolisJS is built on a powerful three-layer architecture with modern React patterns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   MetropolisJS  │    │   Reaktor       │
│                 │◄──►│                 │◄──►│   Backend       │
│   UI Layer      │    │   Integration   │    │   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │   ArkhamJS      │
         │              │   Data Store    │
         │              │                 │
         │              └─────────────────┘
         │
         ▼
┌─────────────────┐
│  React Context   │
│  (Config/Flux)   │
└─────────────────┘
```

### 🔧 Core Components

- **Actions**: Handle all API interactions and business logic (factory pattern)
- **Adapters**: Transform data between frontend and backend formats
- **Stores**: Manage application state with ArkhamJS
- **WebSocket Actions**: Handle real-time communication
- **Configuration**: Context-based configuration (React best practices)
- **Hooks**: Specialized hooks for accessing actions and configuration

### 🎯 Modern Architecture Features

MetropolisJS follows React best practices:

- **Context-Based Configuration**: No global state, configuration through React Context
- **Factory Pattern**: Functional action creation with dependency injection
- **Selective Action Creation**: Only create actions you need for better performance
- **Type Safety**: Full TypeScript support with proper type inference
- **Specialized Hooks**: Individual hooks for each action type
- **Flux State Integration**: Configuration stored in flux state for non-React code access

## 📚 Available Actions

MetropolisJS provides comprehensive actions for all your needs. Access them using specialized hooks or the main `useMetropolis()` hook:

### Specialized Hooks (Recommended)

- `useUserActions()` - Authentication, profiles, user management
- `useMessageActions()` - Real-time messaging and conversations
- `usePostActions()` - Social media posts and content
- `useReactionActions()` - Likes, reactions, and interactions
- `useTagActions()` - Content categorization and discovery
- `useEventActions()` - Event management and scheduling
- `useImageActions()` - Media upload and management
- `useLocationActions()` - Geolocation and location-based features
- `useWebsocketActions()` - Real-time communication setup
- `useContentActions()` - Content management
- `useProfileActions()` - Profile management
- `useTranslationActions()` - Translation management

### Using Actions

```tsx
// Recommended: Use specialized hooks (only creates what you need)
const userActions = useUserActions();
const postActions = usePostActions();

// Alternative: Selective creation
const {userActions, postActions} = useMetropolis(['user', 'post']);

// Alternative: All actions (creates all action types)
const {userActions, postActions, messageActions} = useMetropolis();
```

## 🏭 Factory Pattern Guide

MetropolisJS has been refactored to use a **factory function pattern** for actions instead of class-based approaches. This provides better functional programming practices, improved testability, and enhanced flexibility through dependency injection.

### Key Benefits

1. **Functional Programming**: Pure functions instead of classes with side effects
2. **Better Testability**: Easier to mock and test individual functions
3. **Composability**: Actions can be easily combined and extended
4. **Dependency Injection**: Custom adapters can be injected and merged with defaults
5. **Backward Compatibility**: Legacy class wrappers maintain existing API compatibility

### Basic Usage

#### Before (Class-based)

```typescript
import {userActions} from '../actions/userActions';

const userActions = new userActions(flux);
const user = await userActions.add(userData);
```

#### After (Factory Pattern)

```typescript
import {createUserActions} from '../actions/userActions';

const userActions = createUserActions(flux);
const user = await userActions.add(userData);
```

### Advanced Usage with Custom Adapters

#### Custom Validation Adapter

```typescript
// Custom adapter that extends default behavior
const customUserAdapter = (input: unknown, options?: UserAdapterOptions) => {
  // input is already validated by default adapter
  const user = input as any;

  // Add business-specific validation
  if (user.email && !user.email.includes('@company.com')) {
    throw new Error('Only company emails allowed');
  }

  // Add computed fields
  return {
    ...user,
    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    isAdmin: user.userAccess >= 3
  };
};

const userActions = createUserActions(flux, {
  userAdapter: customUserAdapter
});
```

#### Configuration-based Adapters

```typescript
const userActions = createUserActions(flux, {
  userAdapterOptions: {
    strict: true,
    environment: 'production',
    customValidation: (input) => {
      // Additional validation logic
      return input;
    }
  }
});
```

#### Runtime Adapter Updates

```typescript
const userActions = createUserActions(flux);

// Update adapter at runtime
userActions.updateUserAdapter(customUserAdapter);

// Update options at runtime
userActions.updateUserAdapterOptions({
  strict: true,
  environment: 'production'
});
```

### Available Factory Functions

All action files now export factory functions:

- `createUserActions(flux, options?)` - User management
- `createPostActions(flux, options?)` - Post management
- `createEventActions(flux, options?)` - Event management
- `createMessageActions(flux, options?)` - Messaging
- `createImageActions(flux, options?)` - Image handling
- `createLocationActions(flux, options?)` - Location services
- `createReactionActions(flux, options?)` - Reactions
- `createTagActions(flux, options?)` - Tag management
- `createWebsocketActions(flux)` - WebSocket connections

### Adapter Options Interface

All adapters support the same options interface:

```typescript
interface AdapterOptions {
  strict?: boolean;                    // Enable strict validation
  allowPartial?: boolean;              // Allow partial data
  environment?: 'development' | 'production' | 'test';
  customValidation?: (input: unknown) => unknown;
}
```

### Migration Guide

#### Step 1: Update Imports

```typescript
// Old
import {userActions} from '../actions/userActions';

// New
import {createUserActions} from '../actions/userActions';
```

#### Step 2: Update Instantiation

```typescript
// Old
const userActions = new userActions(flux, customAdapter);

// New
const userActions = createUserActions(flux, {
  userAdapter: customAdapter
});
```

#### Step 3: Using Actions in Components

The recommended approach is to use specialized hooks:

```typescript
// Recommended: Use specialized hooks
import {useUserActions, usePostActions} from '@nlabs/metropolisjs';

const MyComponent = () => {
  const userActions = useUserActions();
  const postActions = usePostActions();
  // ...
};

// Alternative: Use useMetropolis with selective creation
import {useMetropolis} from '@nlabs/metropolisjs';

const MyComponent = () => {
  const {userActions, postActions} = useMetropolis(['user', 'post']);
  // ...
};
```

### Configuration Access

Access configuration using React hooks:

```typescript
import {useMetropolisConfig} from '@nlabs/metropolisjs';

const MyComponent = () => {
  const config = useMetropolisConfig();
  const apiUrl = config.app?.api?.url;
  // ...
};
```

For non-React code (actions, utilities), use:

```typescript
import {getConfigFromFlux} from '@nlabs/metropolisjs';

const config = getConfigFromFlux(flux);
const apiUrl = config.app?.api?.url || '';
```

**Note:** The `Config` class has been removed. Use `useMetropolisConfig()` in React components or `getConfigFromFlux()` in non-React code.

### Testing Examples

#### Unit Testing Actions

```typescript
import {createUserActions} from '@nlabs/metropolisjs';

describe('userActions', () => {
  let flux: FluxFramework;
  let userActions: userActions;

  beforeEach(() => {
    flux = createMockFlux();
    // Store config in flux state for actions to access
    flux.setState('app.config', {
      app: { api: { url: 'http://localhost:3000/app' } }
    });
    userActions = createUserActions(flux);
  });

  it('should add user with validation', async () => {
    const userData = {username: 'test', email: 'test@example.com'};
    const result = await userActions.add(userData);
    expect(result).toBeDefined();
  });
});
```

#### Testing with Custom Adapters

```typescript
const mockAdapter = jest.fn((input) => ({
  ...input,
  validated: true
}));

const userActions = createUserActions(flux, {
  userAdapter: mockAdapter
});

expect(mockAdapter).toHaveBeenCalled();
```

#### Testing React Components

```typescript
import {renderHook} from '@testing-library/react';
import {Metropolis, useUserActions} from '@nlabs/metropolisjs';

describe('useUserActions', () => {
  it('should return user actions', () => {
    const wrapper = ({children}) => (
      <Metropolis config={{development: {app: {api: {url: 'http://localhost'}}}}}>
        {children}
      </Metropolis>
    );

    const {result} = renderHook(() => useUserActions(), {wrapper});
    expect(result.current).toBeDefined();
    expect(result.current.add).toBeDefined();
  });
});
```

### Best Practices

1. **Use Specialized Hooks**: Prefer `useUserActions()` over `useMetropolis()` when you only need one action type
2. **Selective Creation**: Use `useMetropolis(['user', 'post'])` when you need multiple specific actions
3. **Context-Based Config**: Use `useMetropolisConfig()` for accessing configuration
4. **Leverage Adapter Injection**: Pass custom adapters through the `Metropolis` component
5. **Type Safety**: Always use TypeScript interfaces for better type checking
6. **Error Handling**: Custom adapters should throw meaningful errors
7. **Wrap Components**: Always wrap components using hooks with `<Metropolis>` provider

### Removed APIs

The following APIs have been removed:

- `Config.get()` - Use `useMetropolisConfig()` in React components or `getConfigFromFlux(flux)` in non-React code
- `Config.set()` - Pass configuration to the `<Metropolis>` component instead

### Performance Considerations

- **Specialized hooks** only create the specific action type (best performance)
- **Selective creation** creates only requested actions
- Factory functions are lightweight and create minimal overhead
- Adapter validation is only performed when needed
- Options are merged efficiently without deep cloning
- Better tree-shaking opportunities with specialized hooks

## 🔌 Adapters

Customize data transformation with powerful adapters. Pass adapters to the `Metropolis` component:

- **User**: User profiles and authentication data
- **Message**: Chat and messaging data
- **Post**: Social media content
- **Event**: Event and scheduling data
- **Image**: Media and file data
- **Location**: Geolocation data
- **Tag**: Categorization data
- **Reaction**: User interaction data
- **Content**: Content management
- **Profile**: Profile management
- **Translation**: Translation data

## ⚡ Real-Time Features

### WebSocket Integration

```tsx
import {useWebsocketActions} from '@nlabs/metropolisjs';

const MyComponent = () => {
  const websocketActions = useWebsocketActions();

  useEffect(() => {
    // Initialize real-time connections
    websocketActions.wsInit();
  }, []);

  // Messages, notifications, and data updates
  // are automatically synchronized across all clients
};
```

### Server-Sent Events

Built-in SSE support for lightweight real-time updates without the overhead of WebSocket connections.

## 🎨 Customization

### Custom Adapters

You can customize data transformation by providing custom adapters. Adapters are functions that transform and validate data:

```tsx
// Custom adapter function
const customUserAdapter = (input: unknown, options?: UserAdapterOptions) => {
  const user = input as any;

  // Add custom transformation logic
  return {
    ...user,
    displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    customField: 'custom value',
    isVerified: user.email?.endsWith('@company.com')
  };
};

// Pass adapters through the Metropolis component (recommended)
<Metropolis
  adapters={{
    User: customUserAdapter,
    Message: customMessageAdapter
  }}
>
  <YourApp />
</Metropolis>
```

The adapters will be automatically used by all action hooks. For more details on the factory pattern and adapter customization, see the [Factory Pattern Guide](#-factory-pattern-guide) section above.

### Accessing Configuration

```tsx
import {useMetropolisConfig} from '@nlabs/metropolisjs';

const MyComponent = () => {
  const config = useMetropolisConfig();
  const apiUrl = config.app?.api?.url;
  const websocketUrl = config.app?.urls?.websocket;

  // Use configuration values
  return <div>API: {apiUrl}</div>;
};
```

**Note:** `useMetropolisConfig()` must be used within a component wrapped by `<Metropolis>`.

## 🚀 Performance Features

- **Selective Action Creation** - Only create actions you need with specialized hooks
- **Debounced API calls** - Prevent excessive requests
- **Intelligent caching** - With ArkhamJS
- **Optimistic updates** - Instant UI feedback
- **Connection pooling** - WebSocket efficiency
- **Lazy loading** - Support for large datasets
- **Tree-shaking friendly** - Better bundle optimization

## 🔒 Security

- **Automatic token refresh** for seamless sessions
- **Secure WebSocket connections** with authentication
- **Input validation** and sanitization
- **CSRF protection** built-in
- **Session management** with configurable timeouts

## 📦 Installation & Setup

### Prerequisites

- Node.js 16+
- React 18+
- TypeScript 4.5+

### Full Installation

```bash
# Install MetropolisJS and dependencies
npm install @nlabs/metropolisjs @nlabs/arkhamjs @nlabs/arkhamjs-utils-react

# For development
npm install --save-dev @types/react @types/node
```

### Environment Setup

MetropolisJS automatically detects the environment from:
- `process.env.stage` (if set)
- `process.env.NODE_ENV` (fallback)
- Defaults to `'local'` if none are set

Configure your environment-specific settings in the `config` prop of the `Metropolis` component.

## 🤝 Contributing

We love contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📖 Additional Documentation

- **[Factory Pattern Guide](./factoryPatternGuide.md)** - Detailed guide on using the factory pattern
- **[Architecture Analysis](./ARCHITECTURE_ANALYSIS.md)** - Deep dive into the architecture
- **[Changelog](./CHANGELOG.md)** - Complete list of changes and improvements

## 🆘 Support

- **Documentation**: See above for detailed guides
- **Issues**: [GitHub Issues](https://github.com/nitrogenlabs/metropolisjs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nitrogenlabs/metropolisjs/discussions)
- **Email**: <giraldo@nitrogenlabs.com>

## 🏢 About Nitrogen Labs

MetropolisJS is proudly developed by [Nitrogen Labs](http://nitrogenlabs.com), a team passionate about building powerful, developer-friendly tools that make web development faster, more reliable, and more enjoyable.

---

**Ready to build the future?** Start with MetropolisJS today and experience the power of seamless frontend-backend integration! 🚀
