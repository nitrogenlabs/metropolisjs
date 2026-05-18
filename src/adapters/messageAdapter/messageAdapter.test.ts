import {formatMessageOutput, MessageValidationError, parseMessage, validateMessageInput} from './messageAdapter';

describe('messageAdapter', () => {
  describe('validateMessageInput', () => {
    it('should validate valid message input', () => {
      const validMessage = {
        messageId: 'message1',
        conversationId: 'conversation1',
        content: 'Hello world',
        type: 'text',
        userId: 'user1'
      };

      const result = validateMessageInput(validMessage);
      expect(result).toEqual(validMessage);
    });

    it('should handle minimal message input', () => {
      const minimalMessage = {
        messageId: 'message1',
        content: 'Hello'
      };

      const result = validateMessageInput(minimalMessage);
      expect(result).toEqual(minimalMessage);
    });

    it('should throw MessageValidationError for invalid input', () => {
      const invalidMessage = {
        content: 123,
        messageId: 456
      } as unknown;

      expect(() => validateMessageInput(invalidMessage)).toThrow(Error);
    });

    it('should handle additional properties', () => {
      const messageWithExtra = {
        messageId: 'message1',
        content: 'Hello',
        customField: 'value'
      };

      const result = validateMessageInput(messageWithExtra);
      expect(result).toEqual(messageWithExtra);
    });
  });

  describe('parseMessage', () => {
    it('should parse message with all fields', () => {
      const message = {
        _id: 'messages/message1',
        _key: 'message1',
        messageId: 'message1',
        conversationId: 'conversation1',
        content: 'Hello world',
        type: 'text',
        userId: 'user1',
        user: {userId: 'user1', username: 'sender'},
        edited: true,
        read: false,
        saved: false,
        editedAt: 1234567890,
        readAt: 1234567890,
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parseMessage(message);
      expect(result.messageId).toBe('message1');
      expect(result.conversationId).toBe('conversation1');
      expect(result.content).toBe('Hello world');
      expect(result.type).toBe('text');
      expect(result.userId).toBe('user1');
      expect(result.user).toBeDefined();
      expect(result.edited).toBe(true);
      expect(result.read).toBe(false);
      expect(result.saved).toBe(false);
      expect(result.editedAt).toBe(1234567890);
      expect(result.readAt).toBe(1234567890);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('should handle message with minimal fields', () => {
      const minimalMessage = {
        messageId: 'message1',
        content: 'Hello'
      };

      const result = parseMessage(minimalMessage);
      expect(result.messageId).toBe('message1');
      expect(result.content).toBe('Hello');
      expect(result.type).toBeUndefined();
      expect(result.userId).toBeUndefined();
      expect(result.user).toBeUndefined();
      expect(result.edited).toBeUndefined();
      expect(result.read).toBeUndefined();
      expect(result.saved).toBeUndefined();
      expect(result.editedAt).toBeUndefined();
      expect(result.readAt).toBeUndefined();
      expect(result.cached).toBeUndefined();
      expect(result.modified).toBeUndefined();
    });

    it('should parse ArangoDB fields correctly', () => {
      const message = {
        _id: 'messages/message1',
        _key: 'message1',
        messageId: 'message1',
        content: 'Hello world'
      };

      const result = parseMessage(message);
      expect(result.id).toBe('messages/message1');
    });

    it('should handle boolean fields', () => {
      const message = {
        messageId: 'message1',
        content: 'Hello',
        edited: true,
        read: false
      };

      const result = parseMessage(message);
      expect(result.edited).toBe(true);
      expect(result.read).toBe(false);
    });

    it('should handle numeric fields', () => {
      const message = {
        messageId: 'message1',
        content: 'Hello',
        editedAt: 1234567890,
        readAt: 1234567890,
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parseMessage(message);
      expect(result.editedAt).toBe(1234567890);
      expect(result.readAt).toBe(1234567890);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('formats messages and parses nested files and images', () => {
      const result = parseMessage({
        files: [{fileId: 'file-1', name: 'report.pdf'}],
        id: 'messages/message-1',
        images: [{imageId: 'image-1', name: 'image.jpg'}],
        saved: true
      });

      expect(formatMessageOutput(result)).toBe(result);
      expect(result.id).toBe('messages/message1');
      expect(result.files).toHaveLength(1);
      expect(result.images).toHaveLength(1);
      expect(result.saved).toBe(true);
    });

    it('wraps unexpected parse errors', () => {
      expect(() => parseMessage({files: [null]} as any)).toThrow(MessageValidationError);
    });
  });

  describe('MessageValidationError', () => {
    it('should create error with message', () => {
      const error = new MessageValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('MessageValidationError');
    });

    it('should create error with field', () => {
      const error = new MessageValidationError('Test error', 'testField');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
    });
  });
});
