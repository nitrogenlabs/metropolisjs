// @vitest-environment jsdom
import {render, renderHook} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

const listeners = new Map<string, () => void>();
const flux = {
  getState: vi.fn((path: string, fallback?: unknown) => {
    if(path === 'user.session') {
      return {userAccess: 2, userId: 'user-1'};
    }
    if(path === 'user.session.userId') {
      return 'user-1';
    }
    if(path === 'permission.userPermissions.user-1') {
      return [{level: 3, resource: 'admin'}];
    }
    return fallback;
  }),
  on: vi.fn((event: string, handler: () => void) => {
    listeners.set(event, handler);
    return vi.fn();
  })
};

vi.mock('@nlabs/arkhamjs-utils-react', () => ({
  useFlux: () => flux
}));

describe('permission utilities', () => {
  it('reads session permissions and resource overrides', async () => {
    const {PermissionLevel, usePermissions} = await import('./permissionUtils.js');
    const {result} = renderHook(() => usePermissions());

    expect(result.current.userLevel).toBe(2);
    expect(result.current.hasPermission(PermissionLevel.USER)).toBe(true);
    expect(result.current.isGuest).toBe(false);
    expect(result.current.isUser).toBe(true);
    expect(result.current.isModerator).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isSuperAdmin).toBe(false);
    expect(result.current.checkResource('admin', PermissionLevel.ADMIN)).toBe(true);
    expect(result.current.checkResource('missing', PermissionLevel.MODERATOR)).toBe(true);
  });

  it('renders guard children or fallback based on access', async () => {
    const {PermissionGuard, PermissionLevel} = await import('./permissionUtils.js');

    const allowed = render(
      <PermissionGuard requiredLevel={PermissionLevel.ADMIN} resource="admin" fallback={<span>no</span>}>
        <span>yes</span>
      </PermissionGuard>
    );
    expect(allowed.getByText('yes')).toBeTruthy();

    const denied = render(
      <PermissionGuard requiredLevel={PermissionLevel.SUPER_ADMIN} fallback={<span>blocked</span>}>
        <span>secret</span>
      </PermissionGuard>
    );
    expect(denied.getByText('blocked')).toBeTruthy();
  });
});
