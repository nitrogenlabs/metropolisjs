import {expect, vi} from 'vitest';

const makeEntity = (dataType: string, operation: string) => {
  const idName = dataType.slice(0, -1) + 'Id';

  return {
    [idName]: `${operation}-id`,
    id: `${dataType}/${operation}-id`,
    itemId: 'item-1',
    itemType: 'post',
    key: 'welcome',
    locale: 'en',
    name: `${operation} name`,
    value: `${operation} value`
  };
};

const listEntity = (dataType: string, operation: string) => [
  makeEntity(dataType, operation)
];

const responseFor = (dataType: string, operation: string) => {
  const entity = makeEntity(dataType, operation);
  const list = listEntity(dataType, operation);

  return {
    [dataType]: {
      [operation]: operation.toLowerCase().includes('list') || operation.toLowerCase().includes('tags') ? list : entity,
      abortMultipartUpload: true,
      add: entity,
      addConnection: true,
      addEvent: entity,
      addItem: entity,
      addPersonaReaction: entity,
      addPlan: entity,
      addPost: entity,
      addReaction: entity,
      addSubscription: true,
      addTag: entity,
      addTagToItem: entity,
      addUser: entity,
      autocompleteLocation: list,
      check: true,
      completeMultipartUpload: entity,
      createMultipartUpload: {
        bucket: 'media',
        key: 'videos/key',
        partSize: 5,
        partUrls: [{partNumber: 1, url: 'https://example.com/part'}],
        uploadId: 'upload-1',
        video: entity,
        videoId: 'video-1'
      },
      deleteConnection: true,
      deleteContent: entity,
      deleteEvent: entity,
      deletePost: entity,
      deletePersona: entity,
      deletePersonaReaction: entity,
      deleteReaction: entity,
      deleteSubscription: true,
      deleteTag: entity,
      deleteTagFromItem: entity,
      getConnections: list,
      getContent: entity,
      getContentByKey: entity,
      getContentsByCategory: list,
      getContentsList: list,
      getConversations: list,
      getCurrentLocation: entity,
      getDirectConversation: entity,
      getEvent: entity,
      getEventsByReactions: list,
      getEventsByTags: list,
      getGoogleLocation: entity,
      getImageById: entity,
      getImagesByItem: list,
      getLocation: entity,
      getMessages: list,
      getMultipartUploadPartUrls: [{partNumber: 1, url: 'https://example.com/part'}],
      getPersonaById: entity,
      getPersonaListByIds: list,
      getPlanByItem: entity,
      getPost: entity,
      getPostsByLatest: list,
      getPostsByLocation: list,
      getPostsByReactions: list,
      getPostsByTags: list,
      getReactionCount: 7,
      getSubscriptionByItem: true,
      getSubscriptionListByUser: list,
      getTags: list,
      getTagsByItem: list,
      getTranslation: entity,
      getTranslations: list,
      getUser: entity,
      getUserByAttribute: entity,
      getUserListByIds: list,
      getVideoById: entity,
      getVideoListByItem: list,
      getVideoListByReactions: list,
      hasPersonaReaction: true,
      hasReaction: true,
      imagesByPersonaReactions: list,
      imagesByReactions: list,
      list,
      listByRelation: list,
      listByTags: list,
      remove: entity,
      removeConnection: true,
      removeItem: entity,
      removePermission: entity,
      removeUser: entity,
      rsvpEvent: entity,
      search: list,
      confirmSignUp: true,
      forgotPassword: true,
      resetPassword: true,
      sendVerificationEmail: true,
      session: entity,
      signIn: {
        session: {expires: 60, token: 'token-1', userId: 'user-1'},
        user: entity
      },
      signOut: true,
      signUp: entity,
      update: entity,
      updateContent: entity,
      updateEvent: entity,
      updateItem: entity,
      updateLocation: entity,
      updatePermission: entity,
      updatePost: entity,
      updateTag: entity,
      updateUser: entity
    },
    addLocation: entity,
    autocompleteLocation: list,
    deleteLocation: entity,
    getCurrentLocation: entity,
    getGoogleLocation: entity,
    getLocation: entity,
    locationsByItem: list,
    imageCount: 3,
    updateLocation: entity
  };
};

