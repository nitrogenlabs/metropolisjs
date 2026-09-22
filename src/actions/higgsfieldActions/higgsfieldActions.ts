/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {
  validateMarketingStudioImageInput,
  validateSeedanceReferenceVideoInput,
  validateSeedanceVideoInput,
  validateSoulImageInput
} from '../../adapters/higgsfieldAdapter/higgsfieldAdapter.js';
import {appMutation, appQuery} from '../../utils/api.js';

import type {FluxAction, FluxFramework} from '@nlabs/arkhamjs';
import type {
  HiggsfieldRequest,
  MarketingStudioImageInput,
  SeedanceReferenceVideoInput,
  SeedanceVideoInput,
  SoulImageInput
} from '../../adapters/higgsfieldAdapter/higgsfieldAdapter.js';
import type {ApiResultsType} from '../../utils/api.js';

const DATA_TYPE = 'higgsfield';
const REQUEST_PROPERTIES = ['cancelUrl', 'error', 'mediaUrl', 'mediaUrls', 'requestId', 'status', 'statusUrl'];

export const HIGGSFIELD_CONSTANTS = {
  CANCEL_ERROR: 'HIGGSFIELD_CANCEL_ERROR',
  CANCEL_SUCCESS: 'HIGGSFIELD_CANCEL_SUCCESS',
  GENERATE_ERROR: 'HIGGSFIELD_GENERATE_ERROR',
  GENERATE_SUCCESS: 'HIGGSFIELD_GENERATE_SUCCESS',
  STATUS_ERROR: 'HIGGSFIELD_STATUS_ERROR',
  STATUS_SUCCESS: 'HIGGSFIELD_STATUS_SUCCESS'
} as const;

export interface HiggsfieldActions {
  cancelRequest: (requestId: string) => Promise<boolean>;
  generateMarketingStudioImage: (
    input: MarketingStudioImageInput, webhookUrl?: string
  ) => Promise<HiggsfieldRequest>;
  generateSeedanceReferenceVideo: (
    input: SeedanceReferenceVideoInput, webhookUrl?: string
  ) => Promise<HiggsfieldRequest>;
  generateSeedanceVideo: (input: SeedanceVideoInput, webhookUrl?: string) => Promise<HiggsfieldRequest>;
  generateSoulImage: (input: SoulImageInput, webhookUrl?: string) => Promise<HiggsfieldRequest>;
  getRequestStatus: (requestId: string) => Promise<HiggsfieldRequest>;
}

export const createHiggsfieldActions = (flux: FluxFramework): HiggsfieldActions => {
  const generate = async <T>(
    name: string, inputTypeName: string, validate: (input: unknown) => T, input: T, webhookUrl?: string
  ): Promise<HiggsfieldRequest> => {
    try {
      const validated = validate(input);
      const queryVariables = {
        input: {type: `${inputTypeName}!`, value: validated},
        webhookUrl: {type: 'String', value: webhookUrl}
      };
      const onSuccess = async (data: ApiResultsType = {}) => {
        const request = (data as Record<string, Record<string, HiggsfieldRequest>>)?.[DATA_TYPE]?.[name] || {};
        await flux.dispatch({request, type: HIGGSFIELD_CONSTANTS.GENERATE_SUCCESS});
        return request as unknown as FluxAction;
      };

      return await appMutation<HiggsfieldRequest>(
        flux, name, DATA_TYPE, queryVariables, REQUEST_PROPERTIES, {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: HIGGSFIELD_CONSTANTS.GENERATE_ERROR});
      throw error;
    }
  };

  const getRequestStatus = async (requestId: string): Promise<HiggsfieldRequest> => {
    try {
      const queryVariables = {requestId: {type: 'ID!', value: requestId}};
      const onSuccess = async (data: ApiResultsType = {}) => {
        const request =
          (data as Record<string, Record<string, HiggsfieldRequest>>)?.[DATA_TYPE]?.getHiggsfieldRequestStatus || {};
        await flux.dispatch({request, type: HIGGSFIELD_CONSTANTS.STATUS_SUCCESS});
        return request as unknown as FluxAction;
      };

      return await appQuery<HiggsfieldRequest>(
        flux, 'getHiggsfieldRequestStatus', DATA_TYPE, queryVariables, REQUEST_PROPERTIES, {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: HIGGSFIELD_CONSTANTS.STATUS_ERROR});
      throw error;
    }
  };

  const cancelRequest = async (requestId: string): Promise<boolean> => {
    try {
      const queryVariables = {requestId: {type: 'ID!', value: requestId}};
      const onSuccess = async (data: ApiResultsType = {}) => {
        const canceled =
          Boolean((data as Record<string, Record<string, boolean>>)?.[DATA_TYPE]?.cancelHiggsfieldRequest);
        await flux.dispatch({canceled, type: HIGGSFIELD_CONSTANTS.CANCEL_SUCCESS});
        return canceled as unknown as FluxAction;
      };

      return await appMutation<boolean>(flux, 'cancelHiggsfieldRequest', DATA_TYPE, queryVariables, [], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: HIGGSFIELD_CONSTANTS.CANCEL_ERROR});
      throw error;
    }
  };

  return {
    cancelRequest,
    generateMarketingStudioImage: (input, webhookUrl) =>
      generate('generateMarketingStudioImage', 'HiggsfieldMarketingStudioImageInput', validateMarketingStudioImageInput, input, webhookUrl),
    generateSeedanceReferenceVideo: (input, webhookUrl) =>
      generate('generateSeedanceReferenceVideo', 'HiggsfieldSeedanceReferenceVideoInput', validateSeedanceReferenceVideoInput, input, webhookUrl),
    generateSeedanceVideo: (input, webhookUrl) =>
      generate('generateSeedanceVideo', 'HiggsfieldSeedanceVideoInput', validateSeedanceVideoInput, input, webhookUrl),
    generateSoulImage: (input, webhookUrl) =>
      generate('generateSoulImage', 'HiggsfieldSoulImageInput', validateSoulImageInput, input, webhookUrl),
    getRequestStatus
  };
};
