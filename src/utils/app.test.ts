import {describe, expect, it} from 'vitest';

import {getColumnSize, isExpired} from './app.js';

describe('app utilities', () => {
  it('computes app layout helpers', () => {
    expect(getColumnSize(400, 100, 1)).toEqual({columns: 4, size: 86});
    expect(isExpired(Date.now() - 10 * 60 * 1000, 5)).toBe(true);
    expect(isExpired(Date.now() + 10 * 60 * 1000, 5)).toBe(false);
  });
});