const apiMocks = vi.hoisted(() => ({
  appMutation: vi.fn(async (flux, operation, dataType, _queryVariables, _props, options = {}) => {
    const response = responseFor(dataType, operation);
    return options.onSuccess ? await options.onSuccess(response) : response[dataType]?.[operation] ?? response;
  }),
  appQuery: vi.fn(async (flux, operation, dataType, _queryVariables, _props, options = {}) => {
    const response = responseFor(dataType, operation);
    return options.onSuccess ? await options.onSuccess(response) : response[dataType]?.[operation] ?? response;
  }),
  publicMutation: vi.fn(async (flux, operation, dataType, _queryVariables, _props, options = {}) => {
    const response = responseFor(dataType, operation);
    if(options.onSuccess) {
      await options.onSuccess(response);
    }
    return response;
  }),
  publicQuery: vi.fn(async (flux, operation, dataType, _queryVariables, _props, options = {}) => {
    const response = responseFor(dataType, operation);
    if(options.onSuccess) {
      await options.onSuccess(response);
    }
    return response;
  }),
  refreshSession: vi.fn(async () => ({expires: 60, token: 'token-1', userId: 'user-1'})),
  uploadImage: vi.fn(async () => ({image: makeEntity('images', 'uploadImage')}))
}));

vi.mock('../utils/api.js', () => apiMocks);

vi.mock('../utils/location.js', () => ({
  autoCompleteLocation: vi.fn(async () => [{address: '123 Main', latitude: 1, longitude: 2}])
}));

const createFlux = () => {
  const state = new Map<string, unknown>([
    ['app.config', {api: {url: 'https://example.com/graphql'}, websocket: {url: 'wss://example.com/ws'}}],
    ['translations', {
      pendingKeys: new Set(['common:welcome:en']),
      translations: {
        'common:welcome:en': {value: 'Welcome'}
      }
    }],
    ['user.session', {personaId: 'persona-1', token: 'token-1', userId: 'user-1'}],
    ['user.session.personaId', 'persona-1'],
    ['user.session.token', 'token-1'],
    ['user.session.userId', 'user-1']
  ]);

  return {
    dispatch: vi.fn(async (action) => action),
    getState: vi.fn((path?: string, fallback?: unknown) => path ? state.get(path) ?? fallback : Object.fromEntries(state)),
    setState: vi.fn(async (path: string, value: unknown) => {
      state.set(path, value);
      return value;
    })
  };
};

const expectFluxAction = async (promise: Promise<unknown>, flux: ReturnType<typeof createFlux>, expectedAction: Record<string, unknown>) => {
  await expect(promise).resolves.toEqual(expectedAction);
  expect(flux.dispatch).toHaveBeenLastCalledWith(expectedAction);
};

const expectFluxError = async (promise: Promise<unknown>, flux: ReturnType<typeof createFlux>, error: Error, type: string) => {
  await expect(promise).rejects.toThrow(error.message);
  expect(flux.dispatch).toHaveBeenLastCalledWith({error, type});
};

export const resetActionScenarioMocks = () => {
  vi.clearAllMocks();
};

export const runAppActionsScenario = async () => {
  const {createAppActions} = await import('../actions/appActions/appActions.js');
  const flux = createFlux();
  const actions = createAppActions(flux as any);

  await expectFluxAction(actions.add({appId: 'app-1', name: 'App'}), flux, {
    app: makeEntity('apps', 'add'),
    type: 'APP_ADD_ITEM_SUCCESS'
  });
  await expectFluxAction(actions.itemById('app-1'), flux, {
    app: makeEntity('apps', 'itemById'),
    type: 'APP_GET_ITEM_SUCCESS'
  });
  await expectFluxAction(actions.list(), flux, {
    list: listEntity('apps', 'list'),
    type: 'APP_GET_LIST_SUCCESS'
  });
  await expectFluxAction(actions.update({appId: 'app-1', name: 'Updated'}), flux, {
    app: makeEntity('apps', 'update'),
    type: 'APP_UPDATE_ITEM_SUCCESS'
  });
  await expectFluxAction(actions.delete('app-1'), flux, {
    app: makeEntity('apps', 'remove'),
    type: 'APP_REMOVE_ITEM_SUCCESS'
  });
  actions.updateAppAdapter((input) => input);
  actions.updateAppAdapterOptions({strict: true});

  const error = new Error('app failed');
  apiMocks.appMutation.mockRejectedValueOnce(error);
  await expectFluxError(actions.add({appId: 'app-1', name: 'App'}), flux, error, 'APP_ADD_ITEM_ERROR');
};

