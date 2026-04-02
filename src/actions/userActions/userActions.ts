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
  persistSession
} from '../../utils/session.js';
import {syncPersonaTagsToSession} from '../personaActions/personaActions.js';

import type {FluxAction, FluxFramework} from '@nlabs/arkhamjs';
import type {User} from '../../adapters/userAdapter/userAdapter.js';
import type {ApiResultsType, SessionType} from '../../utils/api.js';
import type {BaseAdapterOptions} from '../../utils/validatorFactory.js';

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

const syncStoredSession = (flux: FluxFramework, sessionPatch: Record<string, unknown> = {}): SessionType => {
  const currentSession = (flux.getState('user.session', {}) || {}) as Record<string, unknown>;
  const mergedSession = normalizeSession({...currentSession, ...sessionPatch}) as SessionType;

  if(Object.keys(mergedSession).length > 0) {
    flux.setState('user.session', mergedSession);
    persistSession(flux, mergedSession as unknown as Record<string, unknown>);
  }

  return mergedSession;
};

const getSessionPayload = (payload: unknown): Record<string, unknown> => {
  if(payload && typeof payload === 'object' && 'session' in (payload as Record<string, unknown>)) {
    return (((payload as Record<string, unknown>).session) || {}) as Record<string, unknown>;
  }

  return (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
};

const ensureSessionPersona = async (
  flux: FluxFramework,
  sessionData: Partial<User> = {}
): Promise<SessionType> => {
  const existingPersonaId = String((sessionData as any)?.personaId || '').trim();

  if(existingPersonaId) {
    return syncStoredSession(flux, sessionData as Record<string, unknown>);
  }

  return syncStoredSession(flux, sessionData as Record<string, unknown>);
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
    readonly session?: Partial<User>;
    readonly signIn?: Partial<User>;
    readonly signUp?: Partial<User>;
    readonly update?: Partial<User>;
    readonly updateUser?: Partial<User>;
    readonly updatePassword?: Partial<boolean>;
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
  addUser: (userInput: Partial<User>, userProps?: string[]) => Promise<User>;
  confirmCode: (code: number, {type, value}: {type: 'email' | 'phone'; value: string}) => Promise<boolean>;
  confirmSignUp: (code: string, type: 'email' | 'phone') => Promise<boolean>;
  currentAuthenticatedUser: () => Promise<User>;
  currentUser: () => Promise<User>;
  list: (userProps?: string[]) => Promise<User[]>;
  listByConnection: (userId: string, from?: number, to?: number, userProps?: string[]) => Promise<User[]>;
  itemById: (userId: string, userProps?: string[]) => Promise<User>;
  listByLatest: (username?: string, from?: number, to?: number, userProps?: string[]) => Promise<User[]>;
  listByReactions: (
    username: string,
    reactionNames: string[],
    from?: number,
    to?: number,
    personaProps?: string[]
  ) => Promise<User[]>;
  listByTags: (
    username: string,
    tagNames: string[],
    from?: number,
    to?: number,
    personaProps?: string[]
  ) => Promise<User[]>;
  forgotPassword: (username: string) => Promise<boolean>;
  isLoggedIn: () => boolean;
  refreshSession: (token?: string, expires?: number) => Promise<SessionType>;
  remove: (userId: string) => Promise<User>;
  resetPassword: (username: string, password: string, code: string, type: 'email' | 'phone') => Promise<boolean>;
  search: (query: string, userProps?: string[]) => Promise<User[]>;
  session: (userProps?: string[]) => Promise<User>;
  signIn: (user: Partial<User>, expires?: number) => Promise<SessionType>;
  signOut: () => Promise<boolean>;
  signUp: (userInput: Partial<User>, userProps?: string[]) => Promise<User>;
  updatePassword: (password: string, newPassword: string) => Promise<boolean>;
  updateUser: (userInput: Partial<User>, userProps?: string[]) => Promise<User>;
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
  const addUser = async (userInput: Partial<User>, userProps: string[] = []): Promise<User> => {
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

    return publicMutation<UserApiResultsType>(
      flux,
      'addUser',
      DATA_TYPE,
      queryVariables,
      returnProps,
      {onSuccess}
    );
  };

  const signUp = async (userInput: Partial<User>, userProps: string[] = []): Promise<User> => {
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
      return publicMutation<UserApiResultsType>(
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
    }
  };

  const updateUser = async (userInput: Partial<User>, userProps: string[] = []): Promise<User> => {
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
    } = userInput;
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

    return appMutation(
      flux,
      'updateUser',
      DATA_TYPE,
      queryVariables,
      returnProps,
      {onSuccess}
    );
  };

  const confirmCode = async (code: number, {type, value}: {type: 'email' | 'phone'; value: string}): Promise<boolean> => {
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

  const remove = async (userId: string): Promise<User> => {
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

    return appMutation(flux, 'remove', DATA_TYPE, queryVariables, [], {onSuccess});
  };

  const session = async (userProps: string[] = []): Promise<User> => withInvalidFieldRetry(
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
        clearPersistedSession(flux);
        flux.setState('user.session', {});
        flux.dispatch({type: USER_CONSTANTS.GET_SESSION_ERROR});
        throw new Error('invalid_session');
      }

      const nextSession = await ensureSessionPersona(flux, sessionData);
      await flux.dispatch({session: nextSession, type: USER_CONSTANTS.GET_SESSION_SUCCESS});
      await syncPersonaTagsToSession(flux, String((nextSession as any)?.personaId || ''));
      syncStoredSession(flux, (flux.getState('user.session', {}) || {}) as Record<string, unknown>);
      return (flux.getState('user.session', nextSession) || nextSession) as User;
    },
    userProps,
    DEFAULT_USER_QUERY_FIELDS
  );

  const itemById = async (userId: string, userProps: string[] = []): Promise<User> => {
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

    return withInvalidFieldRetry(
      (safeUserProps) => appQuery(flux, 'getUserById', DATA_TYPE, queryVariables, safeUserProps, {onSuccess}),
      userProps,
      DEFAULT_USER_QUERY_FIELDS
    );
  };

  const list = async (userProps: string[] = []): Promise<User[]> => {
    const onSuccess = (data: ApiResultsType = {}) => {
      const list = (data as unknown as UserApiResultsType)?.users?.getUserList || [];
      return flux.dispatch({list, type: USER_CONSTANTS.GET_LIST_SUCCESS});
    };

    return withInvalidFieldRetry(
      (safeUserProps) => appQuery(flux, 'getUserList', DATA_TYPE, {}, safeUserProps, {onSuccess}),
      userProps,
      DEFAULT_USER_QUERY_FIELDS
    );
  };

  const listByLatest = async (
    username: string = '',
    from: number = 0,
    to: number = 10,
    userProps: string[] = []
  ): Promise<User[]> => {
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

    return withInvalidFieldRetry(
      (safeUserProps) => appQuery(flux, 'listByLatest', DATA_TYPE, queryVariables, safeUserProps, {onSuccess}),
      userProps,
      DEFAULT_USER_QUERY_FIELDS
    );
  };

  const listByConnection = async (
    userId: string,
    from: number = 0,
    to: number = 10,
    userProps: string[] = []
  ): Promise<User[]> =>
    []
  ;

  const listByReactions = async (
    username: string,
    reactionNames: string[],
    from: number = 0,
    to: number = 10,
    personaProps: string[] = []
  ): Promise<User[]> =>
    []
  ;

  const listByTags = async (
    username: string,
    tagNames: string[],
    from: number = 0,
    to: number = 10,
    personaProps: string[] = []
  ): Promise<User[]> => {
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

    return withInvalidFieldRetry(
      (safeUserProps) => appQuery(flux, 'listByTags', DATA_TYPE, queryVariables, safeUserProps, {onSuccess}),
      personaProps,
      DEFAULT_USER_QUERY_FIELDS
    );
  };

  const search = async (query: string, userProps: string[] = []): Promise<User[]> => {
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

    return withInvalidFieldRetry(
      (safeUserProps) => appQuery(flux, 'search', DATA_TYPE, queryVariables, safeUserProps, {onSuccess}),
      userProps,
      DEFAULT_USER_QUERY_FIELDS
    );
  };

  const isLoggedIn = (): boolean => isLoggedInWithStorage(flux);

  const currentAuthenticatedUser = async (): Promise<User> => {
    const session = hydrateSessionFromStorage(flux);
    return (session || {}) as User;
  };

  const currentUser = async (): Promise<User> => currentAuthenticatedUser();

  const refreshSessionAction = async (token?: string, expires: number = 15): Promise<SessionType> => {
    const result = await refreshSession(flux, token, expires);
    return (result?.refreshSession || {}) as SessionType;
  };

  const signIn = async (user: Partial<User>, expires: number = 15): Promise<SessionType> => {
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

    const queryVariablesWithUserInput = {
      expires: {
        type: 'Int',
        value: expires
      },
      user: {
        type: 'UserInput!',
        value: userInput
      }
    };

    const onSuccess = (data: ApiResultsType = {}): Promise<FluxAction> => {
      const users = (data as any)?.users;
      const sessionData = normalizeSession(users?.signIn || {});
      syncStoredSession(flux, sessionData);

      return flux.dispatch({
        session: sessionData,
        type: USER_CONSTANTS.SIGN_IN_SUCCESS
      });
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
      const baseSession = syncStoredSession(flux, getSessionPayload(sessionResult));

      try {
        const hydratedSession = await session(['personaId', 'userAccess', 'username']);
        await syncPersonaTagsToSession(flux, String((hydratedSession as any)?.personaId || ''));
      } catch(error) {
        syncStoredSession(flux, baseSession as Record<string, unknown>);
        return baseSession;
      }

      const finalSession = syncStoredSession(
        flux,
        (flux.getState('user.session', baseSession) || baseSession) as Record<string, unknown>
      );
      return finalSession;
    };

    try {
      return await performSignIn(queryVariablesWithUserInput);
    } catch(error) {
      flux.dispatch({error, type: USER_CONSTANTS.SIGN_IN_ERROR});
      throw error;
    }
  };

  const signOut = async (): Promise<boolean> => {
    clearPersistedSession(flux);
    flux.setState('user.session', {});
    await flux.dispatch({session: {}, type: USER_CONSTANTS.SIGN_OUT_SUCCESS});
    return true;
  };

  const confirmSignUp = async (code: string, type: 'email' | 'phone'): Promise<boolean> =>
    true;

  const forgotPassword = async (username: string): Promise<boolean> => {
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

  const resetPassword = async (
    username: string,
    password: string,
    code: string,
    type: 'email' | 'phone'
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

  const updatePassword = async (password: string, newPassword: string): Promise<boolean> =>
    true
  ;

  return {
    addUser,
    confirmCode,
    confirmSignUp,
    currentAuthenticatedUser,
    currentUser,
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
    search,
    session,
    signIn,
    signOut,
	    signUp,
	    updatePassword,
	    updateUser,
	    updateUserAdapter: userBase.updateAdapter,
	    updateUserAdapterOptions: userBase.updateOptions
	  };
};
