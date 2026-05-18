import {USER_CONSTANTS, defaultValues, userStore} from './userStore';
import {REACTION_CONSTANTS} from './reactionStore';
import {TAG_CONSTANTS} from './tagStore';

describe('userStore', () => {
  it('should have expected USER_CONSTANTS values', () => {
    expect(USER_CONSTANTS.ADD_ITEM_SUCCESS).toBe('USER_ADD_ITEM_SUCCESS');
    expect(USER_CONSTANTS.GET_ITEM_SUCCESS).toBe('USER_GET_ITEM_SUCCESS');
    expect(USER_CONSTANTS.GET_LIST_SUCCESS).toBe('USER_GET_LIST_SUCCESS');
    expect(USER_CONSTANTS.UPDATE_ITEM_SUCCESS).toBe('USER_UPDATE_ITEM_SUCCESS');
    expect(USER_CONSTANTS.REMOVE_ITEM_SUCCESS).toBe('USER_REMOVE_ITEM_SUCCESS');
    expect(USER_CONSTANTS.SIGN_IN_SUCCESS).toBe('USER_SIGN_IN_SUCCESS');
    expect(USER_CONSTANTS.SIGN_UP_SUCCESS).toBe('USER_SIGN_UP_SUCCESS');
    expect(USER_CONSTANTS.SIGN_OUT_SUCCESS).toBe('USER_SIGN_OUT_SUCCESS');
    expect(USER_CONSTANTS.GET_SESSION_SUCCESS).toBe('USER_GET_SESSION_SUCCESS');
  });

  it('should have expected defaultValues structure', () => {
    expect(defaultValues).toEqual({
      likes: [],
      lists: {},
      session: {},
      users: {}
    });
  });

  it('should have userStore function', () => {
    expect(typeof userStore).toBe('function');
  });

  it('should handle userStore with ADD_ITEM_SUCCESS', () => {
    const action = {
      type: USER_CONSTANTS.ADD_ITEM_SUCCESS,
      user: {userId: 'test-id', username: 'testuser'}
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.users).toBeDefined();
  });

  it('should handle userStore with GET_ITEM_SUCCESS', () => {
    const action = {
      type: USER_CONSTANTS.GET_ITEM_SUCCESS,
      user: {userId: 'test-id', username: 'testuser'}
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.users).toBeDefined();
  });

  it('should handle userStore with GET_LIST_SUCCESS', () => {
    const action = {
      list: [
        {userId: 'test-id-1', username: 'testuser1'},
        {userId: 'test-id-2', username: 'testuser2'}
      ],
      type: USER_CONSTANTS.GET_LIST_SUCCESS
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.users).toBeDefined();
  });

  it('should handle userStore with UPDATE_ITEM_SUCCESS', () => {
    const action = {
      type: USER_CONSTANTS.UPDATE_ITEM_SUCCESS,
      user: {userId: 'test-id', username: 'updateduser'}
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.users).toBeDefined();
  });

  it('should handle userStore with REMOVE_ITEM_SUCCESS', () => {
    const action = {
      type: USER_CONSTANTS.REMOVE_ITEM_SUCCESS,
      user: {userId: 'test-id'}
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle userStore with SIGN_IN_SUCCESS', () => {
    const action = {
      session: {token: 'test-token', userId: 'test-id'},
      type: USER_CONSTANTS.SIGN_IN_SUCCESS
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.session).toBeDefined();
  });

  it('should handle userStore with SIGN_UP_SUCCESS', () => {
    const action = {
      type: USER_CONSTANTS.SIGN_UP_SUCCESS,
      user: {userId: 'test-id', username: 'newuser'}
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.users).toBeDefined();
  });

  it('should handle userStore with SIGN_OUT_SUCCESS', () => {
    const action = {
      type: USER_CONSTANTS.SIGN_OUT_SUCCESS
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle userStore with GET_SESSION_SUCCESS', () => {
    const action = {
      session: {token: 'test-token', userId: 'test-id'},
      type: USER_CONSTANTS.GET_SESSION_SUCCESS
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.session).toBeDefined();
  });

  it('should handle userStore with error actions', () => {
    const errorActions = [
      USER_CONSTANTS.ADD_ITEM_ERROR,
      USER_CONSTANTS.GET_ITEM_ERROR,
      USER_CONSTANTS.GET_LIST_ERROR,
      USER_CONSTANTS.UPDATE_ITEM_ERROR,
      USER_CONSTANTS.REMOVE_ITEM_ERROR,
      USER_CONSTANTS.SIGN_IN_ERROR,
      USER_CONSTANTS.SIGN_UP_ERROR,
      USER_CONSTANTS.SIGN_OUT_ERROR,
      USER_CONSTANTS.GET_SESSION_ERROR
    ];

    for(const errorType of errorActions) {
      const action = {
        error: new Error('Test error'),
        type: errorType
      };

      const result = userStore(action.type, action);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    }
  });

  it('should handle userStore with unknown action type', () => {
    const action = {
      type: 'UNKNOWN_ACTION'
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle userStore with empty users array', () => {
    const action = {
      list: [],
      type: USER_CONSTANTS.GET_LIST_SUCCESS
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.users).toBeDefined();
  });

  it('should handle userStore with null user data', () => {
    const action = {
      type: USER_CONSTANTS.GET_ITEM_SUCCESS,
      user: null
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle userStore with undefined user data', () => {
    const action = {
      type: USER_CONSTANTS.GET_ITEM_SUCCESS,
      user: undefined
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle userStore with complex user data', () => {
    const complexUser = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      userId: 'test-id',
      username: 'johndoe'
    };
    const action = {
      type: USER_CONSTANTS.ADD_ITEM_SUCCESS,
      user: complexUser
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.users).toBeDefined();
  });

  it('should handle userStore with multiple users', () => {
    const multipleUsers = [
      {email: 'user1@example.com', userId: 'id-1', username: 'user1'},
      {email: 'user2@example.com', userId: 'id-2', username: 'user2'},
      {email: 'user3@example.com', userId: 'id-3', username: 'user3'}
    ];
    const action = {
      list: multipleUsers,
      type: USER_CONSTANTS.GET_LIST_SUCCESS
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.users).toBeDefined();
  });

  it('should handle userStore with existing state', () => {
    const initialState = {
      likes: [],
      lists: {},
      session: {token: 'existing-token'},
      users: {'existing-id': {userId: 'existing-id', username: 'existinguser'}}
    };
    const action = {
      type: USER_CONSTANTS.ADD_ITEM_SUCCESS,
      user: {userId: 'new-id', username: 'newuser'}
    };

    const result = userStore(action.type, action, initialState);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.users).toBeDefined();
  });

  it('should handle userStore with session data', () => {
    const sessionData = {
      expires: 1234567890,
      token: 'test-token',
      userId: 'test-id'
    };
    const action = {
      session: sessionData,
      type: USER_CONSTANTS.SIGN_IN_SUCCESS
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.session).toBeDefined();
  });

  it('should handle userStore with likes data', () => {
    const likesData = ['like-1', 'like-2', 'like-3'];
    const action = {
      likes: likesData,
      type: USER_CONSTANTS.HAS_USER_REACTIONS
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle userStore with lists data', () => {
    const listsData = {
      'list-1': {listId: 'list-1', name: 'List 1'},
      'list-2': {listId: 'list-2', name: 'List 2'}
    };
    const action = {
      lists: listsData,
      type: USER_CONSTANTS.GET_DETAILS_SUCCESS
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle userStore with authentication update', () => {
    const authData = {isAuthenticated: true, userId: 'test-id'};
    const action = {
      authentication: authData,
      type: USER_CONSTANTS.AUTHENTICATION_UPDATE
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should handle userStore with large user sets', () => {
    const largeUsers = Array.from({length: 100}, (_, i) => ({
      userId: `user-${i}`,
      username: `user${i}`
    }));
    const action = {
      list: largeUsers,
      type: USER_CONSTANTS.GET_LIST_SUCCESS
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.users).toBeDefined();
  });

  it('should handle userStore with special characters in usernames', () => {
    const specialUsers = [
      {userId: 'user-1', username: 'user.with.dots'},
      {userId: 'user-2', username: 'user-with-dashes'},
      {userId: 'user-3', username: 'user_with_underscores'},
      {userId: 'user-4', username: 'user with spaces'}
    ];
    const action = {
      list: specialUsers,
      type: USER_CONSTANTS.GET_LIST_SUCCESS
    };

    const result = userStore(action.type, action);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.users).toBeDefined();
  });

  it('updates session tags, personas, reactions, and error reset branches', () => {
    let state = userStore(USER_CONSTANTS.SIGN_IN_SUCCESS, {
      session: {
        tags: [{name: 'Old', tagId: 'tag-1'}],
        userId: 'user-1',
        username: 'alpha'
      }
    } as any);

    state = userStore(TAG_CONSTANTS.ADD_PERSONA_SUCCESS, {
      tag: {name: 'New', tagId: 'tag-2'}
    } as any, state);
    expect(state.session.tags?.map((tag: any) => tag.name)).toEqual(['New', 'Old']);

    state = userStore(TAG_CONSTANTS.REMOVE_PERSONA_SUCCESS, {
      tag: {tagId: 'tag-1'}
    } as any, state);
    expect(state.session.tags).toEqual([{name: 'New', tagId: 'tag-2'}]);

    state = userStore(USER_CONSTANTS.UPDATE_PERSONA_SUCCESS, {
      persona: {personaId: 'persona-1', name: 'Persona'}
    } as any, state);
    expect(state.session.personaId).toBe('persona-1');

    state = userStore(USER_CONSTANTS.UPDATE_SESSION_SUCCESS, {
      user: {userActive: true}
    } as any, state);
    expect(state.session.userActive).toBe(true);

    state = userStore(USER_CONSTANTS.GET_DETAILS_SUCCESS, {
      user: {userId: 'user-1', username: 'alpha'}
    } as any, state);
    state = userStore(REACTION_CONSTANTS.ADD_ITEM_SUCCESS, {
      itemId: 'user-1',
      itemType: 'users',
      reaction: {name: 'like', value: 'true'}
    } as any, state);
    expect(state.users['user-1'].hasLike).toBe(true);
    expect(state.users['user-1'].likeCount).toBe(1);

    state = userStore(REACTION_CONSTANTS.REMOVE_ITEM_SUCCESS, {
      itemId: 'user-1',
      itemType: 'users',
      reaction: {name: 'like', value: 'false'}
    } as any, state);
    expect(state.users['user-1'].hasLike).toBe(false);
    expect(state.users['user-1'].likeCount).toBe(0);

    expect(userStore(USER_CONSTANTS.SIGN_IN_ERROR, {}, state).session.username).toBe('alpha');
    expect(userStore(USER_CONSTANTS.GET_SESSION_ERROR, {}, state)).toEqual(defaultValues);
  });
});
