import {ASSISTANT_CONSTANTS} from '../../stores/assistantStore.js';
import {publicMutation, publicQuery} from '../../utils/api.js';
import type {FluxFramework} from '@nlabs/arkhamjs';

export interface AssistantContext {
  readonly context?: string;
  readonly knowledge?: unknown;
  readonly language?: string;
  readonly name?: string;
}
export interface AssistantChatInput extends AssistantContext {
  readonly history?: readonly {role: string; text: string}[];
  readonly question: string;
}
export interface AssistantChatResult {
  readonly answer: string;
  readonly sources?: {title: string; url: string}[];
  readonly supportSuggested?: boolean;
}
export interface AssistantFaqResult {
  readonly items: {answer: string; id: string; question: string; sources: {title: string; url: string}[]}[];
}
export interface AssistantSupportInput extends AssistantContext {
  readonly company?: string;
  readonly confirmed: boolean;
  readonly email?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly message: string;
  readonly phone?: string;
  readonly requestId: string;
}
export interface AssistantSupportResult {
  readonly queued?: boolean;
  readonly ticketNumber?: string;
}
export interface AssistantActionsOptions {
  /** Scope state and events when several assistants share a Flux instance. */
  readonly instanceId?: string;
}
export interface AssistantActions {
  chat: (input: AssistantChatInput) => Promise<AssistantChatResult>;
  faqs: (input: AssistantContext) => Promise<AssistantFaqResult>;
  submitSupport: (input: AssistantSupportInput) => Promise<AssistantSupportResult>;
}

export const createAssistantActions = (flux: FluxFramework, options: AssistantActionsOptions = {}): AssistantActions => {
  const request = async <T>(operation: 'chat' | 'faqs' | 'submitSupport', input: AssistantContext): Promise<T> => {
    const instanceId = options.instanceId || input.context || 'default';
    const events = operation === 'chat'
      ? [ASSISTANT_CONSTANTS.CHAT_SUCCESS, ASSISTANT_CONSTANTS.CHAT_ERROR]
      : operation === 'faqs'
        ? [ASSISTANT_CONSTANTS.FAQS_SUCCESS, ASSISTANT_CONSTANTS.FAQS_ERROR]
        : [ASSISTANT_CONSTANTS.SUPPORT_SUCCESS, ASSISTANT_CONSTANTS.SUPPORT_ERROR];
    try {
      const apiRequest = operation === 'faqs' ? publicQuery : publicMutation;
      const data = await apiRequest<{assistant?: Partial<Record<typeof operation, T>>}>(
        flux, operation, 'assistant', {input: {type: 'JSONObject!', value: input}}, [], {queueOffline: false}
      );
      const result = data.assistant?.[operation];
      if(!result) throw new Error('The assistant returned an invalid response. Please try again.');
      await flux.dispatch({instanceId, result, type: events[0]});
      return result;
    } catch(cause) {
      const first = (cause as {errors?: (string | {message?: string})[]} | null)?.errors?.[0];
      const message = typeof first === 'string' ? first : first?.message;
      const error = new Error(message || (cause instanceof Error ? cause.message : 'Please try again or contact support.'));
      await flux.dispatch({error, instanceId, type: events[1]});
      throw error;
    }
  };
  return {
    chat: (input) => request<AssistantChatResult>('chat', input),
    faqs: (input) => request<AssistantFaqResult>('faqs', input),
    submitSupport: (input) => request<AssistantSupportResult>('submitSupport', input)
  };
};
