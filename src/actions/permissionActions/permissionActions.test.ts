import {describe, expect, it, jest, beforeEach} from '@jest/globals';
import {createPermissionActions} from './permissionActions';
import type {FluxFramework} from '@nlabs/arkhamjs';

describe('permissionActions', () => {
  let flux: FluxFramework;

  beforeEach(() => {
    flux = {
      dispatch: jest.fn(),
      getState: jest.fn()
    } as unknown as FluxFramework;
  });

  it('should create permission actions', () => {
    const actions = createPermissionActions(flux);

    expect(actions).toBeDefined();
    expect(actions.add).toBeDefined();
    expect(actions.check).toBeDefined();
    expect(actions.itemById).toBeDefined();
    expect(actions.list).toBeDefined();
    expect(actions.listByUser).toBeDefined();
    expect(actions.remove).toBeDefined();
    expect(actions.update).toBeDefined();
    expect(actions.updatePermissionAdapter).toBeDefined();
    expect(actions.updatePermissionAdapterOptions).toBeDefined();
  });

  it('should allow custom adapter options', () => {
    const customAdapter = jest.fn((input: unknown) => input);
    const actions = createPermissionActions(flux, {
      permissionAdapter: customAdapter,
      permissionAdapterOptions: {strict: true}
    });

    expect(actions).toBeDefined();
  });
});
