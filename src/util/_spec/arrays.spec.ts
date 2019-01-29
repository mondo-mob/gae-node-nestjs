import { unique } from '../arrays';

describe('arrays', () => {
  describe('unique', () => {
    it('should return new array with items added', () => {
      const original = [1, 2];

      const result = unique(original, 5, 3);

      expect(original).not.toBe(result);
      expect(result).toEqual([1, 2, 5, 3]);
    });

    it('should return new array without adding item when item is already in array', () => {
      const original = [1, 2];

      const result = unique(original, 2);

      expect(original).not.toBe(result);
      expect(result).toEqual([1, 2]);
    });

    it('should return new array with duplicates removed from original array', () => {
      const original = [1, 2, 2, 2];

      const result = unique(original, 3);

      expect(original).not.toBe(result);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should convert array to unique without adding any other values', () => {
      const original = [1, 2, 2, 2];

      const result = unique(original);

      expect(original).not.toBe(result);
      expect(result).toEqual([1, 2]);
    });
  });
});
