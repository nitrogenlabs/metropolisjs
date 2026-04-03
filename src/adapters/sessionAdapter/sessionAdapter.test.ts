import {describe, expect, it} from 'vitest';

import {
  SessionValidationError,
  formatSessionOutput,
  parseSession,
  validateSessionInput
} from './sessionAdapter';

describe('sessionAdapter', () => {
  describe('validateSessionInput', () => {
    it('should validate valid session input', () => {
      const validSession = {
        sessionId: 'session-123',
        userId: 'user-123',
        token: 'jwt-token-here'
      };

      const result = validateSessionInput(validSession);

      expect(result).toEqual(validSession);
    });

    it('should validate session with minimal input', () => {
      const minimalSession = {
        sessionId: 'session-123'
      };

      const result = validateSessionInput(minimalSession);

      expect(result).toEqual(minimalSession);
    });

    it('should validate session with all fields', () => {
      const fullSession = {
        _id: 'sessions/123',
        _key: '123',
        _rev: 'new-rev',
        _oldRev: 'old-rev',
        _from: 'users/456',
        _to: 'posts/789',
        expires: 1640995200000,
        id: 'session-123',
        issued: 1640991600000,
        sessionId: 'session-123',
        token: 'jwt-token-here',
        userId: 'user-123',
        username: 'john_doe'
      };

      const result = validateSessionInput(fullSession);

      expect(result).toEqual(fullSession);
    });

    it('should handle empty object', () => {
      const result = validateSessionInput({});

      expect(result).toEqual({});
    });

    it('should handle undefined values', () => {
      const sessionWithUndefined = {
        sessionId: undefined,
        userId: undefined,
        token: undefined
      };

      const result = validateSessionInput(sessionWithUndefined);

      expect(result).toEqual(sessionWithUndefined);
    });

    it('should validate numeric fields', () => {
      const session = {
        expires: 1640995200000,
        issued: 1640991600000
      };

      const result = validateSessionInput(session);

      expect(result).toEqual(session);
    });

    it('should validate string fields', () => {
      const session = {
        sessionId: 'session-123',
        token: 'jwt-token-here',
        userId: 'user-123',
        username: 'john_doe'
      };

      const result = validateSessionInput(session);

      expect(result).toEqual(session);
    });
  });

  describe('formatSessionOutput', () => {
    it('should return session as-is', () => {
      const session = {
        sessionId: 'session-123',
        userId: 'user-123',
        token: 'jwt-token-here'
      };

      const result = formatSessionOutput(session);

      expect(result).toBe(session);
    });

    it('should handle empty session', () => {
      const result = formatSessionOutput({});

      expect(result).toEqual({});
    });
  });

  describe('parseSession', () => {
    it('should parse session with all fields', () => {
      const session = {
        _id: 'sessions/123',
        _key: '123',
        expires: 1640995200000,
        id: 'session-123',
        issued: 1640991600000,
        sessionId: 'session-123',
        token: 'jwt-token-here',
        userId: 'user-123',
        username: 'john_doe'
      };

      const result = parseSession(session);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('expires');
      expect(result).toHaveProperty('issued');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('username');
    });

    it('should parse session with minimal fields', () => {
      const session = {
        sessionId: 'session-123'
      };

      const result = parseSession(session);

      expect(result).toHaveProperty('sessionId');
      expect(result.sessionId).toBe('session123'); // parseId removes hyphens
    });

    it('should handle session with only ID fields', () => {
      const session = {
        _id: 'sessions/123',
        _key: '123'
      };

      const result = parseSession(session);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('sessionId');
    });

    it('should handle numeric date fields', () => {
      const session = {
        sessionId: 'session-123',
        expires: 1640995200000,
        issued: 1640991600000
      };

      const result = parseSession(session);

      expect(result).toHaveProperty('expires');
      expect(result).toHaveProperty('issued');
      expect(typeof result.expires).toBe('number');
      expect(typeof result.issued).toBe('number');
    });

    it('should handle long username', () => {
      const longUsername = 'a'.repeat(100);
      const session = {
        sessionId: 'session-123',
        username: longUsername
      };

      const result = parseSession(session);

      expect(result).toHaveProperty('username');
      expect(result.username!.length).toBeLessThanOrEqual(32);
    });

    it('should preserve token field', () => {
      const session = {
        sessionId: 'session-123',
        token: 'jwt-token-here'
      };

      const result = parseSession(session);

      expect(result).toHaveProperty('token');
      expect(result.token).toBe(session.token);
    });

    it('should handle session with non-empty values', () => {
      const session = {
        sessionId: 'session-123',
        token: 'valid-token',
        userId: 'user-123',
        username: 'john_doe',
        expires: 1640995200000,
        issued: 1640991600000
      };

      const result = parseSession(session);

      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('expires');
      expect(result).toHaveProperty('issued');
    });

    it('should handle session with zero dates', () => {
      const session = {
        sessionId: 'session-123',
        expires: 0,
        issued: 0
      };

      const result = parseSession(session);

      // Zero dates should be converted to undefined by parseReaktorDate
      expect(result).toHaveProperty('sessionId');
      expect(result.expires).toBeUndefined();
      expect(result.issued).toBeUndefined();
    });

    it('should handle session with string dates', () => {
      const session = {
        sessionId: 'session-123',
        expires: '1640995200000',
        issued: '1640991600000'
      };

      const result = parseSession(session);

      expect(result).toHaveProperty('expires');
      expect(result).toHaveProperty('issued');
      expect(result.expires).toBe(1640995200000);
      expect(result.issued).toBe(1640991600000);
    });
  });

  describe('SessionValidationError', () => {
    it('should create SessionValidationError with message', () => {
      const error = new SessionValidationError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SessionValidationError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('SessionValidationError');
    });

    it('should create SessionValidationError with message and field', () => {
      const error = new SessionValidationError('Test error', 'sessionId');

      expect(error.message).toBe('Test error');
      expect(error.field).toBe('sessionId');
    });
  });
});
