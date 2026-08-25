import { moveDown, moveToTop, moveUp } from './list-reorder';

describe('list-reorder', () => {
  describe('moveToTop', () => {
    it('moves an id to the front of the array', () => {
      expect(moveToTop(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b']);
    });

    it('is a no-op when the id is already at the top', () => {
      const ids = ['a', 'b', 'c'];

      expect(moveToTop(ids, 'a')).toEqual(['a', 'b', 'c']);
    });

    it('is a no-op when the id is not present', () => {
      const ids = ['a', 'b', 'c'];

      expect(moveToTop(ids, 'z')).toEqual(['a', 'b', 'c']);
    });

    it('is a no-op for a single-element array', () => {
      expect(moveToTop(['a'], 'a')).toEqual(['a']);
    });

    it('does not mutate the input array', () => {
      const ids = ['a', 'b', 'c'];

      moveToTop(ids, 'c');

      expect(ids).toEqual(['a', 'b', 'c']);
    });
  });

  describe('moveUp', () => {
    it('swaps an id with the element immediately before it', () => {
      expect(moveUp(['a', 'b', 'c'], 'c')).toEqual(['a', 'c', 'b']);
    });

    it('is a no-op when the id is already at index 0', () => {
      const ids = ['a', 'b', 'c'];

      expect(moveUp(ids, 'a')).toEqual(['a', 'b', 'c']);
    });

    it('is a no-op when the id is not present', () => {
      const ids = ['a', 'b', 'c'];

      expect(moveUp(ids, 'z')).toEqual(['a', 'b', 'c']);
    });

    it('is a no-op for a single-element array', () => {
      expect(moveUp(['a'], 'a')).toEqual(['a']);
    });

    it('does not mutate the input array', () => {
      const ids = ['a', 'b', 'c'];

      moveUp(ids, 'c');

      expect(ids).toEqual(['a', 'b', 'c']);
    });
  });

  describe('moveDown', () => {
    it('swaps an id with the element immediately after it', () => {
      expect(moveDown(['a', 'b', 'c'], 'a')).toEqual(['b', 'a', 'c']);
    });

    it('is a no-op when the id is already at the last index', () => {
      const ids = ['a', 'b', 'c'];

      expect(moveDown(ids, 'c')).toEqual(['a', 'b', 'c']);
    });

    it('is a no-op when the id is not present', () => {
      const ids = ['a', 'b', 'c'];

      expect(moveDown(ids, 'z')).toEqual(['a', 'b', 'c']);
    });

    it('is a no-op for a single-element array', () => {
      expect(moveDown(['a'], 'a')).toEqual(['a']);
    });

    it('does not mutate the input array', () => {
      const ids = ['a', 'b', 'c'];

      moveDown(ids, 'a');

      expect(ids).toEqual(['a', 'b', 'c']);
    });
  });
});
