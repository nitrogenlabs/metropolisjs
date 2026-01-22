/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {useCallback, useEffect, useState} from 'react';
import {useFlux} from '@nlabs/arkhamjs-utils-react';

import {
  hasPermission as checkPermission,
  isAdmin as checkIsAdmin,
  isGuest as checkIsGuest,
  isModerator as checkIsModerator,
  isSuperAdmin as checkIsSuperAdmin,
  isUser as checkIsUser,
  PermissionLevel
} from '../adapters/permissionAdapter/permissionAdapter.js';
import type {Permission} from '../adapters/permissionAdapter/permissionAdapter.js';
import type {User} from '../adapters/userAdapter/userAdapter.js';

export interface PermissionGuardProps {
  requiredLevel: PermissionLevel;
  resource?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export interface UsePermissionsReturn {
  userLevel: number;
  hasPermission: (requiredLevel: PermissionLevel) => boolean;
  isGuest: boolean;
  isUser: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  checkResource: (resource: string, requiredLevel: PermissionLevel) => boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const flux = useFlux();
  const [userLevel, setUserLevel] = useState<number>(0);

  useEffect(() => {
    const updateUserLevel = () => {
      const session: Partial<User> = flux.getState('user.session', {});
      const level = session.userAccess ?? 0;
      setUserLevel(level);
    };

    updateUserLevel();

    const unsubscribe = flux.on('USER_SIGN_IN_SUCCESS', updateUserLevel);
    const unsubscribeUpdate = flux.on('USER_UPDATE_ITEM_SUCCESS', updateUserLevel);
    const unsubscribeSession = flux.on('USER_GET_SESSION_SUCCESS', updateUserLevel);
    const unsubscribeSignOut = flux.on('USER_SIGN_OUT_SUCCESS', () => setUserLevel(0));

    return () => {
      unsubscribe();
      unsubscribeUpdate();
      unsubscribeSession();
      unsubscribeSignOut();
    };
  }, [flux]);

  const hasPermissionLevel = useCallback(
    (requiredLevel: PermissionLevel) => {
      return checkPermission(userLevel, requiredLevel);
    },
    [userLevel]
  );

  const checkResourcePermission = useCallback(
    (resource: string, requiredLevel: PermissionLevel): boolean => {
      const permissions: Permission[] = flux.getState(`permission.userPermissions.${flux.getState('user.session.userId')}`, []);
      
      const resourcePermission = permissions.find((p) => p.resource === resource);
      if (resourcePermission && resourcePermission.level !== undefined) {
        return resourcePermission.level >= requiredLevel;
      }

      return checkPermission(userLevel, requiredLevel);
    },
    [flux, userLevel]
  );

  return {
    userLevel,
    hasPermission: hasPermissionLevel,
    isGuest: checkIsGuest(userLevel),
    isUser: checkIsUser(userLevel),
    isModerator: checkIsModerator(userLevel),
    isAdmin: checkIsAdmin(userLevel),
    isSuperAdmin: checkIsSuperAdmin(userLevel),
    checkResource: checkResourcePermission
  };
};

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  requiredLevel,
  resource,
  fallback = null,
  children
}) => {
  const {hasPermission, checkResource} = usePermissions();

  const hasAccess = resource 
    ? checkResource(resource, requiredLevel) 
    : hasPermission(requiredLevel);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export {PermissionLevel} from '../adapters/permissionAdapter/permissionAdapter.js';
export type {Permission} from '../adapters/permissionAdapter/permissionAdapter.js';
