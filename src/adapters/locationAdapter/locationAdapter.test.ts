import {formatLocationOutput, LocationValidationError, parseLocation, validateLocationInput} from './locationAdapter';

describe('locationAdapter', () => {
  describe('validateLocationInput', () => {
    it('should validate valid location input', () => {
      const validLocation = {
        locationId: 'location1',
        address: '123 Test St',
        city: 'Test City',
        state: 'NY',
        country: 'US',
        zip: '12345',
        latitude: 40.7128,
        longitude: -74.0060
      };

      const result = validateLocationInput(validLocation);
      expect(result).toEqual(validLocation);
    });

    it('should handle minimal location input', () => {
      const minimalLocation = {
        locationId: 'location1',
        address: '123 Test St'
      };

      const result = validateLocationInput(minimalLocation);
      expect(result).toEqual(minimalLocation);
    });

    it('should throw LocationValidationError for invalid input', () => {
      const invalidLocation = {
        locationId: 'location1',
        latitude: '40.7128'
      } as unknown;

      expect(() => validateLocationInput(invalidLocation)).toThrow(Error);
    });

    it('should handle additional properties', () => {
      const locationWithExtra = {
        locationId: 'location1',
        address: '123 Test St',
        customField: 'value'
      };

      const result = validateLocationInput(locationWithExtra);
      expect(result).toEqual(locationWithExtra);
    });
  });

  describe('parseLocation', () => {
    it('should parse location with all fields', () => {
      const location = {
        _id: 'locations/location1',
        _key: 'location1',
        locationId: 'location1',
        address: '123 Test St',
        city: 'Test City',
        state: 'NY',
        country: 'US',
        zip: '12345',
        latitude: 40.7128,
        longitude: -74.0060,
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parseLocation(location);
      expect(result.locationId).toBe('location1');
      expect(result.address).toBe('123 Test St');
      expect(result.city).toBe('Test City');
      expect(result.state).toBe('NY');
      expect(result.country).toBe('US');
      expect(result.zip).toBe('12345');
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('should handle location with minimal fields', () => {
      const minimalLocation = {
        locationId: 'location1',
        address: '123 Test St'
      };

      const result = parseLocation(minimalLocation);
      expect(result.locationId).toBe('location1');
      expect(result.address).toBe('123 Test St');
      expect(result.city).toBeUndefined();
      expect(result.latitude).toBeUndefined();
    });

    it('should parse ArangoDB fields correctly', () => {
      const location = {
        _id: 'locations/location1',
        _key: 'location1',
        locationId: 'location1',
        address: '123 Test St'
      };

      const result = parseLocation(location);
      expect(result.id).toBe('locations/location1');
      expect(result.locationId).toBe('location1');
    });

    it('should handle numeric fields', () => {
      const location = {
        locationId: 'location1',
        address: '123 Test St',
        latitude: 40.7128,
        longitude: -74.0060,
        cached: 1234567890,
        modified: 1234567890
      };

      const result = parseLocation(location);
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.0060);
      expect(result.cached).toBe(1234567890);
      expect(result.modified).toBe(1234567890);
    });

    it('formats location output and parses alternate location fields', () => {
      const result = parseLocation({
        id: 'locations/location-1',
        location: 'Warehouse',
        street: 'Main',
        zip: '12345'
      });

      expect(formatLocationOutput(result)).toBe(result);
      expect(result).toEqual(expect.objectContaining({
        id: 'locations/location1',
        location: 'Warehouse',
        street: 'Main',
        zip: '12345'
      }));
    });

    it('wraps unexpected parse errors', () => {
      expect(() => parseLocation(null as any)).toThrow(LocationValidationError);
    });
  });

  describe('LocationValidationError', () => {
    it('should create error with message', () => {
      const error = new LocationValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('LocationValidationError');
    });

    it('should create error with field', () => {
      const error = new LocationValidationError('Test error', 'testField');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
    });
  });
});
