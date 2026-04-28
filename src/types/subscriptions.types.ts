/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {BaseDocument, ExtensibleFields} from './common.types.js';

export interface PaymentPlanType extends BaseDocument, ExtensibleFields {
  amount?: number;
  currency?: string;
  description?: string;
  interval?: string;
  intervalCount?: number;
  isActive?: boolean;
  itemId?: string;
  itemType?: string;
  name?: string;
  planId?: string;
  userId?: string;
}

export interface PaymentSubscriptionType extends BaseDocument, ExtensibleFields {
  cancelDate?: number;
  expires?: number;
  itemId?: string;
  itemType?: string;
  plan?: PaymentPlanType;
  planId?: string;
  status?: string;
  subscriptionId?: string;
  transactionId?: string;
  trialEnd?: number;
  userId?: string;
}
