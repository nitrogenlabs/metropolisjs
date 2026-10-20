import type {WebSessionIdentity, WebSessionScope} from '../session/webSessionPolicy.js';

export const WEB_SESSION_CONSTANTS = {
  AUTHENTICATED: 'WEB_SESSION_AUTHENTICATED',
  BLOCKED: 'WEB_SESSION_BLOCKED',
  SIGNED_OUT: 'WEB_SESSION_SIGNED_OUT'
} as const;

export interface WebSessionState {
  readonly generation: number;
  readonly identity?: WebSessionIdentity;
  readonly scope?: WebSessionScope;
  readonly status: 'anonymous' | 'authenticated' | 'blocked';
}

const initialState: WebSessionState = {generation: 0, status: 'anonymous'};
export const webSession = {
  action: (_type: string, _data: unknown, state: WebSessionState): WebSessionState => state,
  initialState,
  name: 'webSession'
};

/** Independent from account cache clearing; contains no identity or private payload. */
export const webSessionSuppression = {
  action: (_type: string, _data: unknown, state: {suppressed: boolean}): {suppressed: boolean} => state,
  initialState: {suppressed: false},
  name: 'webSessionSuppression'
};
