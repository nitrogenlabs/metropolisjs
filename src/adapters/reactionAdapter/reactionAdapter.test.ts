import {formatReactionOutput, parseReaction, ReactionValidationError, validateReactionInput} from './reactionAdapter';

describe('reactionAdapter', () => {
  describe('validateReactionInput', () => {
    it('should validate valid reaction input', () => {
      const validReaction = {
        reactionId: 'reaction1',
        type: 'images',
        userId: 'user1',
        itemId: 'post1',
        itemType: 'post'
      };

      const result = validateReactionInput(validReaction);
      expect(result).toEqual(validReaction);
    });

    it('should handle minimal reaction input', () => {
      const minimalReaction = {
        reactionId: 'reaction1',
        type: 'images'
      };

      const result = validateReactionInput(minimalReaction);
      expect(result).toEqual(minimalReaction);
    });

    it('should throw ReactionValidationError for invalid input', () => {
      const invalidReaction = {
        reactionId: 'reaction1'
      } as unknown;

      expect(() => validateReactionInput(invalidReaction)).toThrow(Error);
    });

    it('should handle additional properties', () => {
      const reactionWithExtra = {
        reactionId: 'react123',
        type: 'images',
        customField: 'value'
      };

      const result = validateReactionInput(reactionWithExtra);
      expect(result).toEqual(reactionWithExtra);
    });
  });

  describe('parseReaction', () => {
    it('should parse reaction with all fields', () => {
      const reaction = {
        _id: 'reactions/reaction1',
        _key: 'reaction1',
        reactionId: 'reaction1',
        type: 'images',
        userId: 'user1',
        user: {userId: 'user1', username: 'reactor'},
        postId: 'post1',
        post: {postId: 'post1', content: 'Test post'},
        messageId: 'message1',
        message: {messageId: 'message1', content: 'Test message'},
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parseReaction(reaction);
      expect(result.reactionId).toBe('reaction1');
      expect(result.type).toBe('images');
      expect(result.userId).toBe('user1');
      expect(result.user).toBeDefined();
      expect(result.postId).toBe('post1');
      expect(result.post).toBeDefined();
      expect(result.messageId).toBe('message1');
      expect(result.message).toBeDefined();
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('should handle reaction with minimal fields', () => {
      const minimalReaction = {
        reactionId: 'reaction1',
        type: 'images'
      };

      const result = parseReaction(minimalReaction);
      expect(result.reactionId).toBe('reaction1');
      expect(result.type).toBe('images');
      expect(result.userId).toBeUndefined();
      expect(result.itemId).toBeUndefined();
    });

    it('should parse ArangoDB fields correctly', () => {
      const reaction = {
        _id: 'reactions/reaction1',
        _key: 'reaction1',
        reactionId: 'reaction1',
        type: 'images'
      };

      const result = parseReaction(reaction);
      expect(result.id).toBe('reactions/reaction1');
      expect(result.reactionId).toBe('reaction1');
    });

    it('should handle numeric fields', () => {
      const reaction = {
        reactionId: 'reaction1',
        type: 'images',
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parseReaction(reaction);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('formats reactions and parses display fields', () => {
      const result = parseReaction({
        id: 'reactions/reaction-1',
        name: 'Like',
        reactionId: 'reaction-1',
        type: 'images',
        value: 'heart'
      });

      expect(formatReactionOutput(result)).toBe(result);
      expect(result).toEqual(expect.objectContaining({
        id: 'reactions/reaction1',
        name: 'Like',
        reactionId: 'reaction1',
        value: 'heart'
      }));
    });

    it('wraps unexpected parse errors', () => {
      expect(() => parseReaction(null as any)).toThrow(ReactionValidationError);
    });
  });

  describe('ReactionValidationError', () => {
    it('should create error with message', () => {
      const error = new ReactionValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ReactionValidationError');
    });

    it('should create error with field', () => {
      const error = new ReactionValidationError('Test error', 'testField');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
    });
  });
});
