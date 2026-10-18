// Comments on one expense (SPEC §10): the list, delete for your own, and a
// box to write one. Read-only once the trip is closed.

import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button, Dialog, IconButton, Portal, Text } from 'react-native-paper';

import Avatar from '@/components/Avatar';
import { COMMENT_MAX, commentsFor, validateComment } from '@/logic/comments';
import { formatCommentTime } from '@/logic/dates';
import { addComment, deleteComment } from '@/services/comments';
import { useSession } from '@/state/session';
import { useTrip } from '@/state/trips';
import { useAppTheme } from '@/theme';

function CommentItem({ comment, authorName, isMine, canDelete, onDelete }) {
  const theme = useAppTheme();
  const time = comment.pending
    ? 'Sending…'
    : comment.createdAt
      ? formatCommentTime(comment.createdAt.toDate())
      : '';
  return (
    <View style={styles.item}>
      <Avatar name={authorName} size={26} />
      <View
        style={[styles.bubble, { backgroundColor: theme.app.card, borderColor: theme.app.border }]}
      >
        <View style={styles.meta}>
          <Text variant="bodySmall" style={[styles.grow, { color: theme.app.muted }]}>
            {isMine ? 'You' : authorName} · {time}
          </Text>
          {canDelete ? (
            <IconButton
              icon="delete-outline"
              size={16}
              style={styles.delete}
              accessibilityLabel="Delete comment"
              onPress={onDelete}
            />
          ) : null}
        </View>
        <Text>{comment.text}</Text>
      </View>
    </View>
  );
}

export default function CommentsSection({ expenseId }) {
  const theme = useAppTheme();
  const { user } = useSession();
  const { tripId, comments, participants, me, canWrite } = useTrip();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const list = commentsFor(expenseId, comments);
  const nameOf = (pid) => participants.find((p) => p.id === pid)?.name ?? 'Someone';
  const canPost = canWrite && Boolean(me);

  function send() {
    const problem = validateComment(draft);
    if (problem) {
      setError(problem);
      return;
    }
    // Shows at once (with "Sending…"), also offline.
    addComment(tripId, {
      expenseId,
      text: draft,
      authorUid: user.uid,
      authorPid: me.id,
    }).catch(() => {});
    setDraft('');
    setError(null);
  }

  function confirmDelete() {
    deleteComment(tripId, deleting.id).catch(() => {});
    setDeleting(null);
  }

  return (
    <View style={styles.section}>
      <Text variant="labelMedium" style={[styles.title, { color: theme.app.muted }]}>
        Comments
      </Text>

      {list.length === 0 ? (
        <Text variant="bodySmall" style={{ color: theme.app.muted }}>
          {canPost ? 'No comments yet. Ask a question or add a note.' : 'No comments.'}
        </Text>
      ) : (
        list.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            authorName={nameOf(comment.authorPid)}
            isMine={comment.authorUid === user.uid}
            canDelete={canWrite && comment.authorUid === user.uid}
            onDelete={() => setDeleting(comment)}
          />
        ))
      )}

      {canPost ? (
        <View style={styles.composer}>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: theme.app.card, borderColor: theme.app.border },
            ]}
          >
            <TextInputBare
              value={draft}
              onChangeText={(text) => {
                setDraft(text);
                setError(null);
              }}
              placeholder="Write a comment"
              placeholderTextColor={theme.app.muted}
              color={theme.app.text}
            />
            <IconButton
              icon="send"
              iconColor={theme.app.primary}
              accessibilityLabel="Send comment"
              onPress={send}
              style={styles.send}
            />
          </View>
          <View style={styles.composerFooter}>
            <Text variant="bodySmall" style={[styles.grow, { color: theme.app.negative }]}>
              {error ?? ''}
            </Text>
            {draft.length > COMMENT_MAX - 50 ? (
              <Text
                variant="bodySmall"
                style={{ color: draft.length > COMMENT_MAX ? theme.app.negative : theme.app.muted }}
              >
                {draft.length}/{COMMENT_MAX}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <Text variant="bodySmall" style={[styles.closed, { color: theme.app.muted }]}>
          {me ? 'This trip is closed, so comments are read-only.' : ''}
        </Text>
      )}

      <Portal>
        <Dialog visible={Boolean(deleting)} onDismiss={() => setDeleting(null)}>
          <Dialog.Title>Delete this comment?</Dialog.Title>
          <Dialog.Actions>
            <Button onPress={() => setDeleting(null)}>Cancel</Button>
            <Button textColor={theme.app.negative} onPress={confirmDelete}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

// A plain multiline input (Paper's TextInput adds a label and outline we
// don't want inside the rounded box).
function TextInputBare({ color, ...props }) {
  return (
    <TextInput
      {...props}
      multiline
      maxLength={COMMENT_MAX + 20}
      style={[styles.input, { color }]}
      accessibilityLabel="Comment"
    />
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 20, gap: 8 },
  title: { marginBottom: 2 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bubble: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  meta: { flexDirection: 'row', alignItems: 'center', minHeight: 20 },
  delete: { margin: 0, marginRight: -6, width: 28, height: 20 },
  grow: { flex: 1 },
  composer: { marginTop: 4 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingLeft: 12,
  },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingVertical: 10, fontSize: 15 },
  send: { margin: 2 },
  composerFooter: { flexDirection: 'row', minHeight: 18, marginTop: 2, paddingHorizontal: 4 },
  closed: { marginTop: 4 },
});
