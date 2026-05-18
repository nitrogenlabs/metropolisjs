import {
  clearUserCache,
  formatUserOutput,
  getUserCacheSize,
  parseUser,
  parseUserLegacy,
  userCache,
  UserValidationError,
  validateUserInput
} from './userAdapter';

describe('userAdapter', () => {
  describe('validateUserInput', () => {
    it('should validate valid user input', () => {
      const validUser = {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      const result = validateUserInput(validUser);
      expect(result).toEqual(validUser);
    });

    it('should handle minimal user input', () => {
      const minimalUser = {
        userId: 'user123'
      };

      const result = validateUserInput(minimalUser);
      expect(result).toEqual(minimalUser);
    });

    it('should throw UserValidationError for invalid input', () => {
      const invalidUser = {
        email: 'invalid-email',
        userId: 123
      } as unknown;

      expect(() => validateUserInput(invalidUser)).toThrow(Error);
    });

    it('should handle additional properties', () => {
      const userWithExtra = {
        userId: 'user1',
        username: 'testuser',
        customField: 'value'
      };

      const result = validateUserInput(userWithExtra);
      expect(result).toEqual(userWithExtra);
    });
  });

  describe('parseUser', () => {
    it('should parse user with all fields', () => {
      const user = {
        _id: 'users/user1',
        _key: 'user1',
        userId: 'user1',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        bio: 'Test bio',
        avatar: 'avatar.jpg',
        cover: 'cover.jpg',
        city: 'Test City',
        country: 'US',
        state: 'NY',
        zip: '12345',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        locale: 'en-US',
        verified: true,
        active: true,
        added: 1234567890,
        modified: 1234567890
      };

      const result = parseUser(user);
      expect(result.userId).toBe('user1');
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('Test');
      expect(result.lastName).toBe('User');
      expect(result.bio).toBe('Test bio');
      expect(result.avatar).toBe('avatar.jpg');
      expect(result.cover).toBe('cover.jpg');
      expect(result.city).toBe('Test City');
      expect(result.country).toBe('US');
      expect(result.state).toBe('NY');
      expect(result.zip).toBe('12345');
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
      expect(result.timezone).toBe('America/New_York');
      expect(result.locale).toBe('en-US');
      expect(result.verified).toBe(true);
      expect(result.active).toBe(true);
      expect(result.added).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('should handle user with minimal fields', () => {
      const minimalUser = {
        userId: 'user1',
        username: 'testuser'
      };

      const result = parseUser(minimalUser);
      expect(result.userId).toBe('user1');
      expect(result.username).toBe('testuser');
      expect(result.email).toBeUndefined();
      expect(result.firstName).toBeUndefined();
    });

    it('should parse ArangoDB fields correctly', () => {
      const user = {
        _id: 'users/user1',
        _key: 'user1',
        userId: 'user1',
        username: 'testuser'
      };

      const result = parseUser(user);
      expect(result.id).toBe('users/user1');
      expect(result.userId).toBe('user1');
    });

    it('should handle boolean fields', () => {
      const user = {
        userId: 'user1',
        username: 'testuser',
        verified: true,
        active: false
      };

      const result = parseUser(user);
      expect(result.verified).toBe(true);
      expect(result.active).toBe(false);
    });

    it('should handle numeric fields', () => {
      const user = {
        userId: 'user1',
        latitude: 40.7128,
        longitude: -74.0060,
        added: 1234567890,
        modified: 1234567890
      };

      const result = parseUser(user);
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
      expect(result.added).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('normalizes profile, billing, verification, and date fields', () => {
      const result = parseUser({
        active: 1 as any,
        bankId: 'bank-1',
        birthdate: 1000,
        country: 'us',
        currency: 'usd',
        deviceToken: 'device-1',
        gender: 'f',
        imageId: 'images/image-1',
        lastActive: 2000,
        mailingList: 1 as any,
        name: 'Alpha User',
        password: 'secret',
        phone: '(555) 123-4567',
        planExpires: 3000,
        planId: 'plus',
        planStatus: 'active',
        planSubscriptionId: 'sub-1',
        salt: 'salt',
        state: 'ca',
        street1: 'One Main',
        street2: 'Suite 2',
        stripeAccountId: 'acct-1',
        stripeCardBrand: 'visa',
        stripeCardId: 'card-1',
        stripeCardLast4: '4242',
        stripeCustomerId: 'cus-1',
        type: 'member',
        userAccess: 0,
        userId: '../user-1',
        username: 'alpha',
        verifiedEmail: 1 as any,
        verifiedEmailCode: 123,
        verifiedEmailExpires: 4000,
        verifiedPhone: 0 as any,
        verifiedPhoneExpires: 5000,
        verifiedSmsCode: 456,
        zip: '90210'
      });

      expect(result).toEqual(expect.objectContaining({
        active: true,
        country: 'US',
        currency: 'USD',
        gender: 'F',
        mailingList: true,
        phone: '+5551234567',
        state: 'CA',
        stripeCardLast4: '4242',
        userAccess: 0,
        userId: 'user1',
        verifiedEmail: true,
        verifiedPhone: false
      }));
    });

    it('throws validation errors for invalid normalized fields', () => {
      expect(() => parseUser({country: 'USA'})).toThrow(UserValidationError);
      expect(() => parseUser({state: 'California'})).toThrow(UserValidationError);
      expect(() => parseUser({gender: 'X'})).toThrow(UserValidationError);
      expect(() => parseUser({phone: '123'})).toThrow(UserValidationError);
    });

    it('formats safe output and exposes cache helpers', () => {
      userCache.set('user-1', {userId: 'user-1'});
      expect(getUserCacheSize()).toBe(1);
      clearUserCache();
      expect(getUserCacheSize()).toBe(0);
      expect(formatUserOutput({
        password: 'secret',
        salt: 'salt',
        userId: 'user-1',
        verifiedEmailCode: 123,
        verifiedSmsCode: 456
      })).toEqual({userId: 'user-1'});
      expect(parseUserLegacy({userId: 'user-1'}).userId).toBe('user1');
    });
  });

  describe('UserValidationError', () => {
    it('should create error with message', () => {
      const error = new UserValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('UserValidationError');
    });

    it('should create error with field', () => {
      const error = new UserValidationError('Test error', 'testField');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
    });
  });
});
