import {formatPostOutput, parsePost, PostValidationError, validatePostInput} from './postAdapter';

describe('postAdapter', () => {
  describe('validatePostInput', () => {
    it('should validate valid post input', () => {
      const validPost = {
        postId: 'post1',
        content: 'This is a test post',
        type: 'text',
        userId: 'user1',
        latitude: 40.7128,
        longitude: -74.0060
      };

      const result = validatePostInput(validPost);
      expect(result).toEqual(validPost);
    });

    it('should handle minimal post input', () => {
      const minimalPost = {
        postId: 'post1',
        content: 'Test post'
      };

      const result = validatePostInput(minimalPost);
      expect(result).toEqual(minimalPost);
    });

    it('should throw PostValidationError for invalid input', () => {
      const invalidPost = {
        content: 123,
        postId: 456
      } as unknown;

      expect(() => validatePostInput(invalidPost)).toThrow(Error);
    });

    it('should handle additional properties', () => {
      const postWithExtra = {
        postId: 'post1',
        content: 'Test post',
        customField: 'value'
      };

      const result = validatePostInput(postWithExtra);
      expect(result).toEqual(postWithExtra);
    });
  });

  describe('parsePost', () => {
    it('should parse post with all fields', () => {
      const post = {
        _id: 'posts/post1',
        _key: 'post1',
        postId: 'post1',
        content: 'This is a test post',
        type: 'text',
        userId: 'user1',
        user: {userId: 'user1', username: 'author'},
        location: 'location1',
        tags: ['tech', 'news'],
        images: [{imageId: 'image1', url: 'image.jpg'}],
        shared: true,
        featured: false,
        latitude: 40.7128,
        longitude: -74.0060,
        viewCount: 100,
        commentCount: 50,
        likeCount: 25,
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parsePost(post);
      expect(result.postId).toBe('post1');
      expect(result.content).toBe('This is a test post');
      expect(result.type).toBe('text');
      expect(result.userId).toBe('user1');
      expect(result.user).toBeDefined();
      expect(result.location).toBe('location1');
      expect(result.tags).toBeDefined();
      expect(result.images).toBeDefined();
      expect(result.shared).toBe(true);
      expect(result.featured).toBe(false);
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
      expect(result.viewCount).toBe(100);
      expect(result.commentCount).toBe(50);
      expect(result.likeCount).toBe(25);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('should handle post with minimal fields', () => {
      const minimalPost = {
        postId: 'post1',
        content: 'Test post'
      };

      const result = parsePost(minimalPost);
      expect(result.postId).toBe('post1');
      expect(result.content).toBe('Test post');
      expect(result.type).toBeUndefined();
      expect(result.userId).toBeUndefined();
    });

    it('should parse ArangoDB fields correctly', () => {
      const post = {
        _id: 'posts/post1',
        _key: 'post1',
        postId: 'post1',
        content: 'This is a test post'
      };

      const result = parsePost(post);
      expect(result.id).toBe('posts/post1');
      expect(result.postId).toBe('post1');
    });

    it('should handle boolean fields', () => {
      const post = {
        postId: 'post1',
        content: 'Test post',
        shared: true,
        featured: false
      };

      const result = parsePost(post);
      expect(result.shared).toBe(true);
      expect(result.featured).toBe(false);
    });

    it('should handle numeric fields', () => {
      const post = {
        postId: 'post1',
        content: 'Test post',
        latitude: 40.7128,
        longitude: -74.0060,
        viewCount: 100,
        commentCount: 50,
        likeCount: 25,
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parsePost(post);
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
      expect(result.viewCount).toBe(100);
      expect(result.commentCount).toBe(50);
      expect(result.likeCount).toBe(25);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('parses relational, date, file, privacy, and tag fields', () => {
      const post = {
        _id: 'posts/post-1',
        _key: 'post-1',
        content: 'Body',
        endDate: 2000,
        files: [{fileId: 'file-1', name: 'file.txt'}],
        groupId: 'groups/group-1',
        location: 'Austin',
        name: 'Post',
        parentId: 'posts/parent-1',
        privacy: 'private',
        startDate: 1000,
        tags: [{tagId: 'tag-1', name: 'Alpha'}],
        type: 'status',
        userId: 'users/user-1'
      };

      const result = parsePost(post);

      expect(result).toEqual(expect.objectContaining({
        groupId: 'groupsgroup1',
        id: 'posts/post1',
        location: 'Austin',
        parentId: 'postsparent1',
        postId: 'post1',
        privacy: 'private',
        type: 'status',
        userId: 'usersuser1'
      }));
      expect(result.files).toHaveLength(1);
      expect(result.tags).toHaveLength(1);
      expect(formatPostOutput(result)).toBe(result);
    });

    it('wraps unexpected parse errors', () => {
      expect(() => parsePost(null as any)).toThrow(PostValidationError);
    });
  });

  describe('PostValidationError', () => {
    it('should create error with message', () => {
      const error = new PostValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('PostValidationError');
    });

    it('should create error with field', () => {
      const error = new PostValidationError('Test error', 'testField');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
    });
  });
});
