/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {appMutation, appQuery} from '../../utils/api.js';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {User} from '../../adapters/userAdapter/userAdapter.js';
import type {ApiOptions, ApiQueryVariables} from '../../utils/api.js';
import type {
  CustomerNotification,
  CustomerOrder,
  MailingList,
  ShopifyCustomerOrderInput,
  SupportTicket,
  SupportTicketEvent,
  SupportTicketMessage,
  SupportTicketStatus
} from '../../types/crm.types.js';

const DATA_TYPE = 'crm';
const documentKey = (id: string): string => String(id || '').split('/').pop() || '';

export const CRM_CONSTANTS = {
  ADD_SUPPORT_TICKET_MESSAGE_ERROR: 'CRM_ADD_SUPPORT_TICKET_MESSAGE_ERROR',
  ADD_SUPPORT_TICKET_MESSAGE_SUCCESS: 'CRM_ADD_SUPPORT_TICKET_MESSAGE_SUCCESS',
  ADD_USER_TO_MAILING_LIST_ERROR: 'CRM_ADD_USER_TO_MAILING_LIST_ERROR',
  ADD_USER_TO_MAILING_LIST_SUCCESS: 'CRM_ADD_USER_TO_MAILING_LIST_SUCCESS',
  CREATE_MAILING_LIST_ERROR: 'CRM_CREATE_MAILING_LIST_ERROR',
  CREATE_MAILING_LIST_SUCCESS: 'CRM_CREATE_MAILING_LIST_SUCCESS',
  CREATE_SUPPORT_TICKET_ERROR: 'CRM_CREATE_SUPPORT_TICKET_ERROR',
  CREATE_SUPPORT_TICKET_SUCCESS: 'CRM_CREATE_SUPPORT_TICKET_SUCCESS',
  CUSTOMER_NOTIFICATIONS_BY_USER_ERROR: 'CRM_CUSTOMER_NOTIFICATIONS_BY_USER_ERROR',
  CUSTOMER_NOTIFICATIONS_BY_USER_SUCCESS: 'CRM_CUSTOMER_NOTIFICATIONS_BY_USER_SUCCESS',
  CUSTOMER_ORDERS_BY_USER_ERROR: 'CRM_CUSTOMER_ORDERS_BY_USER_ERROR',
  CUSTOMER_ORDERS_BY_USER_SUCCESS: 'CRM_CUSTOMER_ORDERS_BY_USER_SUCCESS',
  ELIGIBLE_MAILING_USERS_ERROR: 'CRM_ELIGIBLE_MAILING_USERS_ERROR',
  ELIGIBLE_MAILING_USERS_SUCCESS: 'CRM_ELIGIBLE_MAILING_USERS_SUCCESS',
  INGEST_SHOPIFY_CUSTOMER_ORDER_ERROR: 'CRM_INGEST_SHOPIFY_CUSTOMER_ORDER_ERROR',
  INGEST_SHOPIFY_CUSTOMER_ORDER_SUCCESS: 'CRM_INGEST_SHOPIFY_CUSTOMER_ORDER_SUCCESS',
  MAILING_LIST_USERS_ERROR: 'CRM_MAILING_LIST_USERS_ERROR',
  MAILING_LIST_USERS_SUCCESS: 'CRM_MAILING_LIST_USERS_SUCCESS',
  MAILING_LISTS_ERROR: 'CRM_MAILING_LISTS_ERROR',
  MAILING_LISTS_SUCCESS: 'CRM_MAILING_LISTS_SUCCESS',
  REMOVE_USER_FROM_MAILING_LIST_ERROR: 'CRM_REMOVE_USER_FROM_MAILING_LIST_ERROR',
  REMOVE_USER_FROM_MAILING_LIST_SUCCESS: 'CRM_REMOVE_USER_FROM_MAILING_LIST_SUCCESS',
  SUPPORT_TICKET_EVENTS_ERROR: 'CRM_SUPPORT_TICKET_EVENTS_ERROR',
  SUPPORT_TICKET_EVENTS_SUCCESS: 'CRM_SUPPORT_TICKET_EVENTS_SUCCESS',
  SUPPORT_TICKET_MESSAGES_ERROR: 'CRM_SUPPORT_TICKET_MESSAGES_ERROR',
  SUPPORT_TICKET_MESSAGES_SUCCESS: 'CRM_SUPPORT_TICKET_MESSAGES_SUCCESS',
  SUPPORT_TICKETS_ERROR: 'CRM_SUPPORT_TICKETS_ERROR',
  SUPPORT_TICKETS_SUCCESS: 'CRM_SUPPORT_TICKETS_SUCCESS',
  UPDATE_SUPPORT_TICKET_STATUS_ERROR: 'CRM_UPDATE_SUPPORT_TICKET_STATUS_ERROR',
  UPDATE_SUPPORT_TICKET_STATUS_SUCCESS: 'CRM_UPDATE_SUPPORT_TICKET_STATUS_SUCCESS',
  USERS_BY_PURCHASED_PRODUCT_ERROR: 'CRM_USERS_BY_PURCHASED_PRODUCT_ERROR',
  USERS_BY_PURCHASED_PRODUCT_SUCCESS: 'CRM_USERS_BY_PURCHASED_PRODUCT_SUCCESS'
} as const;

