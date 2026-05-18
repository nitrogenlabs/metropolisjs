import {
  ConversationValidationError,
  formatConversationOutput,
  parseConversation,
  validateConversationInput
} from './conversationAdapter';

describe('conversationAdapter', () => {
  describe('validateConversationInput', () => {
    it('should validate valid conversation input', () => {
      const validConversation = {
        conversationId: 'conversation1',
        type: 'direct',
        participants: ['user1', 'user2'],
        lastMessage: 'Hello there!'
      };

      const result = validateConversationInput(validConversation);
      expect(result).toEqual(validConversation);
    });

    it('should handle minimal conversation input', () => {
      const minimalConversation = {
        conversationId: 'conversation1',
        type: 'direct'
      };

      const result = validateConversationInput(minimalConversation);
      expect(result).toEqual(minimalConversation);
    });

    it('should throw ConversationValidationError for invalid input', () => {
      const invalidConversation = {
        conversationId: 'conversation1'
      } as unknown;

      expect(() => validateConversationInput(invalidConversation)).toThrow(Error);
    });

    it('should handle additional properties', () => {
      const conversationWithExtra = {
        conversationId: 'conversation1',
        type: 'direct',
        customField: 'value'
      };

      const result = validateConversationInput(conversationWithExtra);
      expect(result).toEqual(conversationWithExtra);
    });
  });

  describe('parseConversation', () => {
    it('should parse conversation with all fields', () => {
      const conversation = {
        _id: 'conversations/conversation1',
        _key: 'conversation1',
        conversationId: 'conversation1',
        type: 'direct',
        participants: ['user1', 'user2'],
        lastMessage: 'Hello there!',
        lastMessageAt: 1234567890,
        unreadCount: 5,
        active: true,
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parseConversation(conversation);
      expect(result.conversationId).toBe('conversation1');
      expect(result.type).toBe('direct');
      expect(result.participants).toEqual(['user1', 'user2']);
      expect(result.lastMessage).toBe('Hello there!');
      expect(result.lastMessageAt).toBe(1234567890);
      expect(result.unreadCount).toBe(5);
      expect(result.active).toBe(true);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('should handle conversation with minimal fields', () => {
      const minimalConversation = {
        conversationId: 'conversation1',
        type: 'direct'
      };

      const result = parseConversation(minimalConversation);
      expect(result.conversationId).toBe('conversation1');
      expect(result.type).toBe('direct');
      expect(result.participants).toBeUndefined();
      expect(result.lastMessage).toBeUndefined();
    });

    it('should parse ArangoDB fields correctly', () => {
      const conversation = {
        _id: 'conversations/conversation1',
        _key: 'conversation1',
        conversationId: 'conversation1',
        type: 'direct'
      };

      const result = parseConversation(conversation);
      expect(result.id).toBe('conversations/conversation1');
      expect(result.conversationId).toBe('conversation1');
    });

    it('should handle boolean fields', () => {
      const conversation = {
        conversationId: 'conversation1',
        type: 'direct',
        active: true
      };

      const result = parseConversation(conversation);
      expect(result.active).toBe(true);
    });

    it('should handle numeric fields', () => {
      const conversation = {
        conversationId: 'conversation1',
        type: 'direct',
        lastMessageAt: 1234567890,
        unreadCount: 5,
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parseConversation(conversation);
      expect(result.lastMessageAt).toBe(1234567890);
      expect(result.unreadCount).toBe(5);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('formats conversations and parses direct users', () => {
      const conversation = {
        id: 'conversations/conversation-1',
        isDirect: true,
        name: 'Direct chat',
        type: 'direct',
        users: [
          {
            userId: 'user-1',
            username: 'sender'
          }
        ]
      };
      const result = parseConversation(conversation);

      expect(formatConversationOutput(result)).toBe(result);
      expect(result.id).toBe('conversations/conversation1');
      expect(result.conversationId).toBeUndefined();
      expect(result.isDirect).toBe(true);
      expect(result.name).toBe('Direct chat');
      expect(result.users).toHaveLength(1);
    });

    it('wraps unexpected parse errors', () => {
      expect(() => parseConversation(null as any)).toThrow(ConversationValidationError);
    });
  });

  describe('ConversationValidationError', () => {
    it('should create error with message', () => {
      const error = new ConversationValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ConversationValidationError');
    });

    it('should create error with field', () => {
      const error = new ConversationValidationError('Test error', 'testField');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
    });
  });
});
