import { describeSync, expenseWhat, failureMessage, offlineError, offlineMessage } from './sync';
import { describeError } from './errors';

describe('describeSync', () => {
  it('is synced with nothing waiting', () => {
    expect(describeSync({ offline: false, pendingCount: 0 })).toMatchObject({
      state: 'synced',
      label: 'Synced',
    });
  });

  it('is saving while changes upload', () => {
    expect(describeSync({ offline: false, pendingCount: 2 })).toMatchObject({
      state: 'saving',
      explanation: 'Uploading 2 changes to the server.',
    });
  });

  it('explains offline changes', () => {
    expect(describeSync({ offline: true, pendingCount: 3 }).explanation).toBe(
      'You’re offline. 3 changes are saved on this phone and will upload when you’re back online.',
    );
    expect(describeSync({ offline: true, pendingCount: 1 }).explanation).toContain(
      '1 change is saved',
    );
    expect(describeSync({ offline: true, pendingCount: 0 }).state).toBe('offline');
  });
});

describe('failureMessage', () => {
  const denied = { code: 'firestore/permission-denied' };

  it('blames a closed trip when the trip is now locked', () => {
    expect(failureMessage('Your expense “Dinner”', denied, { tripLocked: true })).toBe(
      'Your expense “Dinner” wasn’t saved: the trip was closed.',
    );
  });

  it('mentions lost access otherwise', () => {
    expect(failureMessage('Your comment', denied)).toBe(
      'Your comment wasn’t saved: you no longer have access.',
    );
  });

  it('asks to try again for other errors', () => {
    expect(failureMessage(undefined, { code: 'firestore/unknown' })).toBe(
      'Your change couldn’t be saved. Try again.',
    );
  });
});

describe('expenseWhat', () => {
  it('names the expense by description, or category', () => {
    expect(expenseWhat('Dinner', 'Food')).toBe('Your expense “Dinner”');
    expect(expenseWhat('', 'Food')).toBe('Your expense “Food”');
    expect(expenseWhat('Dinner', 'Food', { change: true })).toBe('Your change to “Dinner”');
  });
});

describe('offline messages', () => {
  it('names the action', () => {
    expect(offlineMessage('createTrip')).toBe('You’re offline. Creating a trip needs internet.');
  });

  it('works with describeError', () => {
    expect(describeError(offlineError('closeTrip')).message).toBe(
      'You’re offline. Closing a trip needs internet.',
    );
  });
});
