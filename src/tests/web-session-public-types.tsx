import {createWebSessionActions as actionsFactory} from '@nlabs/metropolisjs/actions';
import {Metropolis, createWebSessionActions, useWebSessionActions} from '@nlabs/metropolisjs';
import {observeWebSession} from '@nlabs/metropolisjs/session';

import type {FluxFramework} from '@nlabs/arkhamjs';
import type {WebSessionIdentity, WebSessionOptions} from '@nlabs/metropolisjs';
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
void [provider, restored, observeWebSession];