export const runConnectionActionsScenario = async () => {
  const {createConnectionActions} = await import('../actions/connectionActions/connectionActions.js');
  const actions = createConnectionActions(createFlux() as any);
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  try {
    await expect(actions.addConnection('users' as any, 'user-1', 'posts' as any, 'post-1')).resolves.toBe(true);
    await expect(actions.getConnections('users' as any, 'user-1', 'posts' as any, {connectionType: 'member'}, {cacheTimeout: 5})).resolves.toBeDefined();
    await expect(actions.getConnections('users' as any, 'user-1', undefined, {}, {cacheTimeout: 5})).resolves.toBeDefined();
    await expect(actions.removeConnection('users' as any, 'user-1', 'posts' as any, 'post-1')).resolves.toBe(true);

    apiMocks.appMutation.mockRejectedValueOnce(new Error('connection failed'));
    await expect(actions.addConnection('users' as any, 'user-1', 'posts' as any, 'post-1')).rejects.toThrow('connection failed');

    apiMocks.appQuery.mockRejectedValueOnce(new Error('connection query failed'));
    await expect(actions.getConnections('users' as any, 'user-1')).rejects.toThrow('connection query failed');

    apiMocks.appMutation.mockRejectedValueOnce(new Error('connection remove failed'));
    await expect(actions.removeConnection('users' as any, 'user-1', 'posts' as any, 'post-1')).rejects.toThrow('connection remove failed');
  } finally {
    consoleError.mockRestore();
  }
};

