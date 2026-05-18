import {describe, expect, it} from 'vitest';

import {SUBSCRIPTION_CONSTANTS, subscriptionStore} from './subscriptionStore.js';

describe('subscriptionStore', () => {
  it('handles plan and subscription reducer branches', () => {
    let state = subscriptionStore(SUBSCRIPTION_CONSTANTS.ADD_PLAN_SUCCESS, {
      itemKey: 'personas:persona-1',
      plan: {id: 'plan-1'} as any
    });
    state = subscriptionStore(SUBSCRIPTION_CONSTANTS.GET_PLAN_SUCCESS, {
      itemKey: 'personas:persona-1',
      plan: {id: 'plan-2'} as any
    }, state);
    state = subscriptionStore(SUBSCRIPTION_CONSTANTS.ADD_SUBSCRIPTION_SUCCESS, {
      itemKey: 'personas:persona-1',
      subscription: {id: 'subscription-1'} as any
    }, state);
    state = subscriptionStore(SUBSCRIPTION_CONSTANTS.GET_SUBSCRIPTION_SUCCESS, {
      itemKey: 'personas:persona-1',
      subscription: {id: 'subscription-2'} as any
    }, state);
    state = subscriptionStore(SUBSCRIPTION_CONSTANTS.GET_SUBSCRIPTION_LIST_SUCCESS, {
      list: [{id: 'subscription-1'} as any]
    }, state);

    expect(state.plansByItem['personas:persona-1'].id).toBe('plan-2');
    expect(state.subscriptionList).toHaveLength(1);

    state = subscriptionStore(SUBSCRIPTION_CONSTANTS.DELETE_SUBSCRIPTION_SUCCESS, {
      itemKey: 'personas:persona-1'
    }, state);
    expect(state.subscriptionsByItem['personas:persona-1']).toEqual({});
    expect(subscriptionStore(SUBSCRIPTION_CONSTANTS.GET_PLAN_ERROR, {error: new Error('bad')}, state).error?.message).toBe('bad');
    expect(subscriptionStore(SUBSCRIPTION_CONSTANTS.ADD_PLAN_SUCCESS, {}, state)).toBe(state);
    expect(subscriptionStore(SUBSCRIPTION_CONSTANTS.DELETE_SUBSCRIPTION_SUCCESS, {}, state)).toBe(state);
  });
});
