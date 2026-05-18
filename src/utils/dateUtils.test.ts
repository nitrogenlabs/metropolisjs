import { parseDateTime } from './dateUtils';
import {DateTime} from 'luxon';

describe('dateUtils utilities', () => {
  describe('parseDateTime', () => {
    it('should parse ISO string to milliseconds', () => {
      const isoString = '2023-12-25T10:30:00.000Z';
      const result = parseDateTime(isoString);

      // The expected value should be the actual parsed value
      const expected = new Date(isoString).getTime();
      expect(result).toBe(expected);
    });

    it('should parse number timestamp', () => {
      const timestamp = 1703505000000;
      const result = parseDateTime(timestamp);

      expect(result).toBe(1703505000000);
    });

    it('should handle zero timestamp', () => {
      const timestamp = 0;
      const result = parseDateTime(timestamp);

      expect(result).toBe(0);
    });

    it('should parse Luxon DateTime values', () => {
      const value = DateTime.fromISO('2023-12-25T10:30:00.000Z');

      expect(parseDateTime(value)).toBe(value.toMillis());
    });
  });
});
