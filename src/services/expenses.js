// Expenses and custom categories of a trip (SPEC §6, §7, §14).
// All writes work offline: the local cache updates at once and syncs later.
// Their promises resolve only when the server confirms, so screens don't
// wait for them.

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@react-native-firebase/firestore';

import { WITH_PENDING, db, withPending } from './firebase';

const expensesRef = (tripId) => collection(db, 'trips', tripId, 'expenses');
const expenseRef = (tripId, id) => doc(db, 'trips', tripId, 'expenses', id);
const categoriesRef = (tripId) => collection(db, 'trips', tripId, 'categories');

/**
 * Adds an expense split among `splitAmongPids` (everyone on the trip now).
 * Returns { id, saved }: the new id right away, and the server promise.
 */
export function addExpense(tripId, uid, expense) {
  const ref = doc(expensesRef(tripId));
  const saved = setDoc(ref, {
    amount: expense.amount,
    paidByPid: expense.paidByPid,
    categoryId: expense.categoryId,
    date: expense.date,
    description: expense.description.trim(),
    splitAmongPids: expense.splitAmongPids,
    createdByUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isDeleted: false,
    // Cleared once the other members have been notified (SPEC §11).
    notifyPending: true,
  });
  return { id: ref.id, saved };
}

// The split list, creator and creation time never change.
export function updateExpense(tripId, id, changes) {
  return updateDoc(expenseRef(tripId, id), {
    amount: changes.amount,
    paidByPid: changes.paidByPid,
    categoryId: changes.categoryId,
    date: changes.date,
    description: changes.description.trim(),
    updatedAt: serverTimestamp(),
  });
}

// Soft delete; pass false to undo.
export function setExpenseDeleted(tripId, id, isDeleted) {
  return updateDoc(expenseRef(tripId, id), { isDeleted, updatedAt: serverTimestamp() });
}

// Each item says whether it's still uploading (`pending`), for the sync icon.
export function subscribeToExpenses(tripId, onChange, onError) {
  return onSnapshot(
    expensesRef(tripId),
    WITH_PENDING,
    (snapshot) => onChange(snapshot.docs.map(withPending)),
    onError,
  );
}

// Returns { id, saved } like addExpense, so the new category can be selected at once.
export function addCategory(tripId, uid, name) {
  const ref = doc(categoriesRef(tripId));
  const saved = setDoc(ref, { name: name.trim(), createdByUid: uid, createdAt: serverTimestamp() });
  return { id: ref.id, saved };
}

export function deleteCategory(tripId, id) {
  return deleteDoc(doc(db, 'trips', tripId, 'categories', id));
}

export function subscribeToCategories(tripId, onChange, onError) {
  return onSnapshot(
    categoriesRef(tripId),
    WITH_PENDING,
    (snapshot) => onChange(snapshot.docs.map(withPending)),
    onError,
  );
}
