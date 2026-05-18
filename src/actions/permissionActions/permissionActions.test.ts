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

  it('dispatches success results for every permission action', async () => {
    const flux = createMockFlux();
    const actions = createPermissionActions(flux as any);
    const permission = {level: 2, name: 'Read', permissionId: 'permission-1', resource: 'posts', userId: 'user-1'};

    appMutationMock.mockImplementation(async (_flux, operation, _type, _variables, _props, options) => {
      const response = {permissions: {[operation]: operation === 'remove' ? permission : permission}};
      await options?.onSuccess?.(response);
      return response.permissions[operation];
    });
    appQueryMock.mockImplementation(async (_flux, operation, _type, _variables, _props, options) => {
      const value = operation === 'check'
        ? true
        : operation === 'list' || operation === 'listByUser'
          ? [permission]
          : permission;
      const response = {permissions: {[operation]: value}};
      await options?.onSuccess?.(response);
      return value;
    });

    await expect(actions.add(permission)).resolves.toEqual(permission);
    await expect(actions.check('user-1', 'posts', 2)).resolves.toBe(true);
    await expect(actions.itemById('permission-1')).resolves.toEqual(permission);
    await expect(actions.list(0, 10)).resolves.toEqual([permission]);
    await expect(actions.listByUser('user-1')).resolves.toEqual([permission]);
    await expect(actions.listByUser('user-1', [], {cacheTimeout: 5})).resolves.toEqual([permission]);
    await expect(actions.listByUser('user-1', [], {cacheTimeout: 5})).resolves.toEqual([permission]);
    await expect(actions.remove('permission-1')).resolves.toEqual(permission);

    expect(flux.dispatch).toHaveBeenCalledWith({permission, type: 'PERMISSION_ADD_ITEM_SUCCESS'});
    expect(flux.dispatch).toHaveBeenCalledWith({hasPermission: true, type: 'PERMISSION_CHECK_PERMISSION_SUCCESS'});
    expect(flux.dispatch).toHaveBeenCalledWith({permission, type: 'PERMISSION_GET_ITEM_SUCCESS'});
    expect(flux.dispatch).toHaveBeenCalledWith({list: [permission], type: 'PERMISSION_GET_LIST_SUCCESS'});
    expect(flux.dispatch).toHaveBeenCalledWith({list: [permission], userId: 'user-1', type: 'PERMISSION_GET_LIST_SUCCESS'});
    expect(flux.dispatch).toHaveBeenCalledWith({permission, type: 'PERMISSION_REMOVE_ITEM_SUCCESS'});
  });

  it('dispatches errors and rethrows permission failures', async () => {
    const flux = createMockFlux();
    const actions = createPermissionActions(flux as any);
    const error = new Error('permission failed');

    appQueryMock.mockRejectedValueOnce(error);
    await expect(actions.itemById('permission-1')).rejects.toThrow('permission failed');
    expect(flux.dispatch).toHaveBeenCalledWith({error, type: 'PERMISSION_GET_ITEM_ERROR'});

    appMutationMock.mockRejectedValueOnce(error);
    await expect(actions.remove('permission-1')).rejects.toThrow('permission failed');
    expect(flux.dispatch).toHaveBeenCalledWith({error, type: 'PERMISSION_REMOVE_ITEM_ERROR'});

    appQueryMock.mockRejectedValueOnce(error);
    await expect(actions.list()).rejects.toThrow('permission failed');
    expect(flux.dispatch).toHaveBeenCalledWith({error, type: 'PERMISSION_GET_LIST_ERROR'});

    appMutationMock.mockRejectedValueOnce(error);
    await expect(actions.update({permissionId: 'permission-1'})).rejects.toThrow('permission failed');
    expect(flux.dispatch).toHaveBeenCalledWith({error, type: 'PERMISSION_UPDATE_ITEM_ERROR'});
  });
});
