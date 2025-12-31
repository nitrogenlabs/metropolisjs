/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { DateTime } from 'luxon';

import { validateProfileInput, type ProfileType } from '../../adapters/profileAdapter/profileAdapter.js';
import { validateUserInput } from '../../adapters/userAdapter/userAdapter.js';
import { PROFILE_CONSTANTS } from '../../stores/index.js';
import { USER_CONSTANTS } from '../../stores/userStore.js';
import { appMutation, publicMutation, refreshSession } from '../../utils/api.js';
import { createBaseActions } from '../../utils/baseActionFactory.js';

import type { FluxAction, FluxFramework } from '@nlabs/arkhamjs';
import type { User } from '../../adapters/userAdapter/userAdapter.js';
import type { ApiResultsType, ReaktorDbCollection, SessionType } from '../../utils/api.js';
import type { BaseAdapterOptions } from '../../utils/validatorFactory.js';

const DATA_TYPE: ReaktorDbCollection = 'users';

export type UserAdapterOptions = BaseAdapterOptions;
export type UserProfileAdapterOptions = BaseAdapterOptions;

export interface UserActionsOptions {
  readonly userAdapter?: (input: unknown, options?: UserAdapterOptions) => any;
  readonly profileAdapter?: (input: unknown, options?: UserProfileAdapterOptions) => any;
  readonly userAdapterOptions?: UserAdapterOptions;
  readonly profileAdapterOptions?: UserProfileAdapterOptions;
}

export interface UserApiResultsType {
  readonly users: {
    readonly activeCount?: number;
    readonly add?: Partial<User>;
    readonly confirmCode?: boolean;
    readonly deactivate?: Partial<User>;
    readonly forgotPassword?: boolean;
    readonly itemById?: Partial<User>;
    readonly itemBySession?: Partial<User>;
    readonly itemByToken?: Partial<User>;
    readonly itemByUsername?: Partial<User>;
    readonly list?: User[];
    readonly listByConnection?: User[];
    readonly listByLatest?: User[];
    readonly listByReactions?: User[];
    readonly listByTags?: User[];
    readonly refreshSession?: SessionType;
    readonly remove?: Partial<User>;
    readonly resetPassword?: boolean;
    readonly session?: Partial<User>;
    readonly signIn?: Partial<User>;
    readonly signUp?: Partial<User>;
    readonly update?: Partial<User>;
    readonly updatePassword?: Partial<boolean>;
    readonly updateProfile?: Partial<ProfileType>;
  };
}

const defaultUserValidator = (input: unknown, options?: UserAdapterOptions) => {
  const validated = validateUserInput(input);

  if(options?.strict && !validated.username) {
    throw new Error('Username is required in strict mode');
  }

  return validated;
};

const defaultProfileValidator = (input: unknown, options?: UserProfileAdapterOptions) => validateProfileInput(input);

export interface userActions {
  add: (userInput: Partial<User>, userProps?: string[]) => Promise<User>;
  confirmCode: (code: number, {type, value}: {type: 'email' | 'phone', value: string}) => Promise<boolean>;
  confirmSignUp: (code: string, type: 'email' | 'phone') => Promise<boolean>;
  listByConnection: (userId: string, from?: number, to?: number, userProps?: string[]) => Promise<User[]>;
  itemById: (userId: string, userProps?: string[]) => Promise<User>;
  listByLatest: (username?: string, from?: number, to?: number, userProps?: string[]) => Promise<User[]>;
  listByReactions: (
    username: string,
    reactionNames: string[],
    from?: number,
    to?: number,
    profileProps?: string[]
  ) => Promise<User[]>;
  listByTags: (
    username: string,
    tagNames: string[],
    from?: number,
    to?: number,
    profileProps?: string[]
  ) => Promise<User[]>;
  forgotPassword: (username: string) => Promise<boolean>;
  isLoggedIn: () => boolean;
  refreshSession: (token?: string, expires?: number) => Promise<SessionType>;
  remove: (userId: string) => Promise<User>;
  resetPassword: (username: string, password: string, code: string, type: 'email' | 'phone') => Promise<boolean>;
  session: (userProps?: string[]) => Promise<User>;
  signIn: (username: string, password: string, expires?: number) => Promise<SessionType>;
  signOut: () => Promise<boolean>;
  signUp: (userInput: Partial<User>, userProps?: string[]) => Promise<User>;
  updatePassword: (password: string, newPassword: string) => Promise<boolean>;
  updateUser: (userInput: Partial<User>, userProps?: string[]) => Promise<User>;
  updateProfile: (profileInput: Partial<ProfileType>) => Promise<ProfileType>;
  updateUserAdapter: (adapter: (input: unknown, options?: UserAdapterOptions) => any) => void;
  updateProfileAdapter: (adapter: (input: unknown, options?: UserProfileAdapterOptions) => any) => void;
  updateUserAdapterOptions: (options: UserAdapterOptions) => void;
  updateProfileAdapterOptions: (options: UserProfileAdapterOptions) => void;
}

