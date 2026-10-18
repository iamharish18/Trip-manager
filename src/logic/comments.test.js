import { commentCountLabel, commentCounts, commentsFor, validateComment } from './comments';

const at = (ms) => ({ toMillis: () => ms });

describe('commentsFor', () => {
  it('returns one expense’s comments, oldest first, unsynced ones last', () => {
    const list = commentsFor('e1', [
      { id: 'b', expenseId: 'e1', createdAt: at(20) },
      { id: 'x', expenseId: 'e2', createdAt: at(5) },
      { id: 'pending', expenseId: 'e1', createdAt: null },
      { id: 'a', expenseId: 'e1', createdAt: at(10) },
    ]);
    expect(list.map((c) => c.id)).toEqual(['a', 'b', 'pending']);
  });
});

describe('commentCounts and labels', () => {
  it('counts per expense', () => {
    expect(commentCounts([{ expenseId: 'e1' }, { expenseId: 'e1' }, { expenseId: 'e2' }])).toEqual({
      e1: 2,
      e2: 1,
    });
  });

  it('labels counts', () => {
    expect(commentCountLabel(0)).toBeNull();
    expect(commentCountLabel(undefined)).toBeNull();
    expect(commentCountLabel(1)).toBe('1 comment');
    expect(commentCountLabel(3)).toBe('3 comments');
  });
});

describe('validateComment', () => {
  it('requires 1–300 characters', () => {
    expect(validateComment('  ')).toBe('Write something first.');
    expect(validateComment('a'.repeat(300))).toBeNull();
    expect(validateComment('a'.repeat(301))).toBe('Use 300 characters or fewer.');
  });
});