const USER_FIELDS = ['userId', 'email', 'firstName', 'lastName', 'marketingOptIn', 'shopifyCustomerId'];
const MAILING_LIST_FIELDS = ['mailingListId', 'name', 'description', 'status', 'createdByUserId', 'added', 'modified'];
const CUSTOMER_ORDER_FIELDS = ['customerOrderId', 'userId', 'shopifyCustomerId', 'shopifyOrderId', 'productIds', 'totalPrice', 'currency', 'purchasedAt', 'added', 'modified'];
const SUPPORT_TICKET_FIELDS = [
  'supportTicketId',
  'userId',
  'type',
  'status',
  'priority',
  'subject',
  'description',
  'productId',
  'shopifyOrderId',
  'assignedToUserId',
  'resolutionSummary',
  'resolvedAt',
  'closedAt',
  'added',
  'modified'
];
const SUPPORT_TICKET_MESSAGE_FIELDS = ['supportTicketMessageId', 'supportTicketId', 'authorUserId', 'visibility', 'body', 'added', 'modified'];
const SUPPORT_TICKET_EVENT_FIELDS = ['supportTicketEventId', 'supportTicketId', 'actorUserId', 'eventType', 'fromValue', 'toValue', 'added', 'modified'];
const CUSTOMER_NOTIFICATION_FIELDS = ['customerNotificationId', 'userId', 'supportTicketId', 'type', 'status', 'subject', 'body', 'sentAt', 'providerMessageId', 'errorMessage', 'added', 'modified'];

export interface CrmActionsOptions {}

export type CrmApiResultsType = {
  readonly crm: {
    readonly addSupportTicketMessage?: SupportTicketMessage;
    readonly addUserToMailingList?: MailingList;
    readonly createMailingList?: MailingList;
    readonly createSupportTicket?: SupportTicket;
    readonly customerNotificationsByUser?: CustomerNotification[];
    readonly customerOrdersByUser?: CustomerOrder[];
    readonly eligibleMailingUsers?: User[];
    readonly ingestShopifyCustomerOrder?: CustomerOrder;
    readonly mailingLists?: MailingList[];
    readonly mailingListUsers?: User[];
    readonly removeUserFromMailingList?: boolean;
    readonly supportTicketEvents?: SupportTicketEvent[];
    readonly supportTicketMessages?: SupportTicketMessage[];
    readonly supportTickets?: SupportTicket[];
    readonly updateSupportTicketStatus?: SupportTicket;
    readonly usersByPurchasedProduct?: User[];
  };
};

