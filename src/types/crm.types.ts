/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {User} from '../adapters/userAdapter/userAdapter.js';

export type MailingListStatus = 'active' | 'archived';
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'waiting_on_internal' | 'resolved' | 'closed';
export type SupportTicketType = 'delivery_issue' | 'refund_request' | 'bug_report' | 'account_issue' | 'general_support';
export type SupportTicketMessageVisibility = 'internal' | 'customer';

export interface MailingList {
  readonly added?: number;
  readonly createdByUserId?: string;
  readonly description?: string;
  readonly mailingListId?: string;
  readonly modified?: number;
  readonly name?: string;
  readonly status?: MailingListStatus;
}

export interface ShopifyProduct {
  readonly productId?: string;
  readonly title?: string;
  readonly variantId?: string;
}

export interface CustomerOrder {
  readonly added?: number;
  readonly currency?: string;
  readonly customerOrderId?: string;
  readonly modified?: number;
  readonly productIds?: readonly string[];
  readonly purchasedAt?: number;
  readonly shopifyCustomerId?: string;
  readonly shopifyOrderId?: string;
  readonly totalPrice?: number;
  readonly user?: Partial<User>;
  readonly userId?: string;
}

export interface ShopifyCustomerOrderInput {
  readonly currency?: string;
  readonly customer?: Partial<User>;
  readonly productIds?: readonly string[];
  readonly products?: readonly ShopifyProduct[];
  readonly purchasedAt?: number;
  readonly shopifyCustomerId: string;
  readonly shopifyOrderId: string;
  readonly totalPrice?: number;
}

export interface SupportTicket {
  readonly added?: number;
  readonly assignedToUserId?: string;
  readonly closedAt?: number;
  readonly description?: string;
  readonly modified?: number;
  readonly priority?: SupportTicketPriority;
  readonly productId?: string;
  readonly resolutionSummary?: string;
  readonly resolvedAt?: number;
  readonly shopifyOrderId?: string;
  readonly status?: SupportTicketStatus;
  readonly subject?: string;
  readonly supportTicketId?: string;
  readonly type?: SupportTicketType;
  readonly user?: Partial<User>;
  readonly userId?: string;
}

export interface SupportTicketMessage {
  readonly added?: number;
  readonly authorUserId?: string;
  readonly body?: string;
  readonly modified?: number;
  readonly supportTicketId?: string;
  readonly supportTicketMessageId?: string;
  readonly visibility?: SupportTicketMessageVisibility;
}

export interface SupportTicketEvent {
  readonly added?: number;
  readonly actorUserId?: string;
  readonly eventType?: string;
  readonly fromValue?: string;
  readonly metadata?: Record<string, unknown>;
  readonly modified?: number;
  readonly supportTicketEventId?: string;
  readonly supportTicketId?: string;
  readonly toValue?: string;
}

export interface CustomerNotification {
  readonly added?: number;
  readonly body?: string;
  readonly customerNotificationId?: string;
  readonly errorMessage?: string;
  readonly modified?: number;
  readonly providerMessageId?: string;
  readonly sentAt?: number;
  readonly status?: string;
  readonly subject?: string;
  readonly supportTicketId?: string;
  readonly type?: string;
  readonly userId?: string;
}
