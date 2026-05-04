/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {parseId, parseNum, parseString} from '@nlabs/utils';

import {SUBSCRIPTION_CONSTANTS} from '../../stores/subscriptionStore.js';
import {appMutation, appQuery} from '../../utils/api.js';
import {clearCachedRequest, getCachedRequest, setCachedRequest} from '../../utils/requestCache.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {PaymentPlanType, PaymentSubscriptionType} from '../../types/subscriptions.types.js';
import type {ActionRequestOptions} from '../../utils/requestCache.js';

const DATA_TYPE = 'subscriptions';
const DEFAULT_ITEM_TYPE = 'personas';
const DEFAULT_PLAN_FIELDS = ['amount', 'currency', 'description', 'id', 'interval', 'intervalCount', 'isActive', 'itemId', 'itemType', 'name', 'userId'];
const DEFAULT_SUBSCRIPTION_FIELDS = ['cancelDate', 'expires', 'id', 'itemId', 'itemType', 'planId', 'status', 'transactionId', 'trialEnd', 'userId', `plan {${DEFAULT_PLAN_FIELDS.join(', ')}}`];

const buildItemKey = (itemId: string, itemType: string = DEFAULT_ITEM_TYPE) => (
  `${parseString(itemType || DEFAULT_ITEM_TYPE, 32).toLowerCase()}:${parseId(itemId)}`
);

const normalizePlan = (plan: Partial<PaymentPlanType> = {}): Partial<PaymentPlanType> => ({
  ...plan,
  ...(plan.amount !== undefined ? {amount: parseNum(plan.amount)} : {}),
  ...(plan.interval ? {interval: parseString(plan.interval, 16).toLowerCase()} : {}),
  ...(plan.intervalCount !== undefined ? {intervalCount: parseNum(plan.intervalCount)} : {}),
  ...(plan.itemId ? {itemId: parseId(plan.itemId)} : {}),
  ...(plan.itemType ? {itemType: parseString(plan.itemType, 32).toLowerCase()} : {})
});

const normalizeSubscription = (subscription: Partial<PaymentSubscriptionType> = {}) => ({
  ...subscription,
  ...(subscription.itemId ? {itemId: parseId(subscription.itemId)} : {}),
  ...(subscription.itemType ? {itemType: parseString(subscription.itemType, 32).toLowerCase()} : {}),
  ...(subscription.planId ? {planId: parseId(subscription.planId)} : {})
});

export type SubscriptionApiResultsType = {
  subscriptions: {
    addPlan?: PaymentPlanType;
    addSubscription?: PaymentSubscriptionType;
    deleteSubscription?: boolean;
    getPlanByItem?: PaymentPlanType;
    getSubscription?: PaymentSubscriptionType;
    getSubscriptionListByUser?: PaymentSubscriptionType[];
    getSubscriptionByItem?: PaymentSubscriptionType;
  };
};

export interface SubscriptionActions {
  addPlan: (plan: Partial<PaymentPlanType>, planProps?: string[], requestOptions?: ActionRequestOptions) => Promise<PaymentPlanType>;
  addSubscription: (subscription: Partial<PaymentSubscriptionType>, subscriptionProps?: string[], requestOptions?: ActionRequestOptions) => Promise<PaymentSubscriptionType>;
  deleteSubscription: (itemId: string, itemType?: string, requestOptions?: ActionRequestOptions) => Promise<boolean>;
  getPlanByItem: (itemId: string, itemType?: string, planProps?: string[], requestOptions?: ActionRequestOptions) => Promise<PaymentPlanType>;
  getSubscriptionListByUser: (userId: string, from?: number, to?: number, subscriptionProps?: string[], requestOptions?: ActionRequestOptions) => Promise<PaymentSubscriptionType[]>;
  getSubscriptionByItem: (itemId: string, itemType?: string, subscriptionProps?: string[], requestOptions?: ActionRequestOptions) => Promise<PaymentSubscriptionType>;
}

