import {createDurableChatDocuments} from './documents.js';

import type {DurableChatFields, DurableChatOperation} from './documents.js';

export {createDurableChatDocuments} from './documents.js';
export type {DurableChatFields, DurableChatOperation} from './documents.js';

export type DurableChatProtocol = {
  readonly [K in DurableChatOperation]: {readonly input: unknown; readonly result: unknown};
};
export type DurableChatErrorCode = 'conflict' | 'forbidden' | 'invalid_request' | 'rate_limited' | 'unavailable';
export class DurableChatError extends Error {
  constructor(readonly code: DurableChatErrorCode) {
    super(code);
    this.name = 'DurableChatError';
  }
}
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const documents = createDurableChatDocuments();
export const createDurableChatVariables = (
  operation: DurableChatOperation, input: unknown
): Record<string, unknown> => {
  if(!Object.hasOwn(documents, operation)) {
    throw new DurableChatError('invalid_request');
  }
  if(operation === 'invitations' || operation === 'socketTicket' || input === undefined) {
    return {};
  }
  if(!object(input)) {
    throw new DurableChatError('invalid_request');
  }
  if(operation === 'sendMessage') {
    const {attachmentIds, clientMessageId, content, conversationId, replyToMessageId} = input;
    return {input: {attachmentIds, clientMessageId, content, conversationId, replyToMessageId}};
  }
  return ['participants', 'receipts', 'typing', 'chatContacts'].includes(operation) ? {...input} : {input};
};
export interface DurableChatOptions<Protocol extends DurableChatProtocol, Context> {
  readonly endpoint: string;
  readonly fields?: Partial<DurableChatFields>;
  readonly project: <K extends DurableChatOperation>(operation: K, value: unknown) => Protocol[K]['result'];
  readonly request: (endpoint: string,
    body: {readonly query: string; readonly variables: Record<string, unknown>},
    context: Context) => Promise<unknown>;
}
/** Opt-in top-level protocol. Transport owns authentication; only projected results leave this boundary. */
export const createDurableChatActions = <Protocol extends DurableChatProtocol = DurableChatProtocol, Context = void>(
  options: DurableChatOptions<Protocol, Context>
) => {
  const queries = createDurableChatDocuments(options.fields);
  return {
    request: async <K extends DurableChatOperation>(operation: K, input: Protocol[K]['input'], context: Context): Promise<Protocol[K]['result']> => {
      if(!Object.hasOwn(queries, operation)) {
        throw new DurableChatError('invalid_request');
      }
      const variables = createDurableChatVariables(operation, input);
      let envelope: unknown;
      try {
        envelope = await options.request(options.endpoint, {query: queries[operation], variables}, context);
      } catch{
        throw new DurableChatError('unavailable');
      }
      if(!object(envelope)) {
        throw new DurableChatError('unavailable');
      }
      if(envelope.errors !== undefined && envelope.errors !== null) {
        if(!Array.isArray(envelope.errors) || envelope.errors.length > 100) {
          throw new DurableChatError('unavailable');
        }
        if(envelope.errors.length) {
          const first = envelope.errors[0];
          const code = object(first) && object(first.extensions) ? first.extensions.code : undefined;
          const known = ['conflict', 'forbidden', 'invalid_request', 'rate_limited'].find((item) => item === code);
          throw new DurableChatError((known || 'unavailable') as DurableChatErrorCode);
        }
      }
      if(!object(envelope.data) || !Object.hasOwn(envelope.data, operation)
        || envelope.data[operation] === undefined) {
        throw new DurableChatError('unavailable');
      }
      return options.project(operation, envelope.data[operation]);
    }
  };
};
