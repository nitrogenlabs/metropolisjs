import {parseArangoId, parseId, parseNum, parseString, parseVarChar} from '@nlabs/utils';
import {z} from 'zod';

import {parseDocument, removeEmptyKeys} from '../arangoAdapter/arangoAdapter.js';
import {parseReaktorDate, parseReaktorItemId, parseReaktorName} from '../reaktorAdapter/reaktorAdapter.js';

export enum PermissionLevel {
  GUEST = 0,
  USER = 1,
  MODERATOR = 2,
  ADMIN = 3,
  SUPER_ADMIN = 4
}

export const PermissionLevelNames: Record<PermissionLevel, string> = {
  [PermissionLevel.GUEST]: 'Guest',
  [PermissionLevel.USER]: 'User',
  [PermissionLevel.MODERATOR]: 'Moderator',
  [PermissionLevel.ADMIN]: 'Admin',
  [PermissionLevel.SUPER_ADMIN]: 'Super Admin'
};

export interface Permission {
  _id?: string;
  _key?: string;
  _rev?: string;
  _oldRev?: string;
  added?: number;
  description?: string;
  id?: string;
  level?: PermissionLevel;
  name?: string;
  permissionId?: string;
  resource?: string;
  roleId?: string;
  type?: string;
  updated?: number;
  userId?: string;
  [key: string]: any;
}

export class PermissionValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'PermissionValidationError';
  }
}

const PermissionInputSchema = z.object({
  _id: z.string().optional(),
  _key: z.string().optional(),
  _rev: z.string().optional(),
  _oldRev: z.string().optional(),
  added: z.number().optional(),
  description: z.string().max(512).optional(),
  id: z.string().optional(),
  level: z.number().min(0).max(4).optional(),
  name: z.string().max(160).optional(),
  permissionId: z.string().optional(),
  resource: z.string().max(160).optional(),
  roleId: z.string().optional(),
  type: z.string().max(160).optional(),
  updated: z.number().optional(),
  userId: z.string().optional()
}).loose();

export const validatePermissionInput = (permission: unknown): Permission => {
  try {
    const validated = PermissionInputSchema.parse(permission);
    return validated as Permission;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new PermissionValidationError(`Permission validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatPermissionOutput = (permission: Permission): Permission => permission;

export const parsePermission = (permission: Permission): Permission => {
  try {
    const parsed = performPermissionTransformation(permission);
    return parsed;
  } catch (error) {
    if (error instanceof PermissionValidationError) {
      throw error;
    }
    throw new PermissionValidationError(
      `Permission parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

const performPermissionTransformation = (permission: Permission): Permission => {
  const {
    _id,
    _key,
    added,
    description,
    id,
    level,
    name,
    permissionId,
    resource,
    roleId,
    type,
    updated,
    userId
  } = permission;

  const transformed = removeEmptyKeys({
    ...parseDocument(permission),
    ...((_id || id || _key || permissionId) && {
      id: parseArangoId(_id || id || `permissions/${_key || permissionId}`)
    }),
    ...(added && {added: parseReaktorDate(added)}),
    ...(description && {description: parseString(description)}),
    ...(level !== undefined && {level: parseNum(level)}),
    ...(name && {name: parseReaktorName(name)}),
    ...(permissionId && {permissionId: parseReaktorItemId(permissionId)}),
    ...(resource && {resource: parseVarChar(resource, 160)}),
    ...(roleId && {roleId: parseReaktorItemId(roleId)}),
    ...(type && {type: parseVarChar(type, 160)}),
    ...(updated && {updated: parseReaktorDate(updated)}),
    ...(userId && {userId: parseReaktorItemId(userId)})
  });

  return transformed;
};

export const hasPermission = (userLevel: number, requiredLevel: PermissionLevel): boolean => {
  return userLevel >= requiredLevel;
};

export const getPermissionLevelName = (level: number): string => {
  return PermissionLevelNames[level as PermissionLevel] || 'Unknown';
};

export const isGuest = (userLevel: number): boolean => userLevel === PermissionLevel.GUEST;
export const isUser = (userLevel: number): boolean => userLevel >= PermissionLevel.USER;
export const isModerator = (userLevel: number): boolean => userLevel >= PermissionLevel.MODERATOR;
export const isAdmin = (userLevel: number): boolean => userLevel >= PermissionLevel.ADMIN;
export const isSuperAdmin = (userLevel: number): boolean => userLevel >= PermissionLevel.SUPER_ADMIN;