export interface CrmActions {
  readonly addSupportTicketMessage: (message: Partial<SupportTicketMessage>, messageProps?: string[], requestOptions?: ApiOptions) => Promise<SupportTicketMessage>;
  readonly addUserToMailingList: (userId: string, mailingListId: string, source?: string, mailingListProps?: string[], requestOptions?: ApiOptions) => Promise<MailingList>;
  readonly createMailingList: (mailingList: Partial<MailingList>, mailingListProps?: string[], requestOptions?: ApiOptions) => Promise<MailingList>;
  readonly createSupportTicket: (ticket: Partial<SupportTicket>, ticketProps?: string[], requestOptions?: ApiOptions) => Promise<SupportTicket>;
  readonly customerNotificationsByUser: (userId: string, notificationProps?: string[], requestOptions?: ApiOptions) => Promise<CustomerNotification[]>;
  readonly customerOrdersByUser: (userId: string, orderProps?: string[], requestOptions?: ApiOptions) => Promise<CustomerOrder[]>;
  readonly eligibleMailingUsers: (options?: {readonly excludeOpenSupportTickets?: boolean; readonly mailingListId?: string; readonly productId?: string}, userProps?: string[], requestOptions?: ApiOptions) => Promise<User[]>;
  readonly ingestShopifyCustomerOrder: (order: ShopifyCustomerOrderInput, orderProps?: string[], requestOptions?: ApiOptions) => Promise<CustomerOrder>;
  readonly mailingLists: (mailingListProps?: string[], requestOptions?: ApiOptions) => Promise<MailingList[]>;
  readonly mailingListUsers: (mailingListId: string, userProps?: string[], requestOptions?: ApiOptions) => Promise<User[]>;
  readonly removeUserFromMailingList: (userId: string, mailingListId: string, requestOptions?: ApiOptions) => Promise<boolean>;
  readonly supportTicketEvents: (supportTicketId: string, eventProps?: string[], requestOptions?: ApiOptions) => Promise<SupportTicketEvent[]>;
  readonly supportTicketMessages: (supportTicketId: string, messageProps?: string[], requestOptions?: ApiOptions) => Promise<SupportTicketMessage[]>;
  readonly supportTickets: (filters?: {readonly status?: string; readonly userId?: string}, ticketProps?: string[], requestOptions?: ApiOptions) => Promise<SupportTicket[]>;
  readonly updateSupportTicketStatus: (supportTicketId: string, status: SupportTicketStatus, resolutionSummary?: string, ticketProps?: string[], requestOptions?: ApiOptions) => Promise<SupportTicket>;
  readonly usersByPurchasedProduct: (productId: string, userProps?: string[], requestOptions?: ApiOptions) => Promise<User[]>;
}

