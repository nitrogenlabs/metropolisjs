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

  it('supports the existing getTags(tagProps) call shape', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appQueryMock.mockResolvedValue([]);

    await tagActions.getTags(['description']);

    expect(appQueryMock).toHaveBeenCalledWith(
      flux,
      'getTags',
      'tags',
      {},
      ['added', 'category', 'description', 'id', 'modified', 'name', 'tagId'],
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
      ['added', 'category', 'description', 'id', 'modified', 'name', 'tagId'],
      expect.any(Object)
    );
  });

  it('passes through additional requested tag fields', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appQueryMock.mockResolvedValue([]);

    await tagActions.getTags(['profileCount', 'userId']);

    expect(appQueryMock).toHaveBeenCalledWith(
      flux,
      'getTags',
      'tags',
      {},
      ['added', 'category', 'description', 'id', 'modified', 'name', 'tagId', 'profileCount', 'userId'],
      expect.any(Object)
    );
  });

  it('uses addTagToItem with a full item doc id', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appMutationMock.mockResolvedValue({tagId: 'alpha', name: 'Alpha'});

    await tagActions.addTagToItem('alpha', 'profiles/profile123', ['userId']);

    expect(appMutationMock).toHaveBeenCalledWith(
      flux,
      'addTagToItem',
      'tags',
      {
        itemDocId: {
          type: 'String!',
          value: 'profiles/profile123'
        },
        tagId: {
          type: 'String!',
          value: 'alpha'
        }
      },
      ['added', 'category', 'description', 'id', 'modified', 'name', 'tagId', 'userId'],
      expect.any(Object)
    );
  });

  it('uses deleteTagFromItem with a full item doc id', async () => {
    const flux = createMockFlux();
    const tagActions = createTagActions(flux as any);

    appMutationMock.mockResolvedValue(true);

    await tagActions.deleteTagFromItem('alpha', 'profiles/profile123');

    expect(appMutationMock).toHaveBeenCalledWith(
      flux,
      'deleteTagFromItem',
      'tags',
      {
        itemDocId: {
          type: 'String!',
          value: 'profiles/profile123'
        },
        tagId: {
          type: 'String!',
          value: 'alpha'
        }
      },
      [],
      expect.any(Object)
    );
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
