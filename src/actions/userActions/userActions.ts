/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {validateUserInput} from '../../adapters/userAdapter/userAdapter.js';
import {USER_CONSTANTS} from '../../stores/userStore.js';
import {appMutation, appQuery, publicMutation, refreshSession} from '../../utils/api.js';
import {createBaseActions} from '../../utils/baseActionFactory.js';
import {
  clearPersistedSession,
  hydrateSessionFromStorage,
  isLoggedIn as isLoggedInWithStorage,
  normalizeSession,
  storeSession
} from '../../utils/session.js';
import {getConfigFromFlux} from '../../utils/configUtils.js';
import {clearCachedRequest, getCachedRequest, setCachedRequest} from '../../utils/requestCache.js';
import {syncPersonaTagsToSession} from '../personaActions/personaActions.js';

import type {FluxAction, FluxFramework} from '@nlabs/arkhamjs';
import type {User} from '../../adapters/userAdapter/userAdapter.js';
import type {ApiResultsType, SessionType} from '../../utils/api.js';
import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';
import type {ActionRequestOptions} from '../../utils/requestCache.js';

const DATA_TYPE = 'users';
const DEFAULT_USER_QUERY_FIELDS = ['userId', 'username'];
const SENSITIVE_USER_FIELDS = new Set([
  'password',
  'salt',
  'token',
  'refreshToken',
  'verifiedEmailCode',
  'verifiedSmsCode'
]);
const INVALID_FIELD_REGEX = /Cannot query field "([^"]+)"/g;
const hasSessionIdentity = (user?: Partial<User> | null): boolean =>
  !!(user && ((user as any)._id || (user as any).userId || (user as any).username || (user as any).email));

const sanitizeUpdateUserInput = (userInput: Partial<User> = {}, currentSession: Record<string, unknown> = {}): Partial<User> => {
  const nextUser = Object.entries(userInput).reduce((user: Record<string, unknown>, [field, value]) => {
    if(value === undefined || value === null) {
      return user;
    }

    if(field === 'password') {
      const password = String(value || '').trim();

      if(password) {
        user.password = password;
      }

      return user;
    }

    if(field === 'userId') {
      user.userId = value;
      return user;
    }

    const currentValue = currentSession[field];

    if(String(value) !== String(currentValue ?? '')) {
      user[field] = value;
    }

    return user;
  }, {});

  return nextUser as Partial<User>;
};

const syncStoredSession = async (flux: FluxFramework, sessionPatch: Record<string, unknown> = {}): Promise<SessionType> => {
  const currentSession = (flux.getState('user.session', {}) || {}) as Record<string, unknown>;
  return storeSession(flux, {...currentSession, ...sessionPatch});
};

