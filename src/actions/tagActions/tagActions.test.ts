import {beforeEach, describe, expect, it, vi} from 'vitest';

const appQueryMock = vi.fn();
const appMutationMock = vi.fn();

vi.mock('../../utils/api.js', () => ({
  appMutation: appMutationMock,
  appQuery: appQueryMock
}));

const {createTagActions} = await import('./tagActions.js');

const createMockFlux = () => ({
  dispatch: vi.fn(async (payload) => payload),
  getState: vi.fn((key: string, fallback?: unknown) => {
    if(key === 'tag.list') {
      return fallback ?? [];
    }

    if(key === 'tag.expires') {
      return 0;
    }

    return fallback;
  })
});

describe('createTagActions', () => {
  beforeEach(() => {
    appMutationMock.mockReset();
    appQueryMock.mockReset();
  });

  it('uses the second argument for requested tag fields', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appQueryMock.mockResolvedValue([]);

    await tagActions.getTags('', ['description']);

    expect(appQueryMock).toHaveBeenCalledWith(
      flux,
      'getTags',
      'tags',
      {},
      ['added', 'category', 'description', 'modified', 'name', 'tagId'],
      expect.any(Object)
    );
  });

  it('passes an optional string searchQuery when provided', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appQueryMock.mockResolvedValue([]);

    await tagActions.getTags('tech', ['description']);

    expect(appQueryMock).toHaveBeenCalledWith(
      flux,
      'getTags',
      'tags',
      {
        searchQuery: {
          type: 'String',
          value: 'tech'
        }
      },
      ['added', 'category', 'description', 'modified', 'name', 'tagId'],
      expect.any(Object)
    );
  });

  it('passes through additional requested tag fields', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appQueryMock.mockResolvedValue([]);

    await tagActions.getTags('', ['personaCount', 'userId']);

    expect(appQueryMock).toHaveBeenCalledWith(
      flux,
      'getTags',
      'tags',
      {},
      ['added', 'category', 'description', 'modified', 'name', 'tagId', 'personaCount', 'userId'],
      expect.any(Object)
    );
  });

  it('queries tags by item doc id', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appQueryMock.mockResolvedValue([]);

    await tagActions.getTagsByItem('personas/persona123', ['userId']);

    expect(appQueryMock).toHaveBeenCalledWith(
      flux,
      'getTagsByItem',
      'tags',
      {
        itemDocId: {
          type: 'ID!',
          value: 'personas/persona123'
        }
      },
      ['added', 'category', 'description', 'modified', 'name', 'tagId', 'userId'],
      expect.any(Object)
    );
  });

  it('returns the extracted tag list for getTagsByItem', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);
    const response = {
      tags: {
        getTagsByItem: [
          {name: 'Boobs', tagId: '1'},
          {name: 'Legs', tagId: '2'}
        ]
      }
    };

    appQueryMock.mockImplementation(async (_flux, _name, _type, _variables, _props, options) => (
      options?.onSuccess ? options.onSuccess(response) : response
    ));

    const result = await tagActions.getTagsByItem('personas/persona123');

    expect(result).toEqual({
      tags: response.tags.getTagsByItem,
      type: 'TAG_GET_LIST_SUCCESS'
    });
  });

  it('uses addTagToItem with a full item doc id', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appMutationMock.mockResolvedValue({tagId: 'alpha', name: 'Alpha'});

    await tagActions.addTagToItem('alpha', 'personas/persona123', ['userId']);

    expect(appMutationMock).toHaveBeenCalledWith(
      flux,
      'addTagToItem',
      'tags',
      {
        itemDocId: {
          type: 'ID!',
          value: 'personas/persona123'
        },
        tagId: {
          type: 'ID!',
          value: 'alpha'
        }
      },
      ['added', 'category', 'description', 'modified', 'name', 'tagId', 'userId'],
      expect.any(Object)
    );
  });

  it('uses deleteTagFromItem with a full item doc id', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appMutationMock.mockResolvedValue(true);

    await tagActions.deleteTagFromItem('alpha', 'personas/persona123');

    expect(appMutationMock).toHaveBeenCalledWith(
      flux,
      'deleteTagFromItem',
      'tags',
      {
        itemDocId: {
          type: 'ID!',
          value: 'personas/persona123'
        },
        tagId: {
          type: 'ID!',
          value: 'alpha'
        }
      },
      [],
      expect.any(Object)
    );
  });

  it('uses an ID tag variable when deleting a tag', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appMutationMock.mockResolvedValue({name: 'Alpha'});

    await tagActions.deleteTag('alpha');

    expect(appMutationMock).toHaveBeenCalledWith(
      flux,
      'deleteTag',
      'tags',
      {
        tagId: {
          type: 'ID!',
          value: 'alpha'
        }
      },
      ['added', 'category', 'description', 'modified', 'name'],
      expect.any(Object)
    );
  });

  it('dispatches the original tagId after a delete mutation succeeds', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appMutationMock.mockImplementation(async (_flux, _name, _type, _variables, _fields, options) => options.onSuccess({
      tags: {
        deleteTag: {
          name: 'Alpha'
        }
      }
    }));

    await tagActions.deleteTag('alpha');

    expect(flux.dispatch).toHaveBeenCalledWith({
      tag: {
        name: 'Alpha',
        tagId: 'alpha'
      },
      type: 'TAG_REMOVE_ITEM_SUCCESS'
    });
  });

  it('returns cached tags only when no search filter is used', async () => {
    const cachedTags = [{tagId: '1', name: 'alpha'}];
    const flux = {
      dispatch: vi.fn(async (payload) => payload),
      getState: vi.fn((key: string, fallback?: unknown) => {
        if(key === 'tag.list') {
          return cachedTags;
        }

        if(key === 'tag.expires') {
          return Date.now() + 60_000;
        }

        return fallback;
      })
    };
    const tagActions = createTagActions(flux as any);

    const result = await tagActions.getTags();

    expect(result).toEqual(cachedTags);
    expect(appQueryMock).not.toHaveBeenCalled();
  });

  it('treats an empty string search query as fetch-all', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appQueryMock.mockResolvedValue([]);

    await tagActions.getTags('', ['description'], {forceRefresh: true});

    expect(appQueryMock).toHaveBeenCalledWith(
      flux,
      'getTags',
      'tags',
      {},
      ['added', 'category', 'description', 'modified', 'name', 'tagId'],
      expect.any(Object)
    );
  });

  it('bypasses cache when a search filter is used', async () => {
    const cachedTags = [{tagId: '1', name: 'alpha'}];
    const flux = {
      dispatch: vi.fn(async (payload) => payload),
      getState: vi.fn((key: string, fallback?: unknown) => {
        if(key === 'tag.list') {
          return cachedTags;
        }

        if(key === 'tag.expires') {
          return Date.now() + 60_000;
        }

        return fallback;
      })
    };
    const tagActions = createTagActions(flux as any);

    appQueryMock.mockResolvedValue([]);

    await tagActions.getTags('alp');

    expect(appQueryMock).toHaveBeenCalled();
  });
});
