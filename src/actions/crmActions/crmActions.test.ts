import {beforeEach, describe, expect, it, vi} from 'vitest';

const appMutationMock = vi.fn();
const appQueryMock = vi.fn();

vi.mock('../../utils/api.js', () => ({
  appMutation: appMutationMock,
  appQuery: appQueryMock
}));

const {CRM_CONSTANTS, createCrmActions} = await import('./crmActions.js');

const flux = {
  dispatch: vi.fn(),
  getState: vi.fn((path: string, fallback?: unknown) => fallback),
  setState: vi.fn()
};

describe('createCrmActions', () => {
  beforeEach(() => {
    appMutationMock.mockReset();
    appQueryMock.mockReset();
    flux.dispatch.mockReset().mockImplementation(async (action) => action);
  });

  it('creates the CRM action surface', () => {
    const actions = createCrmActions(flux as any);

    expect(actions.createMailingList).toBeTypeOf('function');
    expect(actions.addUserToMailingList).toBeTypeOf('function');
    expect(actions.ingestShopifyCustomerOrder).toBeTypeOf('function');
    expect(actions.createSupportTicket).toBeTypeOf('function');
    expect(actions.updateSupportTicketStatus).toBeTypeOf('function');
    expect(actions.supportTicketMessages).toBeTypeOf('function');
    expect(actions.customerNotificationsByUser).toBeTypeOf('function');
  });

  it('calls CRM mutations with canonical Reaktor schema names', async () => {
    const actions = createCrmActions(flux as any);
    const order = {
      customer: {email: 'ada@example.com', marketingOptIn: true},
      productIds: ['gid://shopify/Product/1'],
      shopifyCustomerId: 'gid://shopify/Customer/1',
      shopifyOrderId: 'gid://shopify/Order/1'
    };

    appMutationMock.mockResolvedValue({customerOrderId: 'order1'});

    await actions.ingestShopifyCustomerOrder(order);
    await actions.updateSupportTicketStatus('supportTickets/ticket1', 'resolved', 'Fixed');

    expect(appMutationMock).toHaveBeenNthCalledWith(
      1,
      flux,
      'ingestShopifyCustomerOrder',
      'crm',
      {
        order: {
          type: 'ShopifyCustomerOrderInput!',
          value: order
        }
      },
      expect.arrayContaining(['customerOrderId', 'shopifyCustomerId', 'shopifyOrderId']),
      expect.objectContaining({onSuccess: expect.any(Function)})
    );
    expect(appMutationMock).toHaveBeenNthCalledWith(
      2,
      flux,
      'updateSupportTicketStatus',
      'crm',
      expect.objectContaining({
        resolutionSummary: {type: 'String', value: 'Fixed'},
        status: {type: 'String!', value: 'resolved'},
        supportTicketId: {type: 'ID!', value: 'ticket1'}
      }),
      expect.arrayContaining(['supportTicketId', 'resolutionSummary', 'resolvedAt']),
      expect.objectContaining({onSuccess: expect.any(Function)})
    );
  });

  it('calls CRM queries for mailing and support data', async () => {
    const actions = createCrmActions(flux as any);

    appQueryMock.mockResolvedValue([]);

    await actions.eligibleMailingUsers({productId: 'gid://shopify/Product/1'});
    await actions.supportTickets({status: 'open', userId: 'users/user1'});
    await actions.usersByPurchasedProduct('gid://shopify/Product/1');

    expect(appQueryMock).toHaveBeenNthCalledWith(
      1,
      flux,
      'eligibleMailingUsers',
      'crm',
      expect.objectContaining({
        productId: {type: 'ID', value: 'gid://shopify/Product/1'}
      }),
      expect.arrayContaining(['userId', 'email', 'marketingOptIn']),
      expect.objectContaining({onSuccess: expect.any(Function)})
    );
    expect(appQueryMock).toHaveBeenNthCalledWith(
      2,
      flux,
      'supportTickets',
      'crm',
      expect.objectContaining({
        status: {type: 'String', value: 'open'},
        userId: {type: 'ID', value: 'user1'}
      }),
      expect.arrayContaining(['supportTicketId', 'status', 'priority']),
      expect.objectContaining({onSuccess: expect.any(Function)})
    );
    expect(appQueryMock).toHaveBeenNthCalledWith(
      3,
      flux,
      'usersByPurchasedProduct',
      'crm',
      {
        productId: {
          type: 'ID!',
          value: 'gid://shopify/Product/1'
        }
      },
      expect.arrayContaining(['userId', 'email', 'shopifyCustomerId']),
      expect.objectContaining({onSuccess: expect.any(Function)})
    );
  });

  it('dispatches and returns Flux actions for CRM success and error results', async () => {
    const actions = createCrmActions(flux as any);
    const crm = {
      addSupportTicketMessage: {supportTicketMessageId: 'message1'},
      addUserToMailingList: {mailingListId: 'list1'},
      createMailingList: {mailingListId: 'list1'},
      createSupportTicket: {supportTicketId: 'ticket1'},
      customerNotificationsByUser: [{customerNotificationId: 'notification1'}],
      customerOrdersByUser: [{customerOrderId: 'order1'}],
      eligibleMailingUsers: [{userId: 'user1'}],
      ingestShopifyCustomerOrder: {customerOrderId: 'order1'},
      mailingLists: [{mailingListId: 'list1'}],
      mailingListUsers: [{userId: 'user1'}],
      removeUserFromMailingList: true,
      supportTicketEvents: [{supportTicketEventId: 'event1'}],
      supportTicketMessages: [{supportTicketMessageId: 'message1'}],
      supportTickets: [{supportTicketId: 'ticket1'}],
      updateSupportTicketStatus: {supportTicketId: 'ticket1', status: 'resolved'},
      usersByPurchasedProduct: [{userId: 'user1'}]
    };
    const response = {crm};
    const successMock = async (_flux: unknown, _operation: string, _dataType: string, _queryVariables: unknown, _props: unknown, options: {onSuccess?: (data: unknown) => Promise<unknown>} = {}) =>
      options.onSuccess ? await options.onSuccess(response) : response;
    appMutationMock.mockImplementation(successMock);
    appQueryMock.mockImplementation(successMock);

    const cases = [
      {
        call: () => actions.mailingLists(),
        expected: {list: crm.mailingLists, type: CRM_CONSTANTS.MAILING_LISTS_SUCCESS},
        fail: appQueryMock,
        errorType: CRM_CONSTANTS.MAILING_LISTS_ERROR
      },
      {
        call: () => actions.createMailingList({name: 'VIP'}),
        expected: {mailingList: crm.createMailingList, type: CRM_CONSTANTS.CREATE_MAILING_LIST_SUCCESS},
        fail: appMutationMock,
        errorType: CRM_CONSTANTS.CREATE_MAILING_LIST_ERROR
      },
      {
        call: () => actions.addUserToMailingList('users/user1', 'mailingLists/list1'),
        expected: {mailingList: crm.addUserToMailingList, type: CRM_CONSTANTS.ADD_USER_TO_MAILING_LIST_SUCCESS},
        fail: appMutationMock,
        errorType: CRM_CONSTANTS.ADD_USER_TO_MAILING_LIST_ERROR
      },
      {
        call: () => actions.removeUserFromMailingList('users/user1', 'mailingLists/list1'),
        expected: {removed: true, type: CRM_CONSTANTS.REMOVE_USER_FROM_MAILING_LIST_SUCCESS},
        fail: appMutationMock,
        errorType: CRM_CONSTANTS.REMOVE_USER_FROM_MAILING_LIST_ERROR
      },
      {
        call: () => actions.mailingListUsers('mailingLists/list1'),
        expected: {list: crm.mailingListUsers, type: CRM_CONSTANTS.MAILING_LIST_USERS_SUCCESS},
        fail: appQueryMock,
        errorType: CRM_CONSTANTS.MAILING_LIST_USERS_ERROR
      },
      {
        call: () => actions.eligibleMailingUsers({productId: 'product1'}),
        expected: {list: crm.eligibleMailingUsers, type: CRM_CONSTANTS.ELIGIBLE_MAILING_USERS_SUCCESS},
        fail: appQueryMock,
        errorType: CRM_CONSTANTS.ELIGIBLE_MAILING_USERS_ERROR
      },
      {
        call: () => actions.usersByPurchasedProduct('product1'),
        expected: {list: crm.usersByPurchasedProduct, type: CRM_CONSTANTS.USERS_BY_PURCHASED_PRODUCT_SUCCESS},
        fail: appQueryMock,
        errorType: CRM_CONSTANTS.USERS_BY_PURCHASED_PRODUCT_ERROR
      },
      {
        call: () => actions.ingestShopifyCustomerOrder({productIds: ['product1'], shopifyOrderId: 'order1'} as any),
        expected: {customerOrder: crm.ingestShopifyCustomerOrder, type: CRM_CONSTANTS.INGEST_SHOPIFY_CUSTOMER_ORDER_SUCCESS},
        fail: appMutationMock,
        errorType: CRM_CONSTANTS.INGEST_SHOPIFY_CUSTOMER_ORDER_ERROR
      },
      {
        call: () => actions.customerOrdersByUser('users/user1'),
        expected: {list: crm.customerOrdersByUser, type: CRM_CONSTANTS.CUSTOMER_ORDERS_BY_USER_SUCCESS},
        fail: appQueryMock,
        errorType: CRM_CONSTANTS.CUSTOMER_ORDERS_BY_USER_ERROR
      },
      {
        call: () => actions.createSupportTicket({subject: 'Help'}),
        expected: {supportTicket: crm.createSupportTicket, type: CRM_CONSTANTS.CREATE_SUPPORT_TICKET_SUCCESS},
        fail: appMutationMock,
        errorType: CRM_CONSTANTS.CREATE_SUPPORT_TICKET_ERROR
      },
      {
        call: () => actions.supportTickets({status: 'open'}),
        expected: {list: crm.supportTickets, type: CRM_CONSTANTS.SUPPORT_TICKETS_SUCCESS},
        fail: appQueryMock,
        errorType: CRM_CONSTANTS.SUPPORT_TICKETS_ERROR
      },
      {
        call: () => actions.updateSupportTicketStatus('supportTickets/ticket1', 'resolved', 'Fixed'),
        expected: {supportTicket: crm.updateSupportTicketStatus, type: CRM_CONSTANTS.UPDATE_SUPPORT_TICKET_STATUS_SUCCESS},
        fail: appMutationMock,
        errorType: CRM_CONSTANTS.UPDATE_SUPPORT_TICKET_STATUS_ERROR
      },
      {
        call: () => actions.addSupportTicketMessage({body: 'Reply'}),
        expected: {supportTicketMessage: crm.addSupportTicketMessage, type: CRM_CONSTANTS.ADD_SUPPORT_TICKET_MESSAGE_SUCCESS},
        fail: appMutationMock,
        errorType: CRM_CONSTANTS.ADD_SUPPORT_TICKET_MESSAGE_ERROR
      },
      {
        call: () => actions.supportTicketMessages('supportTickets/ticket1'),
        expected: {list: crm.supportTicketMessages, type: CRM_CONSTANTS.SUPPORT_TICKET_MESSAGES_SUCCESS},
        fail: appQueryMock,
        errorType: CRM_CONSTANTS.SUPPORT_TICKET_MESSAGES_ERROR
      },
      {
        call: () => actions.supportTicketEvents('supportTickets/ticket1'),
        expected: {list: crm.supportTicketEvents, type: CRM_CONSTANTS.SUPPORT_TICKET_EVENTS_SUCCESS},
        fail: appQueryMock,
        errorType: CRM_CONSTANTS.SUPPORT_TICKET_EVENTS_ERROR
      },
      {
        call: () => actions.customerNotificationsByUser('users/user1'),
        expected: {list: crm.customerNotificationsByUser, type: CRM_CONSTANTS.CUSTOMER_NOTIFICATIONS_BY_USER_SUCCESS},
        fail: appQueryMock,
        errorType: CRM_CONSTANTS.CUSTOMER_NOTIFICATIONS_BY_USER_ERROR
      }
    ];

    for(const testCase of cases) {
      await expect(testCase.call()).resolves.toEqual(testCase.expected);
      expect(flux.dispatch).toHaveBeenLastCalledWith(testCase.expected);

      const error = new Error(String(testCase.errorType));
      testCase.fail.mockRejectedValueOnce(error);
      await expect(testCase.call()).rejects.toThrow(error.message);
      expect(flux.dispatch).toHaveBeenLastCalledWith({error, type: testCase.errorType});
    }
  });
});
