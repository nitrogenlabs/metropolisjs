/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {BaseDocument, ExtensibleFields} from './common.types.js';

export interface PaymentPlanType extends BaseDocument, ExtensibleFields {
  readonly amount?: number;
  readonly currency?: string;
  readonly description?: string;
  readonly interval?: string;
  readonly intervalCount?: number;
  readonly isActive?: boolean;
  readonly itemId?: string;
  readonly itemType?: string;
  readonly name?: string;
  readonly planId?: string;
  readonly userId?: string;
}

export interface PaymentSubscriptionType extends BaseDocument, ExtensibleFields {
  readonly cancelDate?: number;
  readonly expires?: number;
  readonly itemId?: string;
  readonly itemType?: string;
  readonly plan?: PaymentPlanType;
  readonly planId?: string;
  readonly status?: string;
  readonly subscriptionId?: string;
  readonly transactionId?: string;
  readonly trialEnd?: number;
  readonly userId?: string;
}
