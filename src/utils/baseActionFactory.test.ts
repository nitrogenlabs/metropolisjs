/**
 * Copyright (c) 2025-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {describe, expect, it, beforeEach, jest} from '@jest/globals';

import {createBaseActions} from './baseActionFactory';

describe('baseActionFactory', () => {
  let mockFlux;
  let mockValidator;

  beforeEach(() => {
    mockValidator = jest.fn((input) => input);
    mockFlux = {
      dispatch: jest.fn(),
      getState: jest.fn(() => ({})),
      isInit: false,
      pluginTypes: [],
      state: {},
      storeActions: {}
    };
  });

  describe('createBaseActions', () => {
    it('should create base actions with validator', () => {
      const actions = createBaseActions(mockFlux, mockValidator);

      expect(actions.validator).toBeDefined();
      expect(actions.updateAdapter).toBeDefined();
      expect(actions.updateOptions).toBeDefined();
      expect(actions.createMutationAction).toBeDefined();
      expect(actions.createQueryAction).toBeDefined();
      expect(actions.flux).toBe(mockFlux);
    });

    it('should use custom adapter when provided', () => {
      const customAdapter = jest.fn((input) => ({...input, custom: true}));
      const actions = createBaseActions(mockFlux, mockValidator, {
        adapter: customAdapter
      });

      const result = actions.validator({test: 'data'});

      expect(result).toBeDefined();
      expect(actions.updateAdapter).toBeDefined();
    });

    it('should use custom adapter options when provided', () => {
      const customOptions = {strict: true};
      const actions = createBaseActions(mockFlux, mockValidator, {
        adapterOptions: customOptions
      });

      expect(actions.updateOptions).toBeDefined();
    });

    it('should create mutation action that validates input', async () => {
      const mockMutationFn = jest.fn().mockResolvedValue({result: {id: '123'}});
      const actions = createBaseActions(mockFlux, mockValidator);

      const mutationAction = actions.createMutationAction(
        'addItem',
        'items',
        {item: {type: 'ItemInput!', value: null}},
        ['id', 'name'],
        'ADD_ITEM_SUCCESS',
        'ADD_ITEM_ERROR',
        mockMutationFn
      );

      const input = {name: 'Test Item'};
      await mutationAction(input);

      expect(mockValidator).toHaveBeenCalled();
      expect(mockMutationFn).toHaveBeenCalled();
    });

    it('should create mutation action without input', async () => {
      const mockMutationFn = jest.fn().mockResolvedValue({result: {id: '123'}});
      const actions = createBaseActions(mockFlux, mockValidator);

      const mutationAction = actions.createMutationAction(
        'deleteItem',
        'items',
        {id: {type: 'String!', value: '123'}},
        [],
        'DELETE_ITEM_SUCCESS',
        'DELETE_ITEM_ERROR',
        mockMutationFn
      );

      await mutationAction();

      expect(mockValidator).not.toHaveBeenCalled();
      expect(mockMutationFn).toHaveBeenCalled();
    });

    it('should dispatch success action on mutation success', async () => {
      const mockMutationFn = jest.fn().mockImplementation(async (flux, mutationName, dataType, variables, props, options) => {
        const data = {
          items: {
            addItem: {id: '123', name: 'Test'}
          }
        };
        if (options?.onSuccess) {
          await options.onSuccess(data);
        }
        return {items: {addItem: {id: '123', name: 'Test'}}};
      });
      const actions = createBaseActions(mockFlux, mockValidator);

      const mutationAction = actions.createMutationAction(
        'addItem',
        'items',
        {item: {type: 'ItemInput!', value: null}},
        ['id', 'name'],
        'ADD_ITEM_SUCCESS',
        'ADD_ITEM_ERROR',
        mockMutationFn
      );

      await mutationAction({name: 'Test'});

      expect(mockFlux.dispatch).toHaveBeenCalledWith({
        item: {id: '123', name: 'Test'},
        type: 'ADD_ITEM_SUCCESS'
      });
    });

    it('should dispatch error action on mutation error', async () => {
      const error = new Error('Mutation failed');
      const mockMutationFn = jest.fn().mockRejectedValue(error);
      const actions = createBaseActions(mockFlux, mockValidator);

      const mutationAction = actions.createMutationAction(
        'addItem',
        'items',
        {item: {type: 'ItemInput!', value: null}},
        ['id', 'name'],
        'ADD_ITEM_SUCCESS',
        'ADD_ITEM_ERROR',
        mockMutationFn
      );

      await expect(mutationAction({name: 'Test'})).rejects.toThrow('Mutation failed');

      expect(mockFlux.dispatch).toHaveBeenCalledWith({
        error,
        type: 'ADD_ITEM_ERROR'
      });
    });

    it('should create query action', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue({result: {id: '123'}});
      const actions = createBaseActions(mockFlux, mockValidator);

      const queryAction = actions.createQueryAction(
        'getItem',
        'items',
        {id: {type: 'String!', value: '123'}},
        ['id', 'name'],
        'GET_ITEM_SUCCESS',
        'GET_ITEM_ERROR',
        mockQueryFn
      );

      const result = await queryAction();

      expect(mockQueryFn).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should dispatch success action on query success', async () => {
      const mockQueryFn = jest.fn().mockImplementation(async (flux, queryName, dataType, variables, props, options) => {
        const data = {
          items: {
            getItem: {id: '123', name: 'Test'}
          }
        };
        if (options?.onSuccess) {
          await options.onSuccess(data);
        }
        return {items: {getItem: {id: '123', name: 'Test'}}};
      });
      const actions = createBaseActions(mockFlux, mockValidator);

      const queryAction = actions.createQueryAction(
        'getItem',
        'items',
        {id: {type: 'String!', value: '123'}},
        ['id', 'name'],
        'GET_ITEM_SUCCESS',
        'GET_ITEM_ERROR',
        mockQueryFn
      );

      await queryAction();

      expect(mockFlux.dispatch).toHaveBeenCalledWith({
        item: {id: '123', name: 'Test'},
        type: 'GET_ITEM_SUCCESS'
      });
    });

    it('should dispatch error action on query error', async () => {
      const error = new Error('Query failed');
      const mockQueryFn = jest.fn().mockRejectedValue(error);
      const actions = createBaseActions(mockFlux, mockValidator);

      const queryAction = actions.createQueryAction(
        'getItem',
        'items',
        {id: {type: 'String!', value: '123'}},
        ['id', 'name'],
        'GET_ITEM_SUCCESS',
        'GET_ITEM_ERROR',
        mockQueryFn
      );

      await expect(queryAction()).rejects.toThrow('Query failed');

      expect(mockFlux.dispatch).toHaveBeenCalledWith({
        error,
        type: 'GET_ITEM_ERROR'
      });
    });

    it('should update adapter', () => {
      const newAdapter = jest.fn((input) => ({...input, updated: true}));
      const actions = createBaseActions(mockFlux, mockValidator);

      // First verify validator works without adapter
      const initialResult = actions.validator({test: 'initial'});
      expect(initialResult).toEqual({test: 'initial'});
      expect(mockValidator).toHaveBeenCalled();

      // Update adapter
      actions.updateAdapter(newAdapter);
      mockValidator.mockClear();
      newAdapter.mockClear();

      // Verify new adapter is used when validator is called
      const result = actions.validator({test: 'data'});

      // Default validator should be called first with input
      expect(mockValidator).toHaveBeenCalledWith({test: 'data'}, {});
      // Then custom adapter should be called with the validated result from mockValidator
      // mockValidator returns the input as-is, so newAdapter should receive {test: 'data'}
      expect(newAdapter).toHaveBeenCalledWith({test: 'data'}, {});
      expect(result).toEqual({test: 'data', updated: true});
    });

    it('should update options', () => {
      const actions = createBaseActions(mockFlux, mockValidator);
      const newOptions = {strict: true};

      actions.updateOptions(newOptions);

      expect(actions.updateOptions).toBeDefined();
    });
  });
});
