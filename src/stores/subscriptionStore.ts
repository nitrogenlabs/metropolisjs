/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {PaymentPlanType, PaymentSubscriptionType} from '../types/subscriptions.types.js';

export const SUBSCRIPTION_CONSTANTS = {
  ADD_PLAN_ERROR: 'SUBSCRIPTION_ADD_PLAN_ERROR',
  ADD_PLAN_SUCCESS: 'SUBSCRIPTION_ADD_PLAN_SUCCESS',
  ADD_SUBSCRIPTION_ERROR: 'SUBSCRIPTION_ADD_SUBSCRIPTION_ERROR',
  ADD_SUBSCRIPTION_SUCCESS: 'SUBSCRIPTION_ADD_SUBSCRIPTION_SUCCESS',
  DELETE_SUBSCRIPTION_ERROR: 'SUBSCRIPTION_DELETE_SUBSCRIPTION_ERROR',
  DELETE_SUBSCRIPTION_SUCCESS: 'SUBSCRIPTION_DELETE_SUBSCRIPTION_SUCCESS',
  GET_PLAN_ERROR: 'SUBSCRIPTION_GET_PLAN_ERROR',
  GET_PLAN_SUCCESS: 'SUBSCRIPTION_GET_PLAN_SUCCESS',
  GET_SUBSCRIPTION_ERROR: 'SUBSCRIPTION_GET_SUBSCRIPTION_ERROR',
  GET_SUBSCRIPTION_LIST_ERROR: 'SUBSCRIPTION_GET_SUBSCRIPTION_LIST_ERROR',
  GET_SUBSCRIPTION_LIST_SUCCESS: 'SUBSCRIPTION_GET_SUBSCRIPTION_LIST_SUCCESS',
  GET_SUBSCRIPTION_SUCCESS: 'SUBSCRIPTION_GET_SUBSCRIPTION_SUCCESS'
} as const;

export interface SubscriptionState {
  readonly error?: Error;
  readonly plansByItem: Record<string, PaymentPlanType>;
  readonly subscriptionList: PaymentSubscriptionType[];
  readonly subscriptionsByItem: Record<string, PaymentSubscriptionType>;
}

export const initialSubscriptionState: SubscriptionState = {
  error: undefined,
  plansByItem: {},
  subscriptionList: [],
  subscriptionsByItem: {}
};

type SubscriptionStoreAction = {
  readonly error?: Error;
  readonly itemKey?: string;
  readonly list?: PaymentSubscriptionType[];
  readonly plan?: PaymentPlanType;
  readonly subscription?: PaymentSubscriptionType;
};

export const subscriptionStore = (
  type: string,
  data: SubscriptionStoreAction,
  state = initialSubscriptionState
): SubscriptionState => {
  const {
    error,
    itemKey = '',
    plan,
    subscription
  } = data;

  switch(type) {
    case SUBSCRIPTION_CONSTANTS.ADD_PLAN_SUCCESS:
    case SUBSCRIPTION_CONSTANTS.GET_PLAN_SUCCESS:
      return itemKey
        ? {...state, error: undefined, plansByItem: {...state.plansByItem, [itemKey]: plan || {}}}
        : state;

    case SUBSCRIPTION_CONSTANTS.ADD_SUBSCRIPTION_SUCCESS:
    case SUBSCRIPTION_CONSTANTS.GET_SUBSCRIPTION_SUCCESS:
      return itemKey
        ? {...state, error: undefined, subscriptionsByItem: {...state.subscriptionsByItem, [itemKey]: subscription || {}}}
        : state;

    case SUBSCRIPTION_CONSTANTS.GET_SUBSCRIPTION_LIST_SUCCESS:
      return {...state, error: undefined, subscriptionList: data.list || []};

    case SUBSCRIPTION_CONSTANTS.DELETE_SUBSCRIPTION_SUCCESS:
      if(!itemKey) {
        return state;
      }

      return {
        ...state,
        error: undefined,
        subscriptionsByItem: {...state.subscriptionsByItem, [itemKey]: {}}
      };

    case SUBSCRIPTION_CONSTANTS.ADD_PLAN_ERROR:
    case SUBSCRIPTION_CONSTANTS.ADD_SUBSCRIPTION_ERROR:
    case SUBSCRIPTION_CONSTANTS.DELETE_SUBSCRIPTION_ERROR:
    case SUBSCRIPTION_CONSTANTS.GET_PLAN_ERROR:
    case SUBSCRIPTION_CONSTANTS.GET_SUBSCRIPTION_ERROR:
    case SUBSCRIPTION_CONSTANTS.GET_SUBSCRIPTION_LIST_ERROR:
      return {...state, error};

    default:
      return state;
  }
};

export const subscriptions = {
  action: subscriptionStore,
  initialState: initialSubscriptionState,
  name: 'subscription'
};
