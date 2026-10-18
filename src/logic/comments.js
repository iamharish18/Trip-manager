// Helpers for showing comments (SPEC §10).

export const COMMENT_MAX = 300;

// Oldest first; comments not yet on the server (no createdAt) go last.
export function commentsFor(expenseId, comments) {
  const time = (c) => c.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
  return comments.filter((c) => c.expenseId === expenseId).sort((a, b) => time(a) - time(b));
}

// { expenseId: count }
export function commentCounts(comments) {
  const counts = {};
  for (const c of comments) counts[c.expenseId] = (counts[c.expenseId] ?? 0) + 1;
  return counts;
}

export function commentCountLabel(count) {
  if (!count) return null;
  return count === 1 ? '1 comment' : `${count} comments`;
}

export function validateComment(text) {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return 'Write something first.';
  if (trimmed.length > COMMENT_MAX) return `Use ${COMMENT_MAX} characters or fewer.`;
  return null;
}
