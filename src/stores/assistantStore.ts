import type {AssistantChatResult, AssistantFaqResult, AssistantSupportResult} from '../actions/assistantActions/assistantActions.js';

export const ASSISTANT_CONSTANTS = {
  CHAT_ERROR: 'ASSISTANT_CHAT_ERROR',
  CHAT_SUCCESS: 'ASSISTANT_CHAT_SUCCESS',
  FAQS_ERROR: 'ASSISTANT_FAQS_ERROR',
  FAQS_SUCCESS: 'ASSISTANT_FAQS_SUCCESS',
  SUPPORT_ERROR: 'ASSISTANT_SUPPORT_ERROR',
  SUPPORT_SUCCESS: 'ASSISTANT_SUPPORT_SUCCESS'
} as const;
export interface AssistantState {
  readonly instances: Record<string, {
    chat?: AssistantChatResult;
    error?: Error;
    faqs?: AssistantFaqResult;
    support?: AssistantSupportResult;
  }>;
}
export const defaultValues: AssistantState = {instances: {}};
export const assistantStore = (
  type: string,
  data: {error?: Error; instanceId?: string; result?: AssistantChatResult | AssistantFaqResult | AssistantSupportResult},
  state: AssistantState = defaultValues
): AssistantState => {
  const instanceId = data.instanceId || 'default';
  const previous = state.instances[instanceId] || {};
  let update: AssistantState['instances'][string];
  switch(type) {
    case ASSISTANT_CONSTANTS.CHAT_SUCCESS:
      update = {...previous, chat: data.result as AssistantChatResult, error: undefined};
      break;
    case ASSISTANT_CONSTANTS.FAQS_SUCCESS:
      update = {...previous, error: undefined, faqs: data.result as AssistantFaqResult};
      break;
    case ASSISTANT_CONSTANTS.SUPPORT_SUCCESS:
      update = {...previous, error: undefined, support: data.result as AssistantSupportResult};
      break;
    case ASSISTANT_CONSTANTS.CHAT_ERROR:
    case ASSISTANT_CONSTANTS.FAQS_ERROR:
    case ASSISTANT_CONSTANTS.SUPPORT_ERROR:
      update = {...previous, error: data.error};
      break;
    default:
      return state;
  }
  return {...state, instances: {...state.instances, [instanceId]: update}};
};
export const assistant = {action: assistantStore, initialState: defaultValues, name: 'assistant'};
