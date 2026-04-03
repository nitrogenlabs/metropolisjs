/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId} from '@nlabs/utils';

import {CONNECTION_TYPES, EDGES} from '../../constants/Collections.js';
import {appMutation, appQuery} from '../../utils/api.js';
import {clearCachedRequest, getCachedRequest, setCachedRequest} from '../../utils/requestCache.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {CollectionType, ConnectionType} from '../../constants/Collections.js';
import type {ApiResultsType} from '../../utils/api.js';
import type {ConnectionEdge} from '../../types/edges.types.js';
import type {ActionRequestOptions} from '../../utils/requestCache.js';

export interface ConnectionActions {
  addConnection: (
    fromType: CollectionType,
    fromId: string,
    toType: CollectionType,
    toId: string,
    connectionType?: ConnectionType,
    metadata?: Record<string, any>,
    requestOptions?: ActionRequestOptions
  ) => Promise<ConnectionEdge>;
  getConnections: (
    fromType: CollectionType,
    fromId: string,
    toType?: CollectionType,
    filters?: Record<string, any>,
    requestOptions?: ActionRequestOptions
  ) => Promise<ConnectionEdge[]>;
  removeConnection: (
    fromType: CollectionType,
    fromId: string,
    toType: CollectionType,
    toId: string,
    requestOptions?: ActionRequestOptions
  ) => Promise<boolean>;
}

export interface ConnectionApiResultsType extends ApiResultsType {
  connections?: {
    add?: ConnectionEdge;
    list?: ConnectionEdge[];
    remove?: boolean;
  };
}

export const createConnectionActions = (flux: FluxFramework): ConnectionActions => {
  const addConnection = async (
    fromType: CollectionType,
    fromId: string,
    toType: CollectionType,
    toId: string,
    connectionType: ConnectionType = CONNECTION_TYPES.MEMBER,
    metadata: Record<string, any> = {},
    requestOptions: ActionRequestOptions = {}
  ): Promise<ConnectionEdge> => {
    try {
      const queryVariables: Record<string, {type: string; value: unknown}> = {
        connection: {
          type: 'ConnectionInput!',
          value: {
            connectionType,
            fromId: parseId(fromId),
            fromType,
            metadata,
            toId: parseId(toId),
            toType
          }
        }
      };

      return await appMutation<ConnectionEdge>(
        flux,
        'addConnection',
        'connections',
        queryVariables,
        [
          '_from',
          '_to',
          'connectionType',
          'fromId',
          'fromType',
          'metadata',
          'toId',
          'toType'
        ],
        {}
      );
    } catch(error) {
      console.error('Error adding connection:', error);
      throw error;
    } finally {
      await clearCachedRequest(flux, `connection.getConnections:${fromType}:${fromId}:${toType || ''}`);
    }
  };

  const getConnections = async (
    fromType: CollectionType,
    fromId: string,
    toType?: CollectionType,
    filters: Record<string, any> = {},
    requestOptions: ActionRequestOptions = {}
  ): Promise<ConnectionEdge[]> => {
    try {
      const cachedResult = getCachedRequest<ConnectionEdge[]>(
        flux,
        `connection.getConnections:${fromType}:${fromId}:${toType || ''}`,
        {filters, fromId, fromType, toType},
        requestOptions
      );

      if(cachedResult) {
        return cachedResult;
      }

      const queryVariables: Record<string, {type: string; value: unknown}> = {
        fromId: {
          type: 'String!',
          value: parseId(fromId)
        },
        fromType: {
          type: 'String!',
          value: fromType
        }
      };

      if(toType) {
        queryVariables.toType = {
          type: 'String',
          value: toType
        };
      }

      Object.keys(filters).forEach((key) => {
        queryVariables[key] = {
          type: 'String',
          value: filters[key]
        };
      });

      const result = await appQuery<ConnectionEdge[]>(
        flux,
        'connections',
        'connections',
        queryVariables,
        [
          '_from',
          '_to',
          'connectionType',
          'fromId',
          'fromType',
          'metadata',
          'toId',
          'toType'
        ],
        {}
      );

      return await setCachedRequest(
        flux,
        `connection.getConnections:${fromType}:${fromId}:${toType || ''}`,
        {filters, fromId, fromType, toType},
        result,
        requestOptions
      );
    } catch(error) {
      console.error('Error getting connections:', error);
      throw error;
    }
  };

  const removeConnection = async (
    fromType: CollectionType,
    fromId: string,
    toType: CollectionType,
    toId: string,
    requestOptions: ActionRequestOptions = {}
  ): Promise<boolean> => {
    try {
      const queryVariables = {
        fromId: {
          type: 'String!',
          value: parseId(fromId)
        },
        fromType: {
          type: 'String!',
          value: fromType
        },
        toId: {
          type: 'String!',
          value: parseId(toId)
        },
        toType: {
          type: 'String!',
          value: toType
        }
      };

      await appMutation<boolean>(
        flux,
        'removeConnection',
        'connections',
        queryVariables,
        [],
        {}
      );

      return true;
    } catch(error) {
      console.error('Error removing connection:', error);
      throw error;
    } finally {
      await clearCachedRequest(flux, `connection.getConnections:${fromType}:${fromId}:${toType || ''}`);
    }
  };

  return {
    addConnection,
    getConnections,
    removeConnection
  };
};
