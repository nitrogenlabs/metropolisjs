# Changelog

## Architecture Modernization (2025)

MetropolisJS has undergone a comprehensive three-phase refactoring to align with React best practices, improve type safety, and enhance developer experience.

### Phase 1: Context-Based Configuration ✅

**Status:** Complete (Backward Compatible)

- Added `resolveEnvironmentConfig()` utility for environment-specific config resolution
- Enhanced `MetropolisContext` with `config` and `flux` properties
- Created `useMetropolisConfig()` and `useMetropolisFlux()` hooks
- Configuration now available through React Context
- Global `Config` class still works for backward compatibility

**New Features:**
- `useMetropolisConfig()` - Access config from React context
- `useMetropolisFlux()` - Access flux instance from context
- `resolveEnvironmentConfig()` - Resolve environment-specific configuration

### Phase 2: Selective Action Creation & Specialized Hooks ✅

**Status:** Complete (Backward Compatible)

- Added selective action creation: `useMetropolis(['user', 'post'])`
- Created 12 specialized hooks for individual action types
- Improved type safety by removing `as any` casts
- Better performance through selective action creation

**New Features:**
- `useUserActions()` - User management actions only
- `usePostActions()` - Post management actions only
- `useMessageActions()` - Messaging actions only
- `useEventActions()` - Event management actions only
- `useImageActions()` - Image handling actions only
- `useLocationActions()` - Location services actions only
- `useReactionActions()` - Reaction actions only
- `useTagActions()` - Tag management actions only
- `useContentActions()` - Content management actions only
- `useProfileActions()` - Profile management actions only
- `useTranslationActions()` - Translation actions only
- `useWebsocketActions()` - WebSocket actions only
- Selective creation: `useMetropolis(['user', 'post'])`

**Performance Improvements:**
- Only creates actions you need
- Better tree-shaking opportunities
- More efficient memoization

### Phase 3: Remove Global Config Singleton ✅

**Status:** Complete (Breaking Changes)

- Removed global `Config.set()` from Metropolis component
- Config now stored in flux state (`app.config`)
- Created `getConfigFromFlux()` utility for non-React code
- Deprecated `Config.get()` and `Config.set()` with warnings
- `useMetropolisConfig()` now requires Metropolis context

**Breaking Changes:**
- `useMetropolisConfig()` throws error if used outside Metropolis component
- `Config.get()` and `Config.set()` are deprecated (show warnings)
- Configuration must be passed to `<Metropolis>` component

**Migration Required:**
- React components: Use `useMetropolisConfig()` instead of `Config.get()`
- Non-React code: Use `getConfigFromFlux(flux)` instead of `Config.get()`
- Ensure components are wrapped with `<Metropolis>` provider

## Summary of Changes

### New Hooks

1. **Configuration Hooks:**
   - `useMetropolisConfig()` - Get configuration from context
   - `useMetropolisFlux()` - Get flux instance from context

2. **Specialized Action Hooks:**
   - `useUserActions()`
   - `usePostActions()`
   - `useMessageActions()`
   - `useEventActions()`
   - `useImageActions()`
   - `useLocationActions()`
   - `useReactionActions()`
   - `useTagActions()`
   - `useContentActions()`
   - `useProfileActions()`
   - `useTranslationActions()`
   - `useWebsocketActions()`

### Enhanced Features

- **Selective Action Creation:** `useMetropolis(['user', 'post'])`
- **Context-Based Configuration:** No global state
- **Type Safety:** Removed `as any` casts
- **Better Performance:** Only create needed actions

### Deprecated APIs

- `Config.get()` - Use `useMetropolisConfig()` or `getConfigFromFlux(flux)`
- `Config.set()` - Pass config to `<Metropolis>` component

### New Utilities

- `getConfigFromFlux(flux)` - Get config from flux state (for non-React code)
- `resolveEnvironmentConfig(config)` - Resolve environment-specific config

## Migration Guide

See the [README.md](./README.md) for detailed migration examples and usage patterns.
