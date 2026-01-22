/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId} from '@nlabs/utils';

import {CONNECTION_TYPES, EDGES, type CollectionType, type ConnectionType} from '../../constants/Collections.js';
import {appMutation, appQuery, type ApiResultsType} from '../../utils/api.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {ConnectionEdge} from '../../types/edges.types.js';

export interface ConnectionActions {
  addConnection: (
    fromType: CollectionType,
    fromId: string,
    toType: CollectionType,
    toId: string,
    connectionType?: ConnectionType,
    metadata?: Record<string, any>
  ) => Promise<ConnectionEdge>;
  getConnections: (
    fromType: CollectionType,
    fromId: string,
    toType?: CollectionType,
    filters?: Record<string, any>
  ) => Promise<ConnectionEdge[]>;
  removeConnection: (
    fromType: CollectionType,
    fromId: string,
    toType: CollectionType,
    toId: string
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
    metadata: Record<string, any> = {}
  ): Promise<ConnectionEdge> => {
    try {
      const queryVariables = {
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
    }
  };

  const getConnections = async (
    fromType: CollectionType,
    fromId: string,
    toType?: CollectionType,
    filters: Record<string, any> = {}
  ): Promise<ConnectionEdge[]> => {
    try {
      const queryVariables: any = {
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

      return await appQuery<ConnectionEdge[]>(
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
    } catch(error) {
      console.error('Error getting connections:', error);
      throw error;
    }
  };

  const removeConnection = async (
    fromType: CollectionType,
    fromId: string,
    toType: CollectionType,
    toId: string
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
    }
  };

  return {
    addConnection,
    getConnections,
    removeConnection
  };
};