const getSessionPayload = (payload: unknown): Record<string, unknown> => {
  if(payload && typeof payload === 'object' && 'session' in (payload as Record<string, unknown>)) {
    return (((payload as Record<string, unknown>).session) || {}) as Record<string, unknown>;
  }

  return (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
};

const getFieldRoot = (field: string): string => {
  const trimmed = field.trim();
  const match = trimmed.match(/^[A-Za-z_][A-Za-z0-9_]*/);
  return match ? match[0] : '';
};

const sanitizeUserProps = (props: string[] = [], fallbackProps: string[] = DEFAULT_USER_QUERY_FIELDS): string[] => {
  const seen = new Set<string>();
  const sanitized = props.reduce((list: string[], field: string) => {
    const root = getFieldRoot(field);

    if(!root || SENSITIVE_USER_FIELDS.has(root) || seen.has(field)) {
      return list;
    }

    seen.add(field);
    list.push(field);
    return list;
  }, []);

  if(sanitized.length > 0) {
    return sanitized;
  }

  return fallbackProps.reduce((list: string[], field: string) => {
    const root = getFieldRoot(field);

    if(!root || SENSITIVE_USER_FIELDS.has(root) || seen.has(field)) {
      return list;
    }

    seen.add(field);
    list.push(field);
    return list;
  }, []);
};

const getInvalidFields = (error: unknown): Set<string> => {
  const errors = (error as any)?.errors || (error as any)?.source?.errors || [];
  const invalidFields = new Set<string>();

  errors.forEach((item: any) => {
    const message = typeof item === 'string' ? item : item?.message || '';
    let match: RegExpExecArray | null = INVALID_FIELD_REGEX.exec(message);

    while(match) {
      invalidFields.add(match[1]);
      match = INVALID_FIELD_REGEX.exec(message);
    }

    INVALID_FIELD_REGEX.lastIndex = 0;
  });

  return invalidFields;
};

const withInvalidFieldRetry = async <T>(
  requestWithProps: (props: string[]) => Promise<T>,
  props: string[],
  fallbackProps: string[] = DEFAULT_USER_QUERY_FIELDS
): Promise<T> => {
  const safeProps = sanitizeUserProps(props, fallbackProps);

  try {
    return await requestWithProps(safeProps);
  } catch(error) {
    const invalidFields = getInvalidFields(error);

    if(invalidFields.size === 0) {
      throw error;
    }

    const retryProps = safeProps.filter((field) => !invalidFields.has(getFieldRoot(field)));

    if(retryProps.length === 0 || retryProps.length === safeProps.length) {
      throw error;
    }

    return requestWithProps(retryProps);
  }
};

export type UserAdapterOptions = BaseAdapterOptions;

export interface UserActionsOptions {
  readonly userAdapter?: (input: unknown, options?: UserAdapterOptions) => any;
  readonly userAdapterOptions?: UserAdapterOptions;
}

export interface UserApiResultsType {
  readonly users: {
    readonly activeCount?: number;
    readonly addUser?: Partial<User>;
    readonly confirmCode?: boolean;
    readonly deactivate?: Partial<User>;
    readonly forgotPassword?: boolean;
    readonly itemById?: Partial<User>;
    readonly getUserBySession?: Partial<User>;
    readonly itemBySession?: Partial<User>;
    readonly itemByToken?: Partial<User>;
    readonly itemByUsername?: Partial<User>;
    readonly getUserList?: User[];
    readonly list?: User[];
    readonly listByConnection?: User[];
    readonly listByLatest?: User[];
    readonly listByReactions?: User[];
    readonly listByTags?: User[];
    readonly search?: User[];
    readonly refreshSession?: SessionType;
    readonly remove?: Partial<User>;
    readonly resetPassword?: boolean;
    readonly saveBillingCard?: Partial<User>;
    readonly sendVerificationEmail?: boolean;
    readonly session?: Partial<User>;
    readonly signIn?: Partial<User>;
    readonly signUp?: Partial<User>;
    readonly deleteBillingCard?: Partial<User>;
    readonly update?: Partial<User>;
    readonly updateUser?: Partial<User>;
    readonly updatePassword?: Partial<boolean>;
    readonly updatePlan?: Partial<User>;
  };
}

const defaultUserValidator = (input: unknown, options?: UserAdapterOptions) => {
  const validated = validateUserInput(input);

  if(options?.strict && !validated.username) {
    throw new Error('Username is required in strict mode');
  }

  return validated;
};

export interface userActions {
  addUser: (userInput: Partial<User>, userProps?: string[], requestOptions?: ActionRequestOptions) => Promise<User>;
  confirmCode: (code: number, {type, value}: {type: 'email' | 'phone'; value: string}, requestOptions?: ActionRequestOptions) => Promise<boolean>;
  confirmSignUp: (code: string, type: 'email' | 'phone', requestOptions?: ActionRequestOptions) => Promise<boolean>;
  currentAuthenticatedUser: (requestOptions?: ActionRequestOptions) => Promise<User>;
  currentUser: (requestOptions?: ActionRequestOptions) => Promise<User>;
  list: (userProps?: string[], requestOptions?: ActionRequestOptions) => Promise<User[]>;
  listByConnection: (userId: string, from?: number, to?: number, userProps?: string[], requestOptions?: ActionRequestOptions) => Promise<User[]>;
  itemById: (userId: string, userProps?: string[], requestOptions?: ActionRequestOptions) => Promise<User>;
  deleteBillingCard: (userProps?: string[], requestOptions?: ActionRequestOptions) => Promise<User>;
  listByLatest: (username?: string, from?: number, to?: number, userProps?: string[], requestOptions?: ActionRequestOptions) => Promise<User[]>;
  listByReactions: (
    username: string,
    reactionNames: string[],
    from?: number,
    to?: number,
    personaProps?: string[],
    requestOptions?: ActionRequestOptions
  ) => Promise<User[]>;
  listByTags: (
    username: string,
    tagNames: string[],
    from?: number,
    to?: number,
    personaProps?: string[],
    requestOptions?: ActionRequestOptions
  ) => Promise<User[]>;
  forgotPassword: (username: string, requestOptions?: ActionRequestOptions) => Promise<boolean>;
  isLoggedIn: () => boolean;
  refreshSession: (token?: string, expires?: number, requestOptions?: ActionRequestOptions) => Promise<SessionType>;
  remove: (userId: string, requestOptions?: ActionRequestOptions) => Promise<User>;
  resetPassword: (username: string, password: string, code: string, type: 'email' | 'phone', requestOptions?: ActionRequestOptions) => Promise<boolean>;
  search: (query: string, userProps?: string[], requestOptions?: ActionRequestOptions) => Promise<User[]>;
  sendVerificationEmail: (email: string, requestOptions?: ActionRequestOptions) => Promise<boolean>;
  session: (userProps?: string[], requestOptions?: ActionRequestOptions) => Promise<User>;
  saveBillingCard: (card: Record<string, unknown>, userProps?: string[], requestOptions?: ActionRequestOptions) => Promise<User>;
  signIn: (user: Partial<User>, expires?: number, requestOptions?: ActionRequestOptions) => Promise<SessionType>;
  signOut: (requestOptions?: ActionRequestOptions) => Promise<boolean>;
  signUp: (userInput: Partial<User>, userProps?: string[], requestOptions?: ActionRequestOptions) => Promise<User>;
  updatePassword: (password: string, newPassword: string, requestOptions?: ActionRequestOptions) => Promise<boolean>;
  updateUser: (userInput: Partial<User>, userProps?: string[], requestOptions?: ActionRequestOptions) => Promise<User>;
  updatePlan: (planId: string, userProps?: string[], requestOptions?: ActionRequestOptions) => Promise<User>;
  updateUserAdapter: (adapter: (input: unknown, options?: UserAdapterOptions) => any) => void;
  updateUserAdapterOptions: (options: UserAdapterOptions) => void;
}

export const createUserActions = (
  flux: FluxFramework,
  options?: UserActionsOptions
): userActions => {
  const userBase = createBaseActions(flux, defaultUserValidator, {
    adapter: options?.userAdapter,
    adapterOptions: options?.userAdapterOptions
  });
  const clearUserRequestCaches = async (userId = ''): Promise<void> => {
    await clearCachedRequest(flux, 'user.list');
    await clearCachedRequest(flux, 'user.listByLatest');
    await clearCachedRequest(flux, 'user.listByTags');
    await clearCachedRequest(flux, 'user.search');
    if(userId) {
      await clearCachedRequest(flux, `user.itemById:${userId}`);
    }
  };

  const addUser = async (
    userInput: Partial<User>,
    userProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<User> => {
    const {username, email, password} = userInput;
    const queryVariables = {
      user: {
        type: 'UserInput!',
        value: {
          email,
          password,
          username
        }
      }
    };

    const onSuccess = (data: UserApiResultsType): Promise<FluxAction> => {
      const user = data?.users?.addUser || {};
      return flux.dispatch({
        type: USER_CONSTANTS.ADD_ITEM_SUCCESS,
        user
      });
    };

    const returnProps = sanitizeUserProps(userProps, [
      'added',
      'address',
      'dob',
      'city',
      'country',
      'gender',
      'imageUrl',
      'latitude',
      'longitude',
      'mailingList',
      'modified',
      'state',
      'thumbUrl',
      'userAccess',
      'userId',
      'username'
    ]);

    try {
      return await publicMutation<UserApiResultsType>(
        flux,
        'addUser',
        DATA_TYPE,
        queryVariables,
        returnProps,
        {onSuccess}
      );
    } finally {
      await clearUserRequestCaches();
    }
  };

  const signUp = async (
    userInput: Partial<User>,
    userProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<User> => {
    const {username, email, password} = userInput;
    const queryVariables = {
      expires: {
        type: 'Int',
        value: 15
      },
      user: {
        type: 'UserInput!',
        value: {
          email,
          password,
          username
        }
      }
    };

    const onSuccess = (data: UserApiResultsType): Promise<FluxAction> => {
      const user = data?.users?.signUp || {};
      return flux.dispatch({
        type: USER_CONSTANTS.SIGN_UP_SUCCESS,
        user
      });
    };

    const returnProps = sanitizeUserProps([
      'added',
      'modified',
      'userId',
      'username',
      ...userProps
    ]);

    try {
      return await publicMutation<UserApiResultsType>(
        flux,
        'signUp',
        DATA_TYPE,
        queryVariables,
        returnProps,
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: USER_CONSTANTS.SIGN_UP_ERROR});
      throw error;
    } finally {
      await clearUserRequestCaches();
    }
  };

  const updateUser = async (
    userInput: Partial<User>,
    userProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<User> => {
    const updateInput = sanitizeUpdateUserInput(userInput, (flux.getState('user.session', {}) || {}) as Record<string, unknown>);
    const {
      birthdate,
      dob,
      email,
      firstName,
      gender,
      lastName,
      mailingList,
      password,
      phone,
      userId,
      username
    } = updateInput;
    const queryVariables = {
      user: {
        type: 'UserInput!',
        value: {
          birthdate: birthdate ?? dob,
          email,
          firstName,
          gender,
          lastName,
          mailingList,
          password,
          phone,
          userId,
          username
        }
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const users = (data as unknown as UserApiResultsType)?.users;
      const legacyUser = users?.update || {};
      const updatedUser = users?.updateUser || {};
      const user = hasSessionIdentity(updatedUser) ? updatedUser : legacyUser;

      if((user as any)?.userId && (user as any).userId === flux.getState('user.session.userId')) {
        syncStoredSession(flux, user as Record<string, unknown>);
      }

      return flux.dispatch({
        type: USER_CONSTANTS.UPDATE_ITEM_SUCCESS,
        user
      });
    };

    const returnProps = sanitizeUserProps([
      'added',
      'birthdate',
      'city',
      'country',
      'email',
      'firstName',
      'gender',
      'imageCount',
      'imageUrl',
      'lastName',
      'latitude',
      'longitude',
      'mailingList',
      'modified',
      'phone',
      'state',
      'thumbUrl',
      'userAccess',
      'userId',
      'username',
      ...userProps
    ]);

    try {
      return await appMutation(
        flux,
        'updateUser',
        DATA_TYPE,
        queryVariables,
        returnProps,
        {onSuccess}
      );
    } finally {
      await clearUserRequestCaches(String(userId || ''));
    }
  };

  const confirmCode = async (
    code: number,
    {type, value}: {type: 'email' | 'phone'; value: string},
    requestOptions: ActionRequestOptions = {}
  ): Promise<boolean> => {
    const queryVariables = {
      code: {
        type: 'Int!',
        value: code
      },
      type: {
        type: 'String!',
        value: type
      },
      value: {
        type: 'String!',
        value
      }
    };

    const data = await publicMutation<UserApiResultsType>(flux, 'confirmCode', DATA_TYPE, queryVariables, []);
    const confirmed = !!data?.users?.confirmCode;

    await flux.dispatch({confirmed, type: USER_CONSTANTS.CONFIRM_SIGN_UP_SUCCESS});

    return confirmed;
  };

  const remove = async (userId: string, requestOptions: ActionRequestOptions = {}): Promise<User> => {
    const queryVariables = {
      userId: {
        type: 'ID!',
        value: userId
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const user = (data as unknown as UserApiResultsType)?.users?.remove || {};
      return flux.dispatch({type: USER_CONSTANTS.REMOVE_ITEM_SUCCESS, user});
    };

    try {
      return await appMutation(flux, 'remove', DATA_TYPE, queryVariables, [], {onSuccess});
    } finally {
      await clearUserRequestCaches(userId);
    }
  };

  const session = async (userProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<User> => withInvalidFieldRetry(
    async (sessionProps) => {
      const data = await appQuery(
        flux,
        'getUserBySession',
        DATA_TYPE,
        {},
        sessionProps
      ) as unknown as {
        users?: {getUserBySession?: Partial<User>};
      };
      const sessionData = data?.users?.getUserBySession || {};

      if(!hasSessionIdentity(sessionData)) {
        await clearPersistedSession(flux);
        await flux.dispatch({type: USER_CONSTANTS.GET_SESSION_ERROR});
        throw new Error('invalid_session');
      }

      const nextSession = await syncStoredSession(flux, sessionData as Record<string, unknown>);
      await flux.dispatch({session: nextSession, type: USER_CONSTANTS.GET_SESSION_SUCCESS});
      await syncPersonaTagsToSession(flux, String((nextSession as any)?.personaId || ''));
      return await syncStoredSession(flux, (flux.getState('user.session', nextSession) || nextSession) as Record<string, unknown>) as User;
    },
    userProps,
    DEFAULT_USER_QUERY_FIELDS
  );

  const itemById = async (userId: string, userProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<User> => {
    const cachedResult = getCachedRequest<User>(flux, `user.itemById:${userId}`, {userId, userProps}, requestOptions);

    if(cachedResult !== undefined) {
      return cachedResult;
    }

    const queryVariables = {
      userId: {
        type: 'ID!',
        value: userId
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const getUserById = ((data as unknown as UserApiResultsType & {
        users?: {getUserById?: Partial<User>};
      })?.users?.getUserById) || {};

      if(userId === flux.getState('user.session.userId')) {
        syncStoredSession(flux, getUserById as Record<string, unknown>);
      }

      return flux.dispatch({type: USER_CONSTANTS.GET_ITEM_SUCCESS, user: getUserById});
    };

    const result = await withInvalidFieldRetry(
      (safeUserProps) => appQuery(flux, 'getUserById', DATA_TYPE, queryVariables, safeUserProps, {onSuccess}),
      userProps,
      DEFAULT_USER_QUERY_FIELDS
    );

    return setCachedRequest<User>(flux, `user.itemById:${userId}`, {userId, userProps}, result as User, requestOptions);
  };

  const saveBillingCard = async (
    card: Record<string, unknown>,
    userProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<User> => {
    const queryVariables = {
      card: {
        type: 'CreditCardInput!',
        value: card
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const user = ((data as unknown as UserApiResultsType)?.users?.saveBillingCard) || {};

      if((user as any)?.userId && (user as any).userId === flux.getState('user.session.userId')) {
        syncStoredSession(flux, user as Record<string, unknown>);
      }

      return flux.dispatch({
        type: USER_CONSTANTS.UPDATE_ITEM_SUCCESS,
        user
      });
    };

    const returnProps = sanitizeUserProps([
      'modified',
      'stripeCardBrand',
      'stripeCardId',
      'stripeCardLast4',
      'userId',
      'username',
      ...userProps
    ]);
    const sessionUserId = String(flux.getState('user.session.userId') || '');

    try {
      return await appMutation(
        flux,
        'saveBillingCard',
        DATA_TYPE,
        queryVariables,
        returnProps,
        {onSuccess}
      );
    } finally {
      await clearUserRequestCaches(sessionUserId);
    }
  };

  const deleteBillingCard = async (
    userProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<User> => {
    const onSuccess = (data: ApiResultsType = {}) => {
      const user = ((data as unknown as UserApiResultsType)?.users?.deleteBillingCard) || {};

      if((user as any)?.userId && (user as any).userId === flux.getState('user.session.userId')) {
        syncStoredSession(flux, user as Record<string, unknown>);
      }

      return flux.dispatch({
        type: USER_CONSTANTS.UPDATE_ITEM_SUCCESS,
        user
      });
    };

    const returnProps = sanitizeUserProps([
      'modified',
      'stripeCardBrand',
      'stripeCardId',
      'stripeCardLast4',
      'userId',
      'username',
      ...userProps
    ]);
    const sessionUserId = String(flux.getState('user.session.userId') || '');

    try {
      return await appMutation(
        flux,
        'deleteBillingCard',
        DATA_TYPE,
        {},
        returnProps,
        {onSuccess}
      );
    } finally {
      await clearUserRequestCaches(sessionUserId);
    }
  };

  const updatePlan = async (
    planId: string,
    userProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<User> => {
    const nextPlanId = String(planId || '').trim();

    if(!nextPlanId) {
      throw new Error('A subscription planId is required to update a user plan');
    }

    const queryVariables = {
      planId: {
        type: 'ID!',
        value: nextPlanId
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const user = ((data as unknown as UserApiResultsType)?.users?.updatePlan) || {};

      if((user as any)?.userId && (user as any).userId === flux.getState('user.session.userId')) {
        syncStoredSession(flux, user as Record<string, unknown>);
      }

      return flux.dispatch({
        type: USER_CONSTANTS.UPDATE_ITEM_SUCCESS,
        user
      });
    };

    const returnProps = sanitizeUserProps([
      'modified',
      'planExpires',
      'planId',
      'planStatus',
      'planSubscriptionId',
      'stripeCardBrand',
      'stripeCardId',
      'stripeCardLast4',
      'userAccess',
      'userId',
      'username',
      ...userProps
    ]);
    const sessionUserId = String(flux.getState('user.session.userId') || '');

    try {
      return await appMutation(
        flux,
        'updatePlan',
        DATA_TYPE,
        queryVariables,
        returnProps,
        {onSuccess}
      );
    } finally {
      await clearUserRequestCaches(sessionUserId);
    }
  };

  const list = async (userProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<User[]> => {
    const cachedResult = getCachedRequest<User[]>(flux, 'user.list', {userProps}, requestOptions);

    if(cachedResult !== undefined) {
      return cachedResult;
    }

    const onSuccess = (data: ApiResultsType = {}) => {
      const list = (data as unknown as UserApiResultsType)?.users?.getUserList || [];
      return flux.dispatch({list, type: USER_CONSTANTS.GET_LIST_SUCCESS});
    };

    const result = await withInvalidFieldRetry(
      (safeUserProps) => appQuery(flux, 'getUserList', DATA_TYPE, {}, safeUserProps, {onSuccess}),
      userProps,
      DEFAULT_USER_QUERY_FIELDS
    );

    return setCachedRequest<User[]>(flux, 'user.list', {userProps}, result as User[], requestOptions);
  };

  const listByLatest = async (
    username: string = '',
    from: number = 0,
    to: number = 10,
    userProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<User[]> => {
    const cachedResult = getCachedRequest<User[]>(flux, 'user.listByLatest', {username, from, to, userProps}, requestOptions);

    if(cachedResult !== undefined) {
      return cachedResult;
    }

    const queryVariables = {
      from: {
        type: 'Int',
        value: from
      },
      to: {
        type: 'Int',
        value: to
      },
      username: {
        type: 'String',
        value: username
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const list = (data as unknown as UserApiResultsType)?.users?.listByLatest || [];
      return flux.dispatch({list, type: USER_CONSTANTS.GET_LIST_SUCCESS});
    };

    const result = await withInvalidFieldRetry(
      (safeUserProps) => appQuery(flux, 'listByLatest', DATA_TYPE, queryVariables, safeUserProps, {onSuccess}),
      userProps,
      DEFAULT_USER_QUERY_FIELDS
    );

    return setCachedRequest<User[]>(flux, 'user.listByLatest', {username, from, to, userProps}, result as User[], requestOptions);
  };

  const listByConnection = async (
    userId: string,
    from: number = 0,
    to: number = 10,
    userProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<User[]> =>
    []
  ;

  const listByReactions = async (
    username: string,
    reactionNames: string[],
    from: number = 0,
    to: number = 10,
    personaProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<User[]> =>
    []
  ;

  const listByTags = async (
    username: string,
    tagNames: string[],
    from: number = 0,
    to: number = 10,
    personaProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<User[]> => {
    const cachedResult = getCachedRequest<User[]>(flux, 'user.listByTags', {username, tagNames, from, to, personaProps}, requestOptions);

    if(cachedResult !== undefined) {
      return cachedResult;
    }

    const queryVariables = {
      from: {
        type: 'Int',
        value: from
      },
      tags: {
        type: '[String!]',
        value: tagNames
      },
      to: {
        type: 'Int',
        value: to
      },
      username: {
        type: 'String',
        value: username
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const list = (data as unknown as UserApiResultsType)?.users?.listByTags || [];
      return flux.dispatch({list, type: USER_CONSTANTS.GET_LIST_SUCCESS});
    };

    const result = await withInvalidFieldRetry(
      (safeUserProps) => appQuery(flux, 'listByTags', DATA_TYPE, queryVariables, safeUserProps, {onSuccess}),
      personaProps,
      DEFAULT_USER_QUERY_FIELDS
    );

    return setCachedRequest<User[]>(flux, 'user.listByTags', {username, tagNames, from, to, personaProps}, result as User[], requestOptions);
  };

  const search = async (query: string, userProps: string[] = [], requestOptions: ActionRequestOptions = {}): Promise<User[]> => {
    const cachedResult = getCachedRequest<User[]>(flux, 'user.search', {query, userProps}, requestOptions);

    if(cachedResult !== undefined) {
      return cachedResult;
    }

    const queryVariables = {
      query: {
        type: 'String!',
        value: query
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const list = (data as unknown as UserApiResultsType)?.users?.search || [];
      return flux.dispatch({list, type: USER_CONSTANTS.GET_LIST_SUCCESS});
    };

    const result = await withInvalidFieldRetry(
      (safeUserProps) => appQuery(flux, 'search', DATA_TYPE, queryVariables, safeUserProps, {onSuccess}),
      userProps,
      DEFAULT_USER_QUERY_FIELDS
    );

    return setCachedRequest<User[]>(flux, 'user.search', {query, userProps}, result as User[], requestOptions);
  };

  const isLoggedIn = (): boolean => isLoggedInWithStorage(flux);

  const currentAuthenticatedUser = async (requestOptions: ActionRequestOptions = {}): Promise<User> => {
    const session = await hydrateSessionFromStorage(flux);
    return (session || {}) as User;
  };

  const currentUser = async (requestOptions: ActionRequestOptions = {}): Promise<User> => currentAuthenticatedUser(requestOptions);

  const refreshSessionAction = async (token?: string, expires?: number, requestOptions: ActionRequestOptions = {}): Promise<SessionType> => {
    const result = await refreshSession(flux, token, expires);
    return (result?.refreshSession || {}) as SessionType;
  };

  const signIn = async (
    user: Partial<User>,
    expires?: number,
    requestOptions: ActionRequestOptions = {}
  ): Promise<SessionType> => {
    const {email, phone, username, password} = user;
    let userInput: Record<string, unknown> | undefined;
    let legacyVariables: Record<string, {type: string; value: unknown}> | undefined;

    if(username && password) {
      userInput = {
        password,
        username
      };
    } else if(email && password) {
      userInput = {
        email,
        password
      };
    } else if(phone && password) {
      userInput = {
        password,
        phone
      };
    } else {
      throw new Error('Username, email, or phone number and password are required to sign in');
    }

    const config = getConfigFromFlux(flux);
    const requestedExpires = Math.max(1, Number(expires || config.app?.session?.maxMinutes || 15));
    const queryVariablesWithUserInput = {
      expires: {
        type: 'Int',
        value: requestedExpires
      },
      user: {
        type: 'UserInput!',
        value: userInput
      }
    };

    const onSuccess = async (data: ApiResultsType = {}): Promise<FluxAction> => {
      const users = (data as any)?.users;
      const sessionData = normalizeSession(users?.signIn || {});
      const storedSession = await syncStoredSession(flux, sessionData);
      return {
        session: storedSession,
        type: USER_CONSTANTS.SIGN_IN_SUCCESS
      } as FluxAction;
    };

    const performSignIn = async (queryVariables: any): Promise<SessionType> => {
      const sessionResult = await publicMutation<SessionType & UserApiResultsType>(
        flux,
        'signIn',
        DATA_TYPE,
        queryVariables,
        ['expires', 'issued', 'token', 'userId', 'username'],
        {onSuccess}
      );
      const baseSession = await syncStoredSession(flux, getSessionPayload(sessionResult));

      try {
        const hydratedSession = await session(['userId', 'personaId', 'userAccess', 'username'], requestOptions);
        await syncPersonaTagsToSession(flux, String((hydratedSession as any)?.personaId || ''));
      } catch(error) {
        const fallbackSession = await syncStoredSession(flux, baseSession as Record<string, unknown>);
        await flux.dispatch({
          session: fallbackSession,
          type: USER_CONSTANTS.SIGN_IN_SUCCESS
        });
        return fallbackSession;
      }

      const finalSession = await syncStoredSession(
        flux,
        (flux.getState('user.session', baseSession) || baseSession) as Record<string, unknown>
      );
      await flux.dispatch({
        session: finalSession,
        type: USER_CONSTANTS.SIGN_IN_SUCCESS
      });
      return finalSession;
    };

    try {
      return await performSignIn(queryVariablesWithUserInput);
    } catch(error) {
      flux.dispatch({error, type: USER_CONSTANTS.SIGN_IN_ERROR});
      throw error;
    } finally {
      await clearUserRequestCaches(String((user as any)?.userId || ''));
    }
  };

  const signOut = async (requestOptions: ActionRequestOptions = {}): Promise<boolean> => {
    await clearPersistedSession(flux);
    await flux.dispatch({session: {}, type: USER_CONSTANTS.SIGN_OUT_SUCCESS});
    await clearUserRequestCaches();
    return true;
  };

  const confirmSignUp = async (code: string, type: 'email' | 'phone', requestOptions: ActionRequestOptions = {}): Promise<boolean> =>
    true;

  const forgotPassword = async (username: string, requestOptions: ActionRequestOptions = {}): Promise<boolean> => {
    const queryVariables = {
      user: {
        type: 'UserInput!',
        value: {
          email: username,
          phone: username,
          username
        }
      }
    };

    const onSuccess = (data?: UserApiResultsType) => {
      const success = !!data?.users?.forgotPassword;
      return flux.dispatch({
        type: success ? USER_CONSTANTS.FORGOT_PASSWORD_SUCCESS : USER_CONSTANTS.FORGOT_PASSWORD_ERROR
      });
    };

    return publicMutation<UserApiResultsType>(flux, 'forgotPassword', DATA_TYPE, queryVariables, [], {onSuccess}).then((data) => {
      const success = !!data?.users?.forgotPassword;
      if(!success) {
        throw new Error('forgot_password_failed');
      }
      return true;
    });
  };

  const sendVerificationEmail = async (email: string, requestOptions: ActionRequestOptions = {}): Promise<boolean> => {
    const queryVariables = {
      user: {
        type: 'UserInput!',
        value: {
          email
        }
      }
    };

    const onSuccess = (data?: UserApiResultsType) => {
      const success = !!data?.users?.sendVerificationEmail;
      return flux.dispatch({
        type: success ? USER_CONSTANTS.CONFIRM_SIGN_UP_SUCCESS : USER_CONSTANTS.CONFIRM_SIGN_UP_ERROR
      });
    };

    return publicMutation<UserApiResultsType>(
      flux,
      'sendVerificationEmail',
      DATA_TYPE,
      queryVariables,
      [],
      {onSuccess}
    ).then((data) => {
      const success = !!data?.users?.sendVerificationEmail;
      if(!success) {
        throw new Error('send_verification_email_failed');
      }
      return true;
    });
  };

  const resetPassword = async (
    username: string,
    password: string,
    code: string,
    type: 'email' | 'phone',
    requestOptions: ActionRequestOptions = {}
  ): Promise<boolean> => {
    const queryVariables = {
      code: {
        type: 'String!',
        value: code
      },
      user: {
        type: 'UserInput!',
        value: {
          ...(type === 'email' ? {email: username} : {phone: username}),
          password,
          username
        }
      }
    };

    const onSuccess = (data?: UserApiResultsType) => {
      const success = !!data?.users?.resetPassword;
      return flux.dispatch({
        type: success ? USER_CONSTANTS.RESET_PASSWORD_SUCCESS : USER_CONSTANTS.RESET_PASSWORD_ERROR
      });
    };

    return publicMutation<UserApiResultsType>(flux, 'resetPassword', DATA_TYPE, queryVariables, [], {onSuccess}).then((data) => {
      const success = !!data?.users?.resetPassword;
      if(!success) {
        throw new Error('reset_password_failed');
      }
      return true;
    });
  };

  const updatePassword = async (password: string, newPassword: string, requestOptions: ActionRequestOptions = {}): Promise<boolean> =>
    true
  ;

  return {
    addUser,
    confirmCode,
    confirmSignUp,
    currentAuthenticatedUser,
    currentUser,
    deleteBillingCard,
    list,
    forgotPassword,
    isLoggedIn,
    itemById,
    listByConnection,
    listByLatest,
    listByReactions,
    listByTags,
    refreshSession: refreshSessionAction,
    remove,
    resetPassword,
    saveBillingCard,
    search,
    sendVerificationEmail,
    session,
    signIn,
    signOut,
    signUp,
    updatePassword,
    updateUser,
    updatePlan,
    updateUserAdapter: userBase.updateAdapter,
    updateUserAdapterOptions: userBase.updateOptions
  };
};
