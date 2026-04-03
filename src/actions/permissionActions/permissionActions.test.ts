import {beforeEach, describe, expect, it, vi} from 'vitest';

const appMutationMock = vi.fn();
const appQueryMock = vi.fn();

vi.mock('../../utils/api.js', () => ({
  appMutation: appMutationMock,
  appQuery: appQueryMock
}));

const {createPermissionActions} = await import('./permissionActions.js');

type StateValue = Record<string, unknown>;

const setStateAtPath = (state: StateValue, path: string, value: unknown) => {
  const parts = path.split('.');
  let current: StateValue = state;

  for(let index = 0; index < parts.length - 1; index++) {
    const key = parts[index];

    if(!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }

    current = current[key] as StateValue;
  }

  current[parts[parts.length - 1]] = value;
};

const getStateAtPath = (state: StateValue, path: string) =>
  path.split('.').reduce<unknown>((result, key) => {
    if(result && typeof result === 'object') {
      return (result as StateValue)[key];
    }

    return undefined;
  }, state);

const createMockFlux = () => {
  const state: StateValue = {};

  return {
    dispatch: vi.fn(async (payload) => payload),
    getState: vi.fn((key?: string, fallback?: unknown) => {
      if(!key) {
        return state;
      }

      const result = getStateAtPath(state, key);
      return result === undefined ? fallback : result;
    }),
    setState: vi.fn(async (path: string, value: unknown) => {
      setStateAtPath(state, path, value);
      return value;
    })
  };
};

describe('createPermissionActions', () => {
  beforeEach(() => {
    appMutationMock.mockReset();
    appQueryMock.mockReset();
  });

  it('creates the current permission action surface', () => {
    const actions = createPermissionActions(createMockFlux() as any);

    expect(actions.add).toBeTypeOf('function');
    expect(actions.check).toBeTypeOf('function');
    expect(actions.itemById).toBeTypeOf('function');
    expect(actions.list).toBeTypeOf('function');
    expect(actions.listByUser).toBeTypeOf('function');
    expect(actions.remove).toBeTypeOf('function');
    expect(actions.update).toBeTypeOf('function');
    expect(actions.updatePermissionAdapter).toBeTypeOf('function');
    expect(actions.updatePermissionAdapterOptions).toBeTypeOf('function');
  });

  it('supports custom adapter options', () => {
    const customAdapter = vi.fn((input: unknown) => input);

    const actions = createPermissionActions(createMockFlux() as any, {
      permissionAdapter: customAdapter,
      permissionAdapterOptions: {strict: true}
    });

    expect(actions).toBeDefined();
    actions.updatePermissionAdapter(customAdapter);
    actions.updatePermissionAdapterOptions({allowPartial: true});
  });

  it('uses cache for repeated permission checks when cacheTimeout is provided', async () => {
    const flux = createMockFlux();
    const actions = createPermissionActions(flux as any);

    appQueryMock.mockResolvedValue(true);

    const firstResult = await actions.check('user-1', 'posts', 2, {cacheTimeout: 5});
    const secondResult = await actions.check('user-1', 'posts', 2, {cacheTimeout: 5});

    expect(firstResult).toBe(true);
    expect(secondResult).toBe(true);
    expect(appQueryMock).toHaveBeenCalledTimes(1);
    expect(flux.setState).toHaveBeenCalledWith(
      'app.requestCache.permission.check:user-1:posts:2',
      expect.objectContaining({
        cacheTimeout: 5,
        data: true
      })
    );
  });

  it('clears cached permission scopes after update', async () => {
    const flux = createMockFlux();
    const actions = createPermissionActions(flux as any);

    appMutationMock.mockResolvedValue({permissionId: 'perm-1', userId: 'user-1'});

    await actions.update({permissionId: 'perm-1', userId: 'user-1'});

    expect(flux.setState).toHaveBeenCalledWith('app.requestCache.permission.itemById:perm-1', undefined);
    expect(flux.setState).toHaveBeenCalledWith('app.requestCache.permission.list', undefined);
    expect(flux.setState).toHaveBeenCalledWith('app.requestCache.permission.listByUser:user-1', undefined);
  });
});