export const runPostActionsScenario = async () => {
  const {createPostActions} = await import('../actions/postActions/postActions.js');
  const actions = createPostActions(createFlux() as any);
  const post = {content: 'hello', latitude: 1, longitude: 2, name: 'Post', postId: 'post-1', tags: [{name: 'tag'}]};

  await expect(actions.add(post)).resolves.toBeDefined();
  await expect(actions.itemById('post-1')).resolves.toBeDefined();
  await expect(actions.itemById('post-1', [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.itemById('post-1', [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByLatest()).resolves.toBeDefined();
  await expect(actions.listByLatest(0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByLatest(0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByLocation(1, 2)).resolves.toBeDefined();
  await expect(actions.listByLocation(1, 2, 0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByLocation(1, 2, 0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByReactions(['like'], 1, 2)).resolves.toBeDefined();
  await expect(actions.listByReactions(['like'], 1, 2, 0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByReactions(['like'], 1, 2, 0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByTags(['tag'], 1, 2)).resolves.toBeDefined();
  await expect(actions.listByTags(['tag'], 1, 2, 0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByTags(['tag'], 1, 2, 0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.update(post)).resolves.toBeDefined();
  await expect(actions.delete('post-1')).resolves.toBeDefined();
  actions.updatePostAdapter((input) => input);
  actions.updatePostAdapterOptions({strict: true});

  apiMocks.appQuery.mockRejectedValueOnce(new Error('post failed'));
  await expect(actions.itemById('post-1')).rejects.toThrow('post failed');
};

export const runReactionActionsScenario = async () => {
  const {createReactionActions} = await import('../actions/reactionActions/reactionActions.js');
  const actions = createReactionActions(createFlux() as any);
  const reaction = {name: 'like', type: 'posts' as const, value: '1'};

  await expect(actions.addReaction('post-1', 'post', reaction)).resolves.toBeDefined();
  await expect(actions.addPersonaReaction('persona-1', 'post-1', 'post', reaction)).resolves.toBeDefined();
  await expect(actions.deleteReaction('post-1', 'post', 'like')).resolves.toBeDefined();
  await expect(actions.deletePersonaReaction('persona-1', 'post-1', 'post', 'like')).resolves.toBeDefined();
  await expect(actions.getReactionCount('post-1', 'post', 'like')).resolves.toBeDefined();
  await expect(actions.hasReaction('post-1', 'post', 'like', 'up')).resolves.toBeDefined();
  await expect(actions.hasPersonaReaction('persona-1', 'post-1', 'post', 'like')).resolves.toBeDefined();
  expect(actions.abbreviateCount(1200)).toBe('1.2k');
  actions.updateReactionAdapter((input) => input);
  actions.updateReactionAdapterOptions({strict: true});
};

export const runVideoActionsScenario = async () => {
  const {createVideoActions} = await import('../actions/videoActions/videoActions.js');
  const actions = createVideoActions(createFlux() as any);
  const video = {itemId: 'post-1', itemType: 'post', name: 'Video', videoId: 'video-1'};

  await expect(actions.add(video)).resolves.toBeDefined();
  await expect(actions.getVideoById('video-1')).resolves.toBeDefined();
  await expect(actions.getVideoById('video-1', [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.getVideoById('video-1', [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.createMultipartUpload(video, 1)).resolves.toBeDefined();
  await expect(actions.getMultipartUploadPartUrls('video-1', 'upload-1', [1])).resolves.toBeDefined();
  await expect(actions.completeMultipartUpload('video-1', 'upload-1', [{etag: 'etag-1', partNumber: 1} as any])).resolves.toBeDefined();
  await expect(actions.abortMultipartUpload('video-1', 'upload-1')).resolves.toBeDefined();
  await expect(actions.list()).resolves.toBeDefined();
  await expect(actions.list(0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.list(0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByItem('post-1')).resolves.toBeDefined();
  await expect(actions.listByItem('post-1', 0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByItem('post-1', 0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByReactions(['like'])).resolves.toBeDefined();
  await expect(actions.listByReactions(['like'], 0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByReactions(['like'], 0, 10, [], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.update(video)).resolves.toBeDefined();
  await expect(actions.delete('video-1')).resolves.toBeDefined();
  actions.updateVideoAdapter((input) => input);
  actions.updateVideoAdapterOptions({strict: true});

  apiMocks.appMutation.mockRejectedValueOnce(new Error('video failed'));
  await expect(actions.update(video)).rejects.toThrow('video failed');

  apiMocks.appMutation.mockRejectedValueOnce(new Error('multipart failed'));
  await expect(actions.getMultipartUploadPartUrls('video-1', 'upload-1', [1])).rejects.toThrow('multipart failed');
};

export const runGroupActionsScenario = async () => {
  const {createGroupActions} = await import('../actions/groupActions/groupActions.js');
  const actions = createGroupActions(createFlux() as any);
  const group = {description: 'Group', groupId: 'group-1', name: 'Group'};

  await expect(actions.add(group)).resolves.toBeDefined();
  await expect(actions.itemById('group-1')).resolves.toBeDefined();
  await expect(actions.listByLatest()).resolves.toBeDefined();
  await expect(actions.update(group)).resolves.toBeDefined();
  await expect(actions.delete('group-1')).resolves.toBeDefined();
  actions.updateGroupAdapter((input) => input);
  actions.updateGroupAdapterOptions({strict: true});

  apiMocks.appQuery.mockRejectedValueOnce(new Error('group failed'));
  await expect(actions.itemById('group-1')).rejects.toThrow('group failed');
};

export const runConversationActionsScenario = async () => {
  const {createConversationActions} = await import('../actions/conversationActions/conversationActions.js');
  const actions = createConversationActions(createFlux() as any);
  const conversation = {conversationId: 'conversation-1', name: 'Conversation', type: 'direct'};

  await expect(actions.add(conversation)).resolves.toBeDefined();
  await expect(actions.itemById('conversation-1')).resolves.toBeDefined();
  await expect(actions.list()).resolves.toBeDefined();
  await expect(actions.update(conversation)).resolves.toBeDefined();
  await expect(actions.delete('conversation-1')).resolves.toBeDefined();
  actions.updateConversationAdapter((input) => input);
  actions.updateConversationAdapterOptions({strict: true});

  apiMocks.appQuery.mockRejectedValueOnce(new Error('conversation failed'));
  await expect(actions.list()).rejects.toThrow('conversation failed');
};

export const runEventActionsScenario = async () => {
  const {createEventActions} = await import('../actions/eventActions/eventActions.js');
  const actions = createEventActions(createFlux() as any);
  const event = {description: 'Event', eventId: 'event-1', name: 'Event', tags: [{name: 'music'}]};

  await expect(actions.addEvent(event)).resolves.toBeDefined();
  await expect(actions.getEvent('event-1')).resolves.toBeDefined();
  await expect(actions.getEventsByTags(['music'], 1, 2)).resolves.toBeDefined();
  await expect(actions.getEventsByReactions(['like'], 1, 2)).resolves.toBeDefined();
  await expect(actions.rsvpEvent({eventId: 'event-1', status: 'going'} as any)).resolves.toBeDefined();
  await expect(actions.updateEvent(event)).resolves.toBeDefined();
  await expect(actions.deleteEvent('event-1')).resolves.toBeDefined();
  actions.updateEventAdapter((input) => input);
  actions.updateEventAdapterOptions({strict: true});

  apiMocks.appMutation.mockRejectedValueOnce(new Error('event failed'));
  await expect(actions.updateEvent(event)).rejects.toThrow('event failed');
};

export const runLocationActionsScenario = async () => {
  const {createLocationActions} = await import('../actions/locationActions/locationActions.js');
  const actions = createLocationActions(createFlux() as any);
  const location = {address: '123 Main', itemId: 'event-1', latitude: 1, locationId: 'location-1', longitude: 2};

  await expect(actions.autocompleteLocation('123 Main', 1, 2)).resolves.toBeDefined();
  await expect(actions.add(location)).resolves.toBeDefined();
  await expect(actions.getGoogleLocation('123 Main')).resolves.toBeDefined();
  await expect(actions.getLocation(location)).resolves.toBeDefined();
  await expect(actions.listByItem('event-1')).resolves.toBeDefined();
  await expect(actions.update(location)).resolves.toBeDefined();
  await expect(actions.delete('location-1')).resolves.toBeDefined();
  actions.updateLocationAdapter((input) => input);
  actions.updateLocationAdapterOptions({strict: true});

  apiMocks.appMutation.mockRejectedValueOnce(new Error('location failed'));
  await expect(actions.update(location)).rejects.toThrow('location failed');
};

export const runPermissionActionsScenario = async () => {
  const {createPermissionActions} = await import('../actions/permissionActions/permissionActions.js');
  const actions = createPermissionActions(createFlux() as any);
  const permission = {level: 1, name: 'Read', permissionId: 'permission-1', resource: 'posts', userId: 'user-1'};

  await expect(actions.add(permission)).resolves.toBeDefined();
  await expect(actions.check('user-1', 'posts', 'read')).resolves.toBeDefined();
  await expect(actions.itemById('permission-1')).resolves.toBeDefined();
  await expect(actions.list()).resolves.toBeDefined();
  await expect(actions.listByUser('user-1')).resolves.toBeDefined();
  await expect(actions.update(permission)).resolves.toBeDefined();
  await expect(actions.remove('permission-1')).resolves.toBeDefined();
  actions.updatePermissionAdapter((input) => input);
  actions.updatePermissionAdapterOptions({strict: true});
};

export const runSubscriptionActionsScenario = async () => {
  const {createSubscriptionActions} = await import('../actions/subscriptionActions/subscriptionActions.js');
  const actions = createSubscriptionActions(createFlux() as any);
  const plan = {amount: 100, interval: 'month', intervalCount: 1, itemId: 'persona-1', itemType: 'personas', name: 'Plan'};
  const subscription = {itemId: 'persona-1', itemType: 'personas', planId: 'plan-1', userId: 'user-1'};

  await expect(actions.addPlan(plan)).resolves.toBeDefined();
  await expect(actions.getPlanByItem('persona-1')).resolves.toBeDefined();
  await expect(actions.addSubscription(subscription)).resolves.toBeDefined();
  await expect(actions.getSubscriptionByItem('persona-1')).resolves.toBeDefined();
  await expect(actions.getSubscriptionListByUser('user-1')).resolves.toBeDefined();
  await expect(actions.deleteSubscription('persona-1')).resolves.toBeDefined();

  apiMocks.appMutation.mockRejectedValueOnce(new Error('subscription failed'));
  await expect(actions.addPlan(plan)).rejects.toThrow('subscription failed');
};

export const runTagActionsScenario = async () => {
  const {createTagActions} = await import('../actions/tagActions/tagActions.js');
  const actions = createTagActions(createFlux() as any);
  const tag = {itemId: 'post-1', itemType: 'posts', name: 'tag', tagId: 'tag-1'};

  await expect(actions.addTag(tag)).resolves.toBeDefined();
  await expect(actions.addTagToItem('tag-1', 'post-1', 'posts')).resolves.toBeDefined();
  await expect(actions.getTags()).resolves.toBeDefined();
  await expect(actions.getTagsByItem('post-1', 'posts')).resolves.toBeDefined();
  await expect(actions.updateTag(tag)).resolves.toBeDefined();
  await expect(actions.deleteTagFromItem('tag-1', 'post-1', 'posts')).resolves.toBeDefined();
  await expect(actions.deleteTag('tag-1')).resolves.toBeDefined();
  actions.updateTagAdapter((input) => input);
  actions.updateTagAdapterOptions({strict: true});

  apiMocks.appQuery.mockRejectedValueOnce(new Error('tag list failed'));
  await expect(actions.getTags('tag')).rejects.toThrow('tag list failed');

  apiMocks.appMutation.mockRejectedValueOnce(new Error('tag update failed'));
  await expect(actions.updateTag(tag)).rejects.toThrow('tag update failed');
};

export const runImageActionsScenario = async () => {
  const {createImageActions} = await import('../actions/imageActions/imageActions.js');
  const actions = createImageActions(createFlux() as any);
  const image = {imageId: 'image-1', itemId: 'post-1', itemType: 'posts', src: 'https://example.com/image.jpg'};

  await expect(actions.getImageById('image-1')).resolves.toBeDefined();
  await expect(actions.countByItem('post-1')).resolves.toBeDefined();
  await expect(actions.listByItem('post-1', 'posts')).resolves.toBeDefined();
  await expect(actions.listByReactions(['like'])).resolves.toBeDefined();
  await expect(actions.listByPersonaReactions('persona-1', ['like'])).resolves.toBeDefined();
  await expect(actions.add(image)).resolves.toBeDefined();
  await expect(actions.update({...image, description: 'Updated'})).resolves.toBeDefined();
  await expect(actions.delete('image-1')).resolves.toBeDefined();

  apiMocks.appQuery.mockRejectedValueOnce(new Error('image failed'));
  await expect(actions.getImageById('image-1')).rejects.toThrow('image failed');
};

export const runMessageActionsScenario = async () => {
  const {createMessageActions} = await import('../actions/messageActions/messageActions.js');
  const actions = createMessageActions(createFlux() as any);
  const message = {content: 'Hello', conversationId: 'conversation-1', messageId: 'message-1'};

  await expect(actions.sendMessage(message)).resolves.toBeDefined();
  await expect(actions.getDirectConversation('user-1')).resolves.toBeDefined();
  await expect(actions.getMessages('conversation-1')).resolves.toBeDefined();
  await expect(actions.getConversations()).resolves.toBeDefined();
  actions.updateMessageAdapter((input) => input);
  actions.updateMessageAdapterOptions({strict: true});
};

export const runContentActionsScenario = async () => {
  const {createContentActions} = await import('../actions/contentActions/contentActions.js');
  const actions = createContentActions(createFlux() as any);
  const content = {content: 'Body', contentId: 'content-1', key: 'welcome', locale: 'en'};

  await expect(actions.list()).resolves.toBeDefined();
  await expect(actions.list(['description'], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.list(['description'], {cacheTimeout: 5})).resolves.toBeDefined();
  await expect(actions.listByCategory('docs')).resolves.toBeDefined();
  await expect(actions.itemById('content-1')).resolves.toBeDefined();
  await expect(actions.itemByKey('welcome', 'en')).resolves.toBeDefined();
  await expect(actions.add(content)).resolves.toBeDefined();
  await expect(actions.update(content)).resolves.toBeDefined();
  await expect(actions.delete('content-1')).resolves.toBeDefined();

  apiMocks.appMutation.mockRejectedValueOnce(new Error('content failed'));
  await expect(actions.add(content)).rejects.toThrow('content failed');
};

export const runTranslationActionsScenario = async () => {
  const {createTranslationActions} = await import('../actions/translationActions/translationActions.js');
  const actions = createTranslationActions(createFlux() as any);

  await expect(actions.addTranslations([{key: 'welcome', locale: 'en', value: 'Welcome'}])).resolves.toBeDefined();
  expect(actions.getTranslation('welcome', 'en', 'common')).toBe('Welcome');
  await expect(actions.getTranslations(['welcome'], 'en', 'common')).resolves.toBeDefined();
  expect(actions.hasTranslation('welcome', 'en', 'common')).toBe(true);
  actions.queueTranslationKey('headline', 'en', 'common');
  await expect(actions.processPendingTranslations('en', 'common')).resolves.toBeUndefined();
  actions.updateTranslationAdapter((input) => input);
  actions.updateTranslationAdapterOptions({strict: true});

  apiMocks.appQuery.mockRejectedValueOnce(new Error('translation failed'));
  await expect(actions.getTranslations(['welcome'], 'en', 'common')).rejects.toThrow('translation failed');
};

export const runPersonaActionsScenario = async () => {
  const {createPersonaActions} = await import('../actions/personaActions/personaActions.js');
  const actions = createPersonaActions(createFlux() as any);
  const persona = {name: 'Persona', personaId: 'persona-1', tags: [{name: 'creator'}]};

  await expect(actions.addPersona(persona)).resolves.toBeDefined();
  await expect(actions.getPersonaById('persona-1')).resolves.toBeDefined();
  await expect(actions.getPersonaListByIds(['persona-1'])).resolves.toBeDefined();
  await expect(actions.listByTags(['creator'])).resolves.toBeDefined();
  await expect(actions.listByRelation('follow' as any)).resolves.toBeDefined();
  await expect(actions.followPersona('persona-2')).resolves.toBeDefined();
  await expect(actions.unfollowPersona('persona-2')).resolves.toBeDefined();
  await expect(actions.blockPersona('persona-2')).resolves.toBeDefined();
  await expect(actions.unblockPersona('persona-2')).resolves.toBeDefined();
  await expect(actions.updatePersona(persona)).resolves.toBeDefined();
  await expect(actions.deletePersona('persona-1')).resolves.toBeDefined();
  actions.updatePersonaAdapter((input) => input);
  actions.updatePersonaAdapterOptions({strict: true});

  apiMocks.appQuery.mockRejectedValueOnce(new Error('persona failed'));
  await expect(actions.getPersonaById('persona-1')).rejects.toThrow('persona failed');
};

export const runUserActionsScenario = async () => {
  const {createUserActions} = await import('../actions/userActions/userActions.js');
  const actions = createUserActions(createFlux() as any);
  const user = {email: 'user@example.com', password: 'secret123', phone: '15551234567', userId: 'user-1', username: 'user'};

  await expect(actions.addUser(user)).resolves.toBeDefined();
  await expect(actions.signUp(user)).resolves.toBeDefined();
  await expect(actions.updateUser(user)).resolves.toBeDefined();
  await expect(actions.confirmCode('123456', 'email')).resolves.toBeDefined();
  await expect(actions.remove('user-1')).resolves.toBeDefined();
  await expect(actions.session()).rejects.toThrow('invalid_session');
  await expect(actions.itemById('user-1')).resolves.toBeDefined();
  await expect(actions.getUserByAttribute('email', 'user@example.com')).resolves.toBeDefined();
  await expect(actions.saveBillingCard('tok_123' as any)).resolves.toBeDefined();
  await expect(actions.deleteBillingCard()).resolves.toBeDefined();
  await expect(actions.updatePlan('plan-1')).resolves.toBeDefined();
  await expect(actions.list()).resolves.toBeDefined();
  await expect(actions.listByLatest()).resolves.toBeDefined();
  await expect(actions.listByConnection('follow' as any)).resolves.toBeDefined();
  await expect(actions.listByReactions(['like'])).resolves.toBeDefined();
  await expect(actions.listByTags(['creator'])).resolves.toBeDefined();
  await expect(actions.search('user')).resolves.toBeDefined();
  expect(actions.isLoggedIn()).toBe(false);
  await expect(actions.currentAuthenticatedUser()).resolves.toBeDefined();
  await expect(actions.currentUser()).resolves.toBeDefined();
  await expect(actions.refreshSession('token-1', 15)).resolves.toBeDefined();
  await expect(actions.signIn({password: 'secret123', username: 'user'})).resolves.toBeDefined();
  await expect(actions.signOut()).resolves.toBeDefined();
  await expect(actions.confirmSignUp('123456', 'email')).resolves.toBeDefined();
  await expect(actions.forgotPassword('user')).resolves.toBeDefined();
  await expect(actions.sendVerificationEmail('user@example.com')).resolves.toBeDefined();
  await expect(actions.resetPassword('user', '123456', 'secret123')).resolves.toBeDefined();
  await expect(actions.updatePassword('secret123', 'secret456')).resolves.toBe(true);
  actions.updateUserAdapter((input) => input);
  actions.updateUserAdapterOptions({strict: true});
};
