import {describe, expect, expectTypeOf, it, vi} from 'vitest';

import {createDurableChatActions, createDurableChatDocuments, createDurableChatVariables, DurableChatError} from './durableChatActions.js';

import type {DurableChatOperation, DurableChatProtocol} from './durableChatActions.js';

const project = vi.fn((_operation: DurableChatOperation, value: unknown) => ({approved: value}));
const setup = (response: unknown = {data: {history: []}}) => {
  const request = vi.fn(async () => response);
  return {actions: createDurableChatActions({endpoint: 'https://example.test/chat', project, request}), request};
};

describe('opt-in durable chat protocol', () => {
  it('builds every operation independently of product moderation fields', async () => {
    const queries = createDurableChatDocuments();

    expect(Object.keys(queries)).toHaveLength(26);
    expect(queries.history).not.toMatch(/authorStatus|unavailable|eligibility/);

    for(const operation of Object.keys(queries) as DurableChatOperation[]) {
      const fixture = setup({data: {[operation]: {value: operation}}});

      // eslint-disable-next-line no-await-in-loop
      await expect(fixture.actions.request(operation, {conversationId: 'c'}, undefined)).resolves.toEqual({approved: {value: operation}});
      expect(fixture.request).toHaveBeenCalledWith('https://example.test/chat', {query: queries[operation], variables: createDurableChatVariables(operation, {conversationId: 'c'})}, undefined);
    }
  });

  it('allows field projection overrides without replacing transport or protocol operations', () => {
    const queries = createDurableChatDocuments({attachment: 'handle', conversation: 'conversationId', invite: 'inviteId', membership: 'personaId', message: 'messageId unavailable', reaction: 'emoji', receipt: 'personaId'});

    expect(queries.history).toContain('messages{messageId unavailable quote{messageId unavailable}}');
    expect(queries.inbox).toContain('conversationId archived');
    expect(queries.participants).toContain('{personaId}');
    expect(queries.inviteMember).toContain('{inviteId}');
    expect(queries.reactions).toContain('{emoji}');
    expect(queries.receipts).toContain('{personaId}');
    expect(createDurableChatDocuments({attachment: 'handle'}).history).toContain('attachments{handle}');
  });

  it('uses direct variables for argument queries and strips untrusted sender identity from sends', () => {
    expect(createDurableChatVariables('chatContacts', {after: 'c', limit: 3})).toEqual({after: 'c', limit: 3});
    expect(createDurableChatVariables('history', {conversationId: 'c'})).toEqual({input: {conversationId: 'c'}});
    expect(createDurableChatVariables('socketTicket', {secret: true})).toEqual({});
    expect(createDurableChatVariables('history', undefined)).toEqual({});
    expect(createDurableChatVariables('sendMessage', {clientMessageId: 'id', content: 'text', conversationId: 'c', senderPersonaId: 'forged', userId: 'forged'})).toEqual({input: {attachmentIds: undefined, clientMessageId: 'id', content: 'text', conversationId: 'c', replyToMessageId: undefined}});
    expect(() => createDurableChatVariables('history', null)).toThrow(DurableChatError);
    expect(() => createDurableChatVariables('history', [])).toThrow(DurableChatError);
    expect(() => createDurableChatVariables('toString' as DurableChatOperation, {})).toThrow(DurableChatError);
  });

  it('preserves typed input/results and forwards private request context without storing it', async () => {
    type Protocol = Omit<DurableChatProtocol, 'history'> & {history: {input: {conversationId: string}; result: {safe: boolean}}};
    const request = vi.fn(async (_url: string, _body: unknown, _context: {token: string}) => ({data: {history: 'raw'}}));
    const actions = createDurableChatActions<Protocol, {token: string}>({endpoint: '/chat', project: (_operation, _value) => ({safe: true}), request});
    const result = actions.request('history', {conversationId: 'c'}, {token: 'private'});

    expectTypeOf(result).toEqualTypeOf<Promise<{safe: boolean}>>();

    await expect(result).resolves.toEqual({safe: true});
    expect(JSON.stringify(actions)).not.toContain('private');
    expect(request.mock.calls[0]?.[2]).toEqual({token: 'private'});
  });

  it.each([null, [], {}, {data: []}, {data: {}}, {data: Object.create({history: 'inherited'})}, {data: {history: undefined}}, {errors: {}}, {errors: Array(101).fill({})}, {errors: [null]}, {errors: [{extensions: {code: 'secret'}, message: 'secret'}]}])('rejects malformed envelopes without raw errors %j', async (response) => {
    await expect(setup(response).actions.request('history', {}, undefined)).rejects.toMatchObject({code: 'unavailable', message: 'unavailable'});
  });

  it.each(['conflict', 'forbidden', 'invalid_request', 'rate_limited'])('preserves only approved error codes %s', async (code) => {
    await expect(setup({errors: [{extensions: {code}, message: 'secret'}]}).actions.request('history', {}, undefined)).rejects.toMatchObject({code, message: code});
  });

  it('rejects unknown operations before transport and sanitizes network failure', async () => {
    const fixture = setup();

    await expect(fixture.actions.request('__proto__' as DurableChatOperation, {}, undefined)).rejects.toMatchObject({code: 'invalid_request'});
    expect(fixture.request).not.toHaveBeenCalled();

    fixture.request.mockRejectedValue(new Error('private native error'));

    await expect(fixture.actions.request('history', {}, undefined)).rejects.toMatchObject({code: 'unavailable'});
  });

  it.each([{errors: null}, {errors: []}])('accepts absent or empty GraphQL errors and still applies projection', async ({errors}) => {
    await expect(setup({data: {history: null}, errors}).actions.request('history', {}, undefined)).resolves.toEqual({approved: null});
  });
});
