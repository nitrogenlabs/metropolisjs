import {describe, expect, expectTypeOf, it, vi} from '@nlabs/lex/test-vitest';
import {Kind, parse} from 'graphql';

import * as actions from '../index.js';

import type {DurableChatOperation, DurableChatProtocol} from '../index.js';

const {createDurableChatActions, createDurableChatDocuments, createDurableChatVariables, DurableChatError} = actions;
const project = (_operation: DurableChatOperation, value: unknown) => ({validated: value});
const setup = (response: unknown) => {
  const request = vi.fn(async () => response);
  return {client: createDurableChatActions({endpoint: '/collaboration/chat', project, request}), request};
};

describe('shared durable chat public API', () => {
  it('exports the protocol through the regular actions entry point', () => {
    expect(createDurableChatActions).toBeTypeOf('function');
    expect(createDurableChatDocuments).toBeTypeOf('function');
    expect(createDurableChatVariables).toBeTypeOf('function');
    expect(DurableChatError).toBeTypeOf('function');
  });

  it('builds executable GraphQL documents for the shared operation contract', () => {
    const documents = createDurableChatDocuments();
    const mutations = ['acceptInvite', 'changeMemberRole', 'createDirect', 'createGroup', 'declineInvite',
      'deleteMessage', 'editMessage', 'inviteMember', 'leaveConversation', 'removeMember', 'sendMessage',
      'setInboxState', 'setReaction', 'setTyping', 'socketTicket', 'transferOwnership', 'updateReceipt'];
    const queries = ['chatContacts', 'history', 'inbox', 'invitations', 'participants', 'reactions',
      'receipts', 'replayEvents', 'typing'];

    expect(Object.keys(documents).sort()).toEqual([...mutations, ...queries].sort());

    for(const [name, document] of Object.entries(documents)) {
      const definition = parse(document).definitions[0];

      expect(definition.kind).toBe(Kind.OPERATION_DEFINITION);

      if(definition.kind !== Kind.OPERATION_DEFINITION) {
        throw new Error('Expected an operation');
      }

      expect(definition.operation).toBe(mutations.includes(name) ? 'mutation' : 'query');
      expect(definition.selectionSet.selections).toHaveLength(1);

      expect(definition.selectionSet.selections[0]).toMatchObject({kind: Kind.FIELD, name: {value: name}});
    }

    expect(documents.history).toContain('attachments{imageId}');
    expect(documents.history).not.toMatch(/authorStatus|unavailable|eligibility/);
  });

  it('allows independent products to supply selections without changing the protocol', () => {
    const collaboration = createDurableChatDocuments({attachment: 'fileId mimeType', message: 'messageId body'});
    const support = createDurableChatDocuments({conversation: 'conversationId name', invite: 'inviteId',
      membership: 'personaId role', reaction: 'emoji', receipt: 'personaId readSequence'});

    expect(collaboration.history).toContain('messages{messageId body quote{messageId body}}');
    expect(createDurableChatDocuments({attachment: 'fileId mimeType'}).history).toContain('attachments{fileId mimeType}');
    expect(support.inbox).toContain('conversationId name archived muted unreadCount');
    expect(support.participants).toContain('{personaId role}');
    expect(support.inviteMember).toContain('{inviteId}');
    expect(support.reactions).toContain('{emoji}');
    expect(support.receipts).toContain('{personaId readSequence}');
  });

  it.each(['participants', 'receipts', 'typing', 'chatContacts'] as const)('uses top-level variables for %s', (operation) => {
    expect(createDurableChatVariables(operation, {conversationId: 'room', limit: 10})).toEqual({conversationId: 'room', limit: 10});
  });

  it('wraps operation inputs and omits variables for argument-free requests', () => {
    expect(createDurableChatVariables('history', {conversationId: 'room', limit: 20})).toEqual({input: {conversationId: 'room', limit: 20}});
    expect(createDurableChatVariables('invitations', {private: true})).toEqual({});
    expect(createDurableChatVariables('socketTicket', {private: true})).toEqual({});
    expect(createDurableChatVariables('inbox', undefined)).toEqual({});
  });

  it('keeps send retries stable and strips caller-supplied identity', () => {
    const input = {attachmentIds: ['file'], clientMessageId: 'attempt', content: 'Hello team',
      conversationId: 'room', replyToMessageId: 'previous', senderPersonaId: 'forged', userId: 'forged'};
    const expected = {input: {attachmentIds: ['file'], clientMessageId: 'attempt', content: 'Hello team',
      conversationId: 'room', replyToMessageId: 'previous'}};

    expect(createDurableChatVariables('sendMessage', input)).toEqual(expected);
    expect(createDurableChatVariables('sendMessage', input)).toEqual(expected);
    expect(input.senderPersonaId).toBe('forged');
  });

  it.each([null, [], 'text', 1])('rejects invalid inputs before transport: %j', async (input) => {
    const {client, request} = setup({data: {history: []}});

    await expect(client.request('history', input, undefined)).rejects.toMatchObject({code: 'invalid_request'});
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['constructor', '__proto__', 'toString'])('rejects unknown operation %s before transport', async (operation) => {
    const {client, request} = setup({data: {history: []}});

    expect(() => createDurableChatVariables(operation as DurableChatOperation, {})).toThrow(DurableChatError);
    await expect(client.request(operation as DurableChatOperation, {}, undefined)).rejects.toMatchObject({code: 'invalid_request'});
    expect(request).not.toHaveBeenCalled();
  });

  it('uses the caller transport, context and validated projection for a neutral typed contract', async () => {
    type TeamChat = Omit<DurableChatProtocol, 'history'> & {
      history: {input: {conversationId: string}; result: {text: string}};
    };
    const request = vi.fn(async (_endpoint: string, _body: unknown, _context: {credential: string}) => ({
      data: {history: {body: 'Team update', internal: 'private'}}
    }));
    const client = createDurableChatActions<TeamChat, {credential: string}>({
      endpoint: '/collaboration/chat',
      project: (_operation, value) => {
        if(!value || typeof value !== 'object' || !('body' in value) || typeof value.body !== 'string') {
          throw new Error('invalid_result');
        }
        return {text: value.body};
      },
      request
    });
    const result = client.request('history', {conversationId: 'team'}, {credential: 'per-call-secret'});

    expectTypeOf(result).toEqualTypeOf<Promise<{text: string}>>();

    await expect(result).resolves.toEqual({text: 'Team update'});
    expect(request).toHaveBeenCalledExactlyOnceWith('/collaboration/chat', {
      query: expect.stringContaining('history(input:$input)'), variables: {input: {conversationId: 'team'}}
    }, {credential: 'per-call-secret'});
    expect(JSON.stringify(client)).not.toContain('per-call-secret');
  });

  it.each([null, [], {}, {data: []}, {data: {}}, {data: Object.create({history: 'inherited'})},
    {data: {history: undefined}}, {errors: {}}, {errors: Array(101).fill({})}, {errors: [null]},
    {errors: [{extensions: {code: 'private-code'}, message: 'private provider detail'}]}])('sanitizes malformed envelopes: %j', async (response) => {
    await expect(setup(response).client.request('history', {}, undefined)).rejects.toMatchObject({code: 'unavailable', message: 'unavailable'});
  });

  it.each(['conflict', 'forbidden', 'invalid_request', 'rate_limited'])('exposes only the approved error code %s', async (code) => {
    await expect(setup({errors: [{extensions: {code}, message: 'private'}]}).client.request('history', {}, undefined))
      .rejects.toMatchObject({code, message: code, name: 'DurableChatError'});
  });

  it('never automatically retries a transport failure', async () => {
    const {client, request} = setup({});
    request.mockRejectedValue(new Error('secret provider details'));

    await expect(client.request('sendMessage', {clientMessageId: 'attempt', content: 'Hello', conversationId: 'team'}, undefined))
      .rejects.toMatchObject({code: 'unavailable', message: 'unavailable'});
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, null, []])('passes null results through caller validation when errors are %j', async (errors) => {
    await expect(setup({data: {history: null}, errors}).client.request('history', {}, undefined))
      .resolves.toEqual({validated: null});
  });

  it('does not conceal application validation failures', async () => {
    const client = createDurableChatActions({
      endpoint: '/support/chat',
      project: () => {
        throw new Error('invalid_result');
      },
      request: async () => ({data: {history: {invalid: true}}})
    });

    await expect(client.request('history', {}, undefined)).rejects.toThrow('invalid_result');
  });
});
