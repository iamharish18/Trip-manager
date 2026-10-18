// Comments on expenses (SPEC §10). One list per trip; each comment names
// its expense. Writes work offline and sync later.

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';

import { db } from './firebase';

const commentsRef = (tripId) => collection(db, 'trips', tripId, 'comments');

export function addComment(tripId, { expenseId, text, authorUid, authorPid }) {
  return setDoc(doc(commentsRef(tripId)), {
    expenseId,
    text: text.trim(),
    authorUid,
    authorPid,
    createdAt: serverTimestamp(),
  });
}

export function deleteComment(tripId, commentId) {
  return deleteDoc(doc(db, 'trips', tripId, 'comments', commentId));
}

// Each comment gets `pending: true` until the server has it ("Sending…").
// Metadata changes are included so the flag clears once synced.
export function subscribeToComments(tripId, onChange, onError) {
  return onSnapshot(
    commentsRef(tripId),
    { includeMetadataChanges: true },
    (snapshot) =>
      onChange(
        snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          pending: d.metadata.hasPendingWrites,
        })),
      ),
    onError,
  );
}
