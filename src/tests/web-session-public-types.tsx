import {Metropolis, createDurableChatActions, createWebSessionActions, useWebSessionActions} from '@nlabs/metropolisjs';
import {createDurableChatActions as chatActionsFactory, createWebSessionActions as actionsFactory} from '@nlabs/metropolisjs/actions';
import {observeWebSession} from '@nlabs/metropolisjs/session';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {DurableChatProtocol, WebSessionIdentity, WebSessionOptions} from '@nlabs/metropolisjs';
import type {ComponentProps, ReactElement} from 'react';

declare const flux: FluxFramework;
const options: WebSessionOptions = {
  endpoints: {activity: '/auth/activity', restore: '/auth/session', signIn: '/auth/signin', signOut: '/auth/signout'},
  onBeforeSessionClear: (reason, previous, scope) => {
    const user: string = previous.userId;
    const app: string = scope.appId;
    const end: 'expired' | 'rejected' | 'replaced' | 'signout' = reason;
    void [user, app, end];
    // @ts-expect-error HttpOnly session projections never contain bearer credentials.
    void previous.token;
  },
  scope: {appId: 'vault', environment: 'test', ownerUserId: 'owner'}
};
const controller = createWebSessionActions(flux, options);
const sameContract: typeof controller = actionsFactory(flux, options);
const Input = (): ReactElement => {
  const actions = useWebSessionActions();
  return <input onChange={(event) => {
    const input: HTMLInputElement = event.currentTarget;
    void actions.recordActivity();
    void input.value;
  }} />;
};
const props: ComponentProps<typeof Metropolis> = {children: <Input />, webSession: options};
const provider: ReactElement = <Metropolis {...props} />;
const restored: Promise<WebSessionIdentity | undefined> = sameContract.restore();
void [controller, provider, restored, observeWebSession];

type SharedChat = Omit<DurableChatProtocol, 'history'> & {
  history: {input: {conversationId: string}; result: {text: string}};
};
const chat = createDurableChatActions<SharedChat, FluxFramework>({
  endpoint: '/chat',
  fields: {message: 'body'},
  project: (_operation, value) => {
    if(!value || typeof value !== 'object' || !('body' in value) || typeof value.body !== 'string') {
      throw new Error('invalid_result');
    }
    return {text: value.body};
  },
  request: async (_endpoint, body, context) => {
    const {query}: {readonly query: string} = body;
    const sameFlux: FluxFramework = context;
    void [query, sameFlux];
    return {data: {history: {body: 'shared'}}};
  }
});
const history: Promise<{text: string}> = chat.request('history', {conversationId: 'room'}, flux);
const sameChatFactory: typeof createDurableChatActions = chatActionsFactory;
// @ts-expect-error The caller's operation input remains specific in emitted declarations.
void chat.request('history', {wrongInput: true}, flux);
// @ts-expect-error The caller's per-call context is preserved in emitted declarations.
void chat.request('history', {conversationId: 'room'}, 'wrong-context');
void [history, sameChatFactory];
