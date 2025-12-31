/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { createValidatorManager } from './validatorFactory.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { BaseAdapterOptions } from './validatorFactory.js';

export interface BaseActionOptions<T extends BaseAdapterOptions = BaseAdapterOptions> {
  adapter?: (input: unknown, options?: T) => any;
  adapterOptions?: T;
}

export const createBaseActions = <T extends BaseAdapterOptions>(
  flux: FluxFramework,
  defaultValidator: (input: unknown, options?: T) => any,
  options?: BaseActionOptions<T>
) => {
  const {validator, updateAdapter, updateOptions} = createValidatorManager(
    defaultValidator,
    options?.adapterOptions
  );

  if(options?.adapter) {
    updateAdapter(options.adapter);
  }

  const createMutationAction = <R = any>(
    mutationName: string,
    dataType: string,
    queryVariables: Record<string, any>,
    props: string[],
    successType: string,
    errorType: string,
    mutationFn: any
  ) => async (input?: unknown): Promise<R> => {
    try {
      const variables = input ? {
        ...queryVariables,
        [Object.keys(queryVariables)[0]]: {
          ...queryVariables[Object.keys(queryVariables)[0]],
          value: validator(input)
        }
      } : queryVariables;

      const onSuccess = (data: any) => {
        const result = data[dataType]?.[mutationName] || {};
        return flux.dispatch({[dataType.slice(0, -1)]: result, type: successType});
      };

      const result = await mutationFn(
        flux,
        mutationName,
        dataType,
        variables,
        props,
        {onSuccess}
      );

      const key = Object.keys(result)[0];
      return result[key] as R;
    } catch(error) {
      flux.dispatch({error, type: errorType});
      throw error;
    }
  };

  const createQueryAction = <R = any>(
    queryName: string,
    dataType: string,
    queryVariables: Record<string, any>,
    props: string[],
    successType: string,
    errorType: string,
    queryFn: any
  ) => async (): Promise<R> => {
    try {
      const onSuccess = (data: any) => {
        const result = data[dataType]?.[queryName] || {};
        return flux.dispatch({[dataType.slice(0, -1)]: result, type: successType});
      };

      const result = await queryFn(
        flux,
        queryName,
        dataType,
        queryVariables,
        props,
        {onSuccess}
      );

      const key = Object.keys(result)[0];
      return result[key] as R;
    } catch(error) {
      flux.dispatch({error, type: errorType});
      throw error;
    }
  };

  return {
    createMutationAction,
    createQueryAction,
    flux,
    updateAdapter,
    updateOptions,
    validator
  };
};