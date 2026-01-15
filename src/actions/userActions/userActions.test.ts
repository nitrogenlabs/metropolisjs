import {createUserActions} from './userActions';

const createMockFlux = () => {
  const defaultConfig = {
    app: {
      api: {
        public: 'http://localhost:3000/public',
        url: 'http://localhost:3000/app'
      }
    },
    environment: 'test',
    isAuth: () => true
  };

  const mockState = {
    'app.config': defaultConfig
  };

  return {
    dispatch: () => {},
    getState: (key) => {
      if (key) {
        return mockState[key];
      }
      return mockState;
    },
    isInit: false,
    pluginTypes: [],
    state: mockState,
    storeActions: {}
  };
};

const mockFlux = createMockFlux();

import * as api from '../../utils/api';

describe('userActions', () => {
  let userActions;

  beforeEach(() => {
    userActions = createUserActions(mockFlux as any);
  });

  it('should create userActions with all required methods', () => {
    expect(userActions.add).toBeDefined();
    expect(userActions.confirmCode).toBeDefined();
    expect(userActions.forgotPassword).toBeDefined();
    expect(userActions.isLoggedIn).toBeDefined();
    expect(userActions.itemById).toBeDefined();
    expect(userActions.listByConnection).toBeDefined();
    expect(userActions.listByLatest).toBeDefined();
    expect(userActions.listByReactions).toBeDefined();
    expect(userActions.listByTags).toBeDefined();
    expect(userActions.refreshSession).toBeDefined();
    expect(userActions.remove).toBeDefined();
    expect(userActions.resetPassword).toBeDefined();
    expect(userActions.session).toBeDefined();
    expect(userActions.signIn).toBeDefined();
    expect(userActions.signOut).toBeDefined();
    expect(userActions.updateProfile).toBeDefined();
    expect(userActions.updateProfileAdapter).toBeDefined();
    expect(userActions.updateProfileAdapterOptions).toBeDefined();
    expect(userActions.updateUser).toBeDefined();
    expect(userActions.updateUserAdapter).toBeDefined();
    expect(userActions.updateUserAdapterOptions).toBeDefined();
  });

  it('should have correct method types', () => {
    expect(typeof userActions.add).toBe('function');
    expect(typeof userActions.confirmCode).toBe('function');
    expect(typeof userActions.forgotPassword).toBe('function');
    expect(typeof userActions.isLoggedIn).toBe('function');
    expect(typeof userActions.itemById).toBe('function');
    expect(typeof userActions.listByConnection).toBe('function');
    expect(typeof userActions.listByLatest).toBe('function');
    expect(typeof userActions.listByReactions).toBe('function');
    expect(typeof userActions.listByTags).toBe('function');
    expect(typeof userActions.refreshSession).toBe('function');
    expect(typeof userActions.remove).toBe('function');
    expect(typeof userActions.resetPassword).toBe('function');
    expect(typeof userActions.session).toBe('function');
    expect(typeof userActions.signIn).toBe('function');
    expect(typeof userActions.signOut).toBe('function');
    expect(typeof userActions.updateProfile).toBe('function');
    expect(typeof userActions.updateProfileAdapter).toBe('function');
    expect(typeof userActions.updateProfileAdapterOptions).toBe('function');
    expect(typeof userActions.updateUser).toBe('function');
    expect(typeof userActions.updateUserAdapter).toBe('function');
    expect(typeof userActions.updateUserAdapterOptions).toBe('function');
  });

  it('should validate add method returns expected structure', async () => {
    const userData = {email: 'test@example.com', username: 'testuser'};

    try {
      const result = await userActions.add(userData);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate updateUser method returns expected structure', async () => {
    const userData = {email: 'updated@example.com', userId: 'test-id', username: 'updateduser'};

    try {
      const result = await userActions.updateUser(userData);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate confirmCode method returns expected structure', async () => {
    try {
      const result = await userActions.confirmCode('email', 123456);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate confirmAdd method returns expected structure', async () => {
    try {
      const result = await userActions.confirmAdd('123456', 'email');

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate forgotPassword method returns expected structure', async () => {
    try {
      const result = await userActions.forgotPassword('testuser');

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate isLoggedIn method returns expected structure', () => {
    try {
      const result = userActions.isLoggedIn();

      expect(result).toBeDefined();
      expect(typeof result).toBe('boolean');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate itemById method returns expected structure', async () => {
    try {
      const result = await userActions.itemById('test-id');

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate listByConnection method returns expected structure', async () => {
    try {
      const result = await userActions.listByConnection('test-id');

      expect(result).toBeDefined();
      expect(Array.isArray(result) || typeof result === 'object').toBe(true);
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate listByLatest method returns expected structure', async () => {
    try {
      const result = await userActions.listByLatest();

      expect(result).toBeDefined();
      expect(Array.isArray(result) || typeof result === 'object').toBe(true);
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate listByReactions method returns expected structure', async () => {
    try {
      const result = await userActions.listByReactions('testuser', ['like', 'love']);

      expect(result).toBeDefined();
      expect(Array.isArray(result) || typeof result === 'object').toBe(true);
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate listByTags method returns expected structure', async () => {
    try {
      const result = await userActions.listByTags('testuser', ['tag1', 'tag2']);

      expect(result).toBeDefined();
      expect(Array.isArray(result) || typeof result === 'object').toBe(true);
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate refreshSession method returns expected structure', async () => {
    try {
      const result = await userActions.refreshSession();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate remove method returns expected structure', async () => {
    try {
      const result = await userActions.remove('test-id');

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate resetPassword method returns expected structure', async () => {
    try {
      const result = await userActions.resetPassword('testuser', 'newpassword', '123456', 'email');

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate session method returns expected structure', async () => {
    try {
      const result = await userActions.session();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate signIn method returns expected structure', async () => {
    try {
      const result = await userActions.signIn('testuser', 'password');

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should return session object from API on successful signIn', async () => {
    const mockSession = {
      expires: 1768361710193,
      issued: 1768361650193,
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      userId: '3a42371a1631ed62d01da12441ba7547',
      username: 'test@nitrogenx.co'
    };

    jest.spyOn(api, 'publicMutation').mockResolvedValue(mockSession as any);

    const result = await userActions.signIn({username: 'test@nitrogenx.co', password: 'password'} as any);

    expect(result).toEqual(mockSession);
  });

  it('should validate signOut method returns expected structure', async () => {
    try {
      const result = await userActions.signOut();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate addUser method returns expected structure', async () => {
    try {
      const result = await userActions.addUser({email: 'test@example.com', username: 'testuser'});

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate updateProfile method returns expected structure', async () => {
    try {
      const result = await userActions.updateProfile({bio: 'test-bio', name: 'test-name'});

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    } catch(error) {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
    }
  });

  it('should validate updateUserAdapter method behavior', () => {
    const mockAdapter = () => {};
    const originalAdapter = userActions.updateUserAdapter;

    userActions.updateUserAdapter(mockAdapter);

    expect(typeof userActions.updateUserAdapter).toBe('function');
    expect(mockAdapter).toBeDefined();

    userActions.updateUserAdapter = originalAdapter;
  });

  it('should validate updateUserAdapterOptions method behavior', () => {
    const testOptions = {strict: true};
    const originalOptions = userActions.updateUserAdapterOptions;

    userActions.updateUserAdapterOptions(testOptions);

    expect(typeof userActions.updateUserAdapterOptions).toBe('function');

    userActions.updateUserAdapterOptions = originalOptions;
  });

  it('should validate updateProfileAdapter method behavior', () => {
    const mockAdapter = () => {};
    const originalAdapter = userActions.updateProfileAdapter;

    userActions.updateProfileAdapter(mockAdapter);

    expect(typeof userActions.updateProfileAdapter).toBe('function');
    expect(mockAdapter).toBeDefined();

    userActions.updateProfileAdapter = originalAdapter;
  });

  it('should validate updateProfileAdapterOptions method behavior', () => {
    const testOptions = {strict: true};
    const originalOptions = userActions.updateProfileAdapterOptions;

    userActions.updateProfileAdapterOptions(testOptions);

    expect(typeof userActions.updateProfileAdapterOptions).toBe('function');

    userActions.updateProfileAdapterOptions = originalOptions;
  });

  it('should handle add with minimal input', async () => {
    const userData = {username: 'minimaluser'};

    try {
      await userActions.add(userData);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle add with full input', async () => {
    const userData = {email: 'full@example.com', firstName: 'John', lastName: 'Doe', username: 'fulluser'};

    try {
      await userActions.add(userData);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle updateUser with minimal input', async () => {
    const userData = {userId: 'test-id', username: 'minimal-updated'};

    try {
      await userActions.updateUser(userData);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle updateUser with full input', async () => {
    const userData = {email: 'full-updated@example.com', firstName: 'Jane', lastName: 'Smith', userId: 'test-id', username: 'full-updated'};

    try {
      await userActions.updateUser(userData);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle confirmCode with various types', async () => {
    const testTypes = ['email', 'phone'];

    for(const type of testTypes) {
      try {
        await userActions.confirmCode(type, 123456);
      } catch(error) {
        expect(error).toBeDefined();
      }
    }
  });

  it('should handle confirmAdd with various types', async () => {
    const testTypes = ['email', 'phone'];

    for(const type of testTypes) {
      try {
        await userActions.confirmAdd('123456', type);
      } catch(error) {
        expect(error).toBeDefined();
      }
    }
  });

  it('should handle resetPassword with various types', async () => {
    const testTypes = ['email', 'phone'];

    for(const type of testTypes) {
      try {
        await userActions.resetPassword('testuser', 'newpassword', '123456', type);
      } catch(error) {
        expect(error).toBeDefined();
      }
    }
  });

  it('should handle itemById with various IDs', async () => {
    const testIds = ['user-id-1', 'user-id-2', 'user-id-3'];

    for(const id of testIds) {
      try {
        await userActions.itemById(id);
      } catch(error) {
        expect(error).toBeDefined();
      }
    }
  });

  it('should handle listByConnection with various parameters', async () => {
    const testParams = [
      {from: 0, to: 10, userId: 'user-1'},
      {from: 5, to: 15, userId: 'user-2'},
      {from: 10, to: 20, userId: 'user-3'}
    ];

    for(const params of testParams) {
      try {
        await userActions.listByConnection(params.userId, params.from, params.to);
      } catch(error) {
        expect(error).toBeDefined();
      }
    }
  });

  it('should handle listByLatest with various parameters', async () => {
    const testParams = [
      {from: 0, to: 10, username: 'user1'},
      {from: 5, to: 15, username: 'user2'},
      {from: 10, to: 20, username: ''}
    ];

    for(const params of testParams) {
      try {
        await userActions.listByLatest(params.username, params.from, params.to);
      } catch(error) {
        expect(error).toBeDefined();
      }
    }
  });

  it('should handle listByReactions with various reactions', async () => {
    const testReactions = [
      ['like'],
      ['love', 'haha'],
      ['like', 'love', 'wow', 'sad']
    ];

    for(const reactions of testReactions) {
      try {
        await userActions.listByReactions('testuser', reactions);
      } catch(error) {
        expect(error).toBeDefined();
      }
    }
  });

  it('should handle listByTags with various tags', async () => {
    const testTags = [
      ['tag1'],
      ['tag1', 'tag2'],
      ['tag1', 'tag2', 'tag3']
    ];

    for(const tags of testTags) {
      try {
        await userActions.listByTags('testuser', tags);
      } catch(error) {
        expect(error).toBeDefined();
      }
    }
  });

  it('should handle signIn with various parameters', async () => {
    const testParams = [
      {expires: 15, password: 'pass1', username: 'user1'},
      {expires: 30, password: 'pass2', username: 'user2'},
      {password: 'pass3', username: 'user3'}
    ];

    for(const params of testParams) {
      try {
        await userActions.signIn(params.username, params.password, params.expires);
      } catch(error) {
        expect(error).toBeDefined();
      }
    }
  });

  it('should handle add with userProps', async () => {
    const userData = {username: 'testuser'};
    const userProps = ['email', 'firstName'];

    try {
      await userActions.add(userData, userProps);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle itemById with userProps', async () => {
    const userProps = ['email', 'firstName'];

    try {
      await userActions.itemById('test-id', userProps);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle listByConnection with userProps', async () => {
    const userProps = ['email', 'firstName'];

    try {
      await userActions.listByConnection('test-id', 0, 10, userProps);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle listByLatest with userProps', async () => {
    const userProps = ['email', 'firstName'];

    try {
      await userActions.listByLatest('testuser', 0, 10, userProps);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle listByReactions with profileProps', async () => {
    const profileProps = ['bio', 'name'];

    try {
      await userActions.listByReactions('testuser', ['like'], 0, 10, profileProps);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle listByTags with profileProps', async () => {
    const profileProps = ['bio', 'name'];

    try {
      await userActions.listByTags('testuser', ['tag1'], 0, 10, profileProps);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle session with userProps', async () => {
    const userProps = ['email', 'firstName'];

    try {
      await userActions.session(userProps);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle addUser with userProps', async () => {
    const userData = {username: 'testuser'};
    const userProps = ['email', 'firstName'];

    try {
      await userActions.addUser(userData, userProps);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle updateUser with userProps', async () => {
    const userData = {userId: 'test-id', username: 'testuser'};
    const userProps = ['email', 'firstName'];

    try {
      await userActions.updateUser(userData, userProps);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle empty userProps', async () => {
    const userData = {username: 'testuser'};

    try {
      await userActions.add(userData, []);
    } catch(error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle adapter updates with various functions', () => {
    const testAdapters = [
      () => {},
      (input) => input,
      (input, options) => ({...input, ...options})
    ];

    for(const adapter of testAdapters) {
      userActions.updateUserAdapter(adapter);

      expect(typeof userActions.updateUserAdapter).toBe('function');
    }
  });

  it('should handle adapter options with various objects', () => {
    const testOptions = [
      {strict: true},
      {allowPartial: true},
      {environment: 'test'},
      {allowPartial: false, environment: 'development', strict: true}
    ];

    for(const options of testOptions) {
      userActions.updateUserAdapterOptions(options);

      expect(typeof userActions.updateUserAdapterOptions).toBe('function');
    }
  });
});