export const createUserActions = (
  flux: FluxFramework,
  options?: UserActionsOptions
): userActions => {
  const userBase = createBaseActions(flux, defaultUserValidator, {
    adapter: options?.userAdapter,
    adapterOptions: options?.userAdapterOptions
  });

  const profileBase = createBaseActions(flux, defaultProfileValidator, {
    adapter: options?.profileAdapter,
    adapterOptions: options?.profileAdapterOptions
  });
  const add = async (userInput: Partial<User>, userProps: string[] = []): Promise<User> => {
    const queryVariables = {
      user: {
        type: 'UserInput',
        value: userBase.validator(userInput)
      }
    };

    const onSuccess = (data: UserApiResultsType): Promise<FluxAction> => {
      const {users: {add: user = {}}} = data;
      return flux.dispatch({
        type: USER_CONSTANTS.ADD_ITEM_SUCCESS,
        user
      });
    };

    return publicMutation<UserApiResultsType>(
      flux,
      'add',
      DATA_TYPE,
      queryVariables,
      userProps || [
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
        'tags {id, name, tagId}',
        'thumbUrl',
        'userAccess',
        'userId',
        'username'
      ],
      {onSuccess}
    );
  };

  const signUp = async (userInput: Partial<User>, userProps: string[] = []): Promise<User> => {
    const queryVariables = {
      user: {
        type: 'UserInput!',
        value: userBase.validator(userInput)
      }
    };

    const onSuccess = (data: UserApiResultsType): Promise<FluxAction> => {
      const {users: {signUp: user = {}}} = data;
      return flux.dispatch({
        type: USER_CONSTANTS.SIGN_UP_SUCCESS,
        user: user
      });
    };

    try {
      return publicMutation<UserApiResultsType>(
        flux,
        'signUp',
        DATA_TYPE,
        queryVariables,
        [
          'added',
          'modified',
          'userId',
          'username',
          ...userProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: USER_CONSTANTS.SIGN_UP_ERROR});
      throw error;
    }
  };

  const updateUser = async (userInput: Partial<User>, userProps: string[] = []): Promise<User> => {
    const queryVariables = {
      user: {
        type: 'UserUpdateInput!',
        value: userBase.validator(userInput)
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const {users: {update: user = {}}} = data as unknown as UserApiResultsType;
      return flux.dispatch({
        type: USER_CONSTANTS.UPDATE_ITEM_SUCCESS,
        user
      });
    };

    return appMutation(
      flux,
      'update',
      DATA_TYPE,
      queryVariables,
      [
        'added',
        'address',
        'birthdate',
        'city',
        'country',
        'gender',
        'imageCount',
        'imageUrl',
        'latitude',
        'longitude',
        'mailingList',
        'modified',
        'state',
        'tags {id, name, tagId}',
        'thumbUrl',
        'userAccess',
        'userId',
        'username',
        ...userProps
      ],
      {onSuccess}
    );
  };

  const updateProfile = async (profileInput: Partial<ProfileType>): Promise<ProfileType> => {
    const queryVariables = {
      profile: {
        type: 'ProfileUpdateInput!',
        value: profileBase.validator(profileInput)
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const {users: {updateProfile: profile = {}}} = data as unknown as UserApiResultsType;
      return flux.dispatch({profile, type: PROFILE_CONSTANTS.UPDATE_ITEM_SUCCESS});
    };

    return appMutation(flux, 'updateProfile', DATA_TYPE, queryVariables, [], {onSuccess});
  };


  const confirmCode = async (code: number, {type, value}: {type: 'email' | 'phone', value: string}): Promise<boolean> => {
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
        value: value
      }
    };

    const onSuccess = (data: boolean = false) => {
      return flux.dispatch({type: USER_CONSTANTS.CONFIRM_SIGN_UP_SUCCESS, confirmed: data});
    };

    return appMutation<UserApiResultsType>(flux, 'confirmCode', DATA_TYPE, queryVariables, [], {onSuccess}).then((data) => {
      const confirmed = data?.users?.confirmCode;
      return !!confirmed;
    });
  };

  const remove = async (userId: string): Promise<User> => {
    const queryVariables = {
      userId: {
        type: 'String!',
        value: userId
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const {users: {remove: user = {}}} = data as unknown as UserApiResultsType;
      return flux.dispatch({type: USER_CONSTANTS.REMOVE_ITEM_SUCCESS, user});
    };

    return appMutation(flux, 'remove', DATA_TYPE, queryVariables, [], {onSuccess});
  };

  const session = async (userInput: string[] = []): Promise<User> => {
    const queryVariables = {
      user: {
        type: 'UserInput!',
        value: userBase.validator(userInput)
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const {users: {session = {}}} = data as unknown as UserApiResultsType;
      return flux.dispatch({type: USER_CONSTANTS.GET_SESSION_SUCCESS, user: session});
    };

    return appMutation(flux, 'session', DATA_TYPE, queryVariables, [], {onSuccess});
  };

  const itemById = async (userId: string, userProps: string[] = []): Promise<User> => {
    const queryVariables = {
      userId: {
        type: 'String!',
        value: userId
      }
    };

    const onSuccess = (data: ApiResultsType = {}) => {
      const {users: {itemById = {}}} = data as unknown as UserApiResultsType;
      return flux.dispatch({type: USER_CONSTANTS.GET_ITEM_SUCCESS, user: itemById});
    };

    return appMutation(flux, 'itemById', DATA_TYPE, queryVariables, [], {onSuccess});
  };

  const listByLatest = async (
    username: string = '',
    from: number = 0,
    to: number = 10,
    userProps: string[] = []
  ): Promise<User[]> =>
    []
  ;

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
    profileProps: string[] = []
  ): Promise<User[]> =>
    []
  ;

  const listByTags = async (
    username: string,
    tagNames: string[],
    from: number = 0,
    to: number = 10,
    profileProps: string[] = []
  ): Promise<User[]> =>
    []
  ;

  const isLoggedIn = (): boolean => {
    const expires: number = flux.getState('user.session.expires') as number;

    if(!expires) {
      return false;
    }

    const expireDate = DateTime.fromMillis(expires);
    const expiredDiff: number = Math.round(expireDate.diff(DateTime.local(), 'minutes').toObject().minutes);

    return expiredDiff > 0;
  };

  const refreshSessionAction = async (token?: string, expires: number = 15): Promise<SessionType> => {
    const result = await refreshSession(flux, token, expires);
    return (result?.refreshSession || {}) as SessionType;
  };

  const signIn = async (username: string, password: string, expires: number = 15): Promise<SessionType> => {
    const queryVariables = {
      expires: {
        type: 'Int',
        value: expires
      },
      password: {
        type: 'String!',
        value: password
      },
      username: {
        type: 'String!',
        value: username
      }
    };

    const onSuccess = (data: ApiResultsType = {}): Promise<FluxAction> => {
      const users = (data as any)?.users;
      const sessionData = users?.signIn || {};
      return flux.dispatch({
        session: sessionData,
        type: USER_CONSTANTS.SIGN_IN_SUCCESS
      });
    };

    try {
      await publicMutation<UserApiResultsType>(
        flux,
        'signIn',
        DATA_TYPE,
        queryVariables,
        ['expires', 'issued', 'token', 'userId', 'username'],
        {onSuccess}
      );

      const sessionData = flux.getState('user.session') || {};
      return sessionData as SessionType;
    } catch(error) {
      flux.dispatch({error, type: USER_CONSTANTS.SIGN_IN_ERROR});
      throw error;
    }
  };

  const signOut = async (): Promise<boolean> =>
    true
  ;

  const confirmSignUp = async (code: string, type: 'email' | 'phone'): Promise<boolean> =>
    true
  ;

  const forgotPassword = async (username: string): Promise<boolean> =>
    true
  ;

  const resetPassword = async (
    username: string,
    password: string,
    code: string,
    type: 'email' | 'phone'
  ): Promise<boolean> =>
    true
  ;

  const updatePassword = async (password: string, newPassword: string): Promise<boolean> =>
    true
  ;

  return {
    add,
    confirmCode,
    confirmSignUp,
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
    session,
    signIn,
    signOut,
    signUp,
    updatePassword,
    updateProfile,
    updateProfileAdapter: profileBase.updateAdapter,
    updateProfileAdapterOptions: profileBase.updateOptions,
    updateUser,
    updateUserAdapter: userBase.updateAdapter,
    updateUserAdapterOptions: userBase.updateOptions
  };
};