export const createCrmActions = (
  flux: FluxFramework,
  _options?: CrmActionsOptions
): CrmActions => {
  const withSuccess = (
    requestOptions: ApiOptions,
    type: string,
    payloadKey: string,
    selector: (data: CrmApiResultsType) => unknown
  ): ApiOptions => ({
    ...requestOptions,
    onSuccess: (data: CrmApiResultsType) => flux.dispatch({[payloadKey]: selector(data), type})
  });

  const crmQuery = async <T>(
    name: string,
    queryVariables: ApiQueryVariables,
    returnProperties: string[],
    requestOptions: ApiOptions,
    successType: string,
    errorType: string,
    payloadKey: string,
    selector: (data: CrmApiResultsType) => unknown
  ): Promise<T> => {
    try {
      return await appQuery<T>(
        flux,
        name,
        DATA_TYPE,
        queryVariables,
        returnProperties,
        withSuccess(requestOptions, successType, payloadKey, selector)
      );
    } catch(error) {
      flux.dispatch({error, type: errorType});
      throw error;
    }
  };

  const crmMutation = async <T>(
    name: string,
    queryVariables: ApiQueryVariables,
    returnProperties: string[],
    requestOptions: ApiOptions,
    successType: string,
    errorType: string,
    payloadKey: string,
    selector: (data: CrmApiResultsType) => unknown
  ): Promise<T> => {
    try {
      return await appMutation<T>(
        flux,
        name,
        DATA_TYPE,
        queryVariables,
        returnProperties,
        withSuccess(requestOptions, successType, payloadKey, selector)
      );
    } catch(error) {
      flux.dispatch({error, type: errorType});
      throw error;
    }
  };

  const mailingLists = async (
    mailingListProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<MailingList[]> => crmQuery<MailingList[]>(
    'mailingLists',
    {},
    [...MAILING_LIST_FIELDS, ...mailingListProps],
    requestOptions,
    CRM_CONSTANTS.MAILING_LISTS_SUCCESS,
    CRM_CONSTANTS.MAILING_LISTS_ERROR,
    'list',
    (data) => data?.crm?.mailingLists || []
  );

  const createMailingList = async (
    mailingList: Partial<MailingList>,
    mailingListProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<MailingList> => crmMutation<MailingList>(
    'createMailingList',
    {
      mailingList: {
        type: 'MailingListInput!',
        value: mailingList
      }
    },
    [...MAILING_LIST_FIELDS, ...mailingListProps],
    requestOptions,
    CRM_CONSTANTS.CREATE_MAILING_LIST_SUCCESS,
    CRM_CONSTANTS.CREATE_MAILING_LIST_ERROR,
    'mailingList',
    (data) => data?.crm?.createMailingList || {}
  );

  const addUserToMailingList = async (
    userId: string,
    mailingListId: string,
    source = 'manual',
    mailingListProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<MailingList> => crmMutation<MailingList>(
    'addUserToMailingList',
    {
      mailingListId: {
        type: 'ID!',
        value: documentKey(mailingListId)
      },
      source: {
        type: 'String',
        value: source
      },
      userId: {
        type: 'ID!',
        value: documentKey(userId)
      }
    },
    [...MAILING_LIST_FIELDS, ...mailingListProps],
    requestOptions,
    CRM_CONSTANTS.ADD_USER_TO_MAILING_LIST_SUCCESS,
    CRM_CONSTANTS.ADD_USER_TO_MAILING_LIST_ERROR,
    'mailingList',
    (data) => data?.crm?.addUserToMailingList || {}
  );

  const removeUserFromMailingList = async (
    userId: string,
    mailingListId: string,
    requestOptions: ApiOptions = {}
  ): Promise<boolean> => crmMutation<boolean>(
    'removeUserFromMailingList',
    {
      mailingListId: {
        type: 'ID!',
        value: documentKey(mailingListId)
      },
      userId: {
        type: 'ID!',
        value: documentKey(userId)
      }
    },
    [],
    requestOptions,
    CRM_CONSTANTS.REMOVE_USER_FROM_MAILING_LIST_SUCCESS,
    CRM_CONSTANTS.REMOVE_USER_FROM_MAILING_LIST_ERROR,
    'removed',
    (data) => data?.crm?.removeUserFromMailingList || false
  );

  const mailingListUsers = async (
    mailingListId: string,
    userProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<User[]> => crmQuery<User[]>(
    'mailingListUsers',
    {
      mailingListId: {
        type: 'ID!',
        value: documentKey(mailingListId)
      }
    },
    [...USER_FIELDS, ...userProps],
    requestOptions,
    CRM_CONSTANTS.MAILING_LIST_USERS_SUCCESS,
    CRM_CONSTANTS.MAILING_LIST_USERS_ERROR,
    'list',
    (data) => data?.crm?.mailingListUsers || []
  );

  const eligibleMailingUsers = async (
    options: {readonly excludeOpenSupportTickets?: boolean; readonly mailingListId?: string; readonly productId?: string} = {},
    userProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<User[]> => crmQuery<User[]>(
    'eligibleMailingUsers',
    {
      excludeOpenSupportTickets: {
        type: 'Boolean',
        value: options.excludeOpenSupportTickets
      },
      mailingListId: {
        type: 'ID',
        value: options.mailingListId ? documentKey(options.mailingListId) : undefined
      },
      productId: {
        type: 'ID',
        value: options.productId
      }
    },
    [...USER_FIELDS, ...userProps],
    requestOptions,
    CRM_CONSTANTS.ELIGIBLE_MAILING_USERS_SUCCESS,
    CRM_CONSTANTS.ELIGIBLE_MAILING_USERS_ERROR,
    'list',
    (data) => data?.crm?.eligibleMailingUsers || []
  );

  const usersByPurchasedProduct = async (
    productId: string,
    userProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<User[]> => crmQuery<User[]>(
    'usersByPurchasedProduct',
    {
      productId: {
        type: 'ID!',
        value: productId
      }
    },
    [...USER_FIELDS, ...userProps],
    requestOptions,
    CRM_CONSTANTS.USERS_BY_PURCHASED_PRODUCT_SUCCESS,
    CRM_CONSTANTS.USERS_BY_PURCHASED_PRODUCT_ERROR,
    'list',
    (data) => data?.crm?.usersByPurchasedProduct || []
  );

  const ingestShopifyCustomerOrder = async (
    order: ShopifyCustomerOrderInput,
    orderProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<CustomerOrder> => crmMutation<CustomerOrder>(
    'ingestShopifyCustomerOrder',
    {
      order: {
        type: 'ShopifyCustomerOrderInput!',
        value: order
      }
    },
    [...CUSTOMER_ORDER_FIELDS, ...orderProps],
    requestOptions,
    CRM_CONSTANTS.INGEST_SHOPIFY_CUSTOMER_ORDER_SUCCESS,
    CRM_CONSTANTS.INGEST_SHOPIFY_CUSTOMER_ORDER_ERROR,
    'customerOrder',
    (data) => data?.crm?.ingestShopifyCustomerOrder || {}
  );

  const customerOrdersByUser = async (
    userId: string,
    orderProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<CustomerOrder[]> => crmQuery<CustomerOrder[]>(
    'customerOrdersByUser',
    {
      userId: {
        type: 'ID!',
        value: documentKey(userId)
      }
    },
    [...CUSTOMER_ORDER_FIELDS, ...orderProps],
    requestOptions,
    CRM_CONSTANTS.CUSTOMER_ORDERS_BY_USER_SUCCESS,
    CRM_CONSTANTS.CUSTOMER_ORDERS_BY_USER_ERROR,
    'list',
    (data) => data?.crm?.customerOrdersByUser || []
  );

  const createSupportTicket = async (
    ticket: Partial<SupportTicket>,
    ticketProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<SupportTicket> => crmMutation<SupportTicket>(
    'createSupportTicket',
    {
      ticket: {
        type: 'SupportTicketInput!',
        value: ticket
      }
    },
    [...SUPPORT_TICKET_FIELDS, ...ticketProps],
    requestOptions,
    CRM_CONSTANTS.CREATE_SUPPORT_TICKET_SUCCESS,
    CRM_CONSTANTS.CREATE_SUPPORT_TICKET_ERROR,
    'supportTicket',
    (data) => data?.crm?.createSupportTicket || {}
  );

  const supportTickets = async (
    filters: {readonly status?: string; readonly userId?: string} = {},
    ticketProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<SupportTicket[]> => crmQuery<SupportTicket[]>(
    'supportTickets',
    {
      status: {
        type: 'String',
        value: filters.status
      },
      userId: {
        type: 'ID',
        value: filters.userId ? documentKey(filters.userId) : undefined
      }
    },
    [...SUPPORT_TICKET_FIELDS, ...ticketProps],
    requestOptions,
    CRM_CONSTANTS.SUPPORT_TICKETS_SUCCESS,
    CRM_CONSTANTS.SUPPORT_TICKETS_ERROR,
    'list',
    (data) => data?.crm?.supportTickets || []
  );

  const updateSupportTicketStatus = async (
    supportTicketId: string,
    status: SupportTicketStatus,
    resolutionSummary = '',
    ticketProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<SupportTicket> => crmMutation<SupportTicket>(
    'updateSupportTicketStatus',
    {
      resolutionSummary: {
        type: 'String',
        value: resolutionSummary
      },
      status: {
        type: 'String!',
        value: status
      },
      supportTicketId: {
        type: 'ID!',
        value: documentKey(supportTicketId)
      }
    },
    [...SUPPORT_TICKET_FIELDS, ...ticketProps],
    requestOptions,
    CRM_CONSTANTS.UPDATE_SUPPORT_TICKET_STATUS_SUCCESS,
    CRM_CONSTANTS.UPDATE_SUPPORT_TICKET_STATUS_ERROR,
    'supportTicket',
    (data) => data?.crm?.updateSupportTicketStatus || {}
  );

  const addSupportTicketMessage = async (
    message: Partial<SupportTicketMessage>,
    messageProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<SupportTicketMessage> => crmMutation<SupportTicketMessage>(
    'addSupportTicketMessage',
    {
      message: {
        type: 'SupportTicketMessageInput!',
        value: message
      }
    },
    [...SUPPORT_TICKET_MESSAGE_FIELDS, ...messageProps],
    requestOptions,
    CRM_CONSTANTS.ADD_SUPPORT_TICKET_MESSAGE_SUCCESS,
    CRM_CONSTANTS.ADD_SUPPORT_TICKET_MESSAGE_ERROR,
    'supportTicketMessage',
    (data) => data?.crm?.addSupportTicketMessage || {}
  );

  const supportTicketMessages = async (
    supportTicketId: string,
    messageProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<SupportTicketMessage[]> => crmQuery<SupportTicketMessage[]>(
    'supportTicketMessages',
    {
      supportTicketId: {
        type: 'ID!',
        value: documentKey(supportTicketId)
      }
    },
    [...SUPPORT_TICKET_MESSAGE_FIELDS, ...messageProps],
    requestOptions,
    CRM_CONSTANTS.SUPPORT_TICKET_MESSAGES_SUCCESS,
    CRM_CONSTANTS.SUPPORT_TICKET_MESSAGES_ERROR,
    'list',
    (data) => data?.crm?.supportTicketMessages || []
  );

  const supportTicketEvents = async (
    supportTicketId: string,
    eventProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<SupportTicketEvent[]> => crmQuery<SupportTicketEvent[]>(
    'supportTicketEvents',
    {
      supportTicketId: {
        type: 'ID!',
        value: documentKey(supportTicketId)
      }
    },
    [...SUPPORT_TICKET_EVENT_FIELDS, ...eventProps],
    requestOptions,
    CRM_CONSTANTS.SUPPORT_TICKET_EVENTS_SUCCESS,
    CRM_CONSTANTS.SUPPORT_TICKET_EVENTS_ERROR,
    'list',
    (data) => data?.crm?.supportTicketEvents || []
  );

  const customerNotificationsByUser = async (
    userId: string,
    notificationProps: string[] = [],
    requestOptions: ApiOptions = {}
  ): Promise<CustomerNotification[]> => crmQuery<CustomerNotification[]>(
    'customerNotificationsByUser',
    {
      userId: {
        type: 'ID!',
        value: documentKey(userId)
      }
    },
    [...CUSTOMER_NOTIFICATION_FIELDS, ...notificationProps],
    requestOptions,
    CRM_CONSTANTS.CUSTOMER_NOTIFICATIONS_BY_USER_SUCCESS,
    CRM_CONSTANTS.CUSTOMER_NOTIFICATIONS_BY_USER_ERROR,
    'list',
    (data) => data?.crm?.customerNotificationsByUser || []
  );

  return {
    addSupportTicketMessage,
    addUserToMailingList,
    createMailingList,
    createSupportTicket,
    customerNotificationsByUser,
    customerOrdersByUser,
    eligibleMailingUsers,
    ingestShopifyCustomerOrder,
    mailingLists,
    mailingListUsers,
    removeUserFromMailingList,
    supportTicketEvents,
    supportTicketMessages,
    supportTickets,
    updateSupportTicketStatus,
    usersByPurchasedProduct
  };
};