export const createSubscriptionActions = (
  flux: FluxFramework
): SubscriptionActions => {
  const addPlan = async (
    plan: Partial<PaymentPlanType>,
    planProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<PaymentPlanType> => {
    const normalizedPlan = normalizePlan(plan);
    const itemKey = buildItemKey(String(normalizedPlan.itemId || ''), String(normalizedPlan.itemType || DEFAULT_ITEM_TYPE));

    try {
      const queryVariables = {
        item: {
          type: 'PlanInput!',
          value: normalizedPlan
        }
      };

      const onSuccess = (data: SubscriptionApiResultsType) => {
        const plan = data?.subscriptions?.addPlan || {};
        return flux.dispatch({itemKey, plan, type: SUBSCRIPTION_CONSTANTS.ADD_PLAN_SUCCESS});
      };

      return await appMutation<PaymentPlanType>(
        flux,
        'addPlan',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_PLAN_FIELDS, ...planProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: SUBSCRIPTION_CONSTANTS.ADD_PLAN_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `subscription.getPlanByItem:${itemKey}`);
    }
  };

  const getPlanByItem = async (
    itemId: string,
    itemType: string = DEFAULT_ITEM_TYPE,
    planProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<PaymentPlanType> => {
    const itemKey = buildItemKey(itemId, itemType);
    const cachedResult = getCachedRequest<PaymentPlanType>(flux, `subscription.getPlanByItem:${itemKey}`, {itemId, itemType, planProps}, requestOptions);

    if(cachedResult !== undefined) {
      return cachedResult;
    }

    try {
      const queryVariables = {
        itemId: {type: 'ID!', value: parseId(itemId)},
        itemType: {type: 'String', value: parseString(itemType || DEFAULT_ITEM_TYPE, 32).toLowerCase()}
      };

      const onSuccess = (data: SubscriptionApiResultsType) => {
        const plan = data?.subscriptions?.getPlanByItem || {};
        return flux.dispatch({itemKey, plan, type: SUBSCRIPTION_CONSTANTS.GET_PLAN_SUCCESS});
      };

      const result = await appQuery<PaymentPlanType>(
        flux,
        'getPlanByItem',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_PLAN_FIELDS, ...planProps],
        {onSuccess}
      );

      return await setCachedRequest(flux, `subscription.getPlanByItem:${itemKey}`, {itemId, itemType, planProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: SUBSCRIPTION_CONSTANTS.GET_PLAN_ERROR});
      throw error;
    }
  };

  const addSubscription = async (
    subscription: Partial<PaymentSubscriptionType>,
    subscriptionProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<PaymentSubscriptionType> => {
    const normalizedSubscription = normalizeSubscription(subscription);
    const itemKey = buildItemKey(String(normalizedSubscription.itemId || ''), String(normalizedSubscription.itemType || DEFAULT_ITEM_TYPE));

    try {
      const queryVariables = {
        item: {
          type: 'SubscriptionInput!',
          value: normalizedSubscription
        }
      };

      const onSuccess = (data: SubscriptionApiResultsType) => {
        const subscription = data?.subscriptions?.addSubscription || {};
        return flux.dispatch({itemKey, subscription, type: SUBSCRIPTION_CONSTANTS.ADD_SUBSCRIPTION_SUCCESS});
      };

      return await appMutation<PaymentSubscriptionType>(
        flux,
        'addSubscription',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_SUBSCRIPTION_FIELDS, ...subscriptionProps],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: SUBSCRIPTION_CONSTANTS.ADD_SUBSCRIPTION_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `subscription.getSubscriptionByItem:${itemKey}`);
    }
  };

  const getSubscriptionByItem = async (
    itemId: string,
    itemType: string = DEFAULT_ITEM_TYPE,
    subscriptionProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<PaymentSubscriptionType> => {
    const itemKey = buildItemKey(itemId, itemType);
    const cachedResult = getCachedRequest<PaymentSubscriptionType>(flux, `subscription.getSubscriptionByItem:${itemKey}`, {itemId, itemType, subscriptionProps}, requestOptions);

    if(cachedResult !== undefined) {
      return cachedResult;
    }

    try {
      const queryVariables = {
        itemId: {type: 'ID!', value: parseId(itemId)},
        itemType: {type: 'String', value: parseString(itemType || DEFAULT_ITEM_TYPE, 32).toLowerCase()}
      };

      const onSuccess = (data: SubscriptionApiResultsType) => {
        const subscription = data?.subscriptions?.getSubscriptionByItem || {};
        return flux.dispatch({itemKey, subscription, type: SUBSCRIPTION_CONSTANTS.GET_SUBSCRIPTION_SUCCESS});
      };

      const result = await appQuery<PaymentSubscriptionType>(
        flux,
        'getSubscriptionByItem',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_SUBSCRIPTION_FIELDS, ...subscriptionProps],
        {onSuccess}
      );

      return await setCachedRequest(flux, `subscription.getSubscriptionByItem:${itemKey}`, {itemId, itemType, subscriptionProps}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: SUBSCRIPTION_CONSTANTS.GET_SUBSCRIPTION_ERROR});
      throw error;
    }
  };

  const getSubscriptionListByUser = async (
    userId: string,
    from: number = 0,
    to: number = 30,
    subscriptionProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<PaymentSubscriptionType[]> => {
    const normalizedUserId = parseId(userId);
    const cacheKey = `subscription.getSubscriptionListByUser:${normalizedUserId}:${from}:${to}`;
    const cachedResult = getCachedRequest<PaymentSubscriptionType[]>(flux, cacheKey, {
      from,
      subscriptionProps,
      to,
      userId: normalizedUserId
    }, requestOptions);

    if(cachedResult !== undefined) {
      return cachedResult;
    }

    try {
      const queryVariables = {
        userId: {type: 'ID!', value: normalizedUserId},
        from: {type: 'Int', value: from},
        to: {type: 'Int', value: to}
      };

      const onSuccess = (data: SubscriptionApiResultsType) => {
        const list = data?.subscriptions?.getSubscriptionListByUser || [];
        return flux.dispatch({list, type: SUBSCRIPTION_CONSTANTS.GET_SUBSCRIPTION_LIST_SUCCESS});
      };

      const result = await appQuery<PaymentSubscriptionType[]>(
        flux,
        'getSubscriptionListByUser',
        DATA_TYPE,
        queryVariables,
        [...DEFAULT_SUBSCRIPTION_FIELDS, ...subscriptionProps],
        {onSuccess}
      );

      return await setCachedRequest(flux, cacheKey, {
        from,
        subscriptionProps,
        to,
        userId: normalizedUserId
      }, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: SUBSCRIPTION_CONSTANTS.GET_SUBSCRIPTION_LIST_ERROR});
      throw error;
    }
  };

  const deleteSubscription = async (
    itemId: string,
    itemType: string = DEFAULT_ITEM_TYPE,
    requestOptions: ActionRequestOptions = {}
  ): Promise<boolean> => {
    const itemKey = buildItemKey(itemId, itemType);

    try {
      const queryVariables = {
        item: {
          type: 'SubscriptionInput!',
          value: {
            itemId: parseId(itemId),
            itemType: parseString(itemType || DEFAULT_ITEM_TYPE, 32).toLowerCase()
          }
        }
      };

      const onSuccess = (data: SubscriptionApiResultsType) => {
        const success = Boolean(data?.subscriptions?.deleteSubscription);
        return flux.dispatch({itemKey, success, type: SUBSCRIPTION_CONSTANTS.DELETE_SUBSCRIPTION_SUCCESS});
      };

      return await appMutation<boolean>(
        flux,
        'deleteSubscription',
        DATA_TYPE,
        queryVariables,
        [],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: SUBSCRIPTION_CONSTANTS.DELETE_SUBSCRIPTION_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `subscription.getSubscriptionByItem:${itemKey}`);
    }
  };

  return {
    addPlan,
    addSubscription,
    deleteSubscription,
    getPlanByItem,
    getSubscriptionListByUser,
    getSubscriptionByItem
  };
};
