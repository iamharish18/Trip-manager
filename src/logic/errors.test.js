import { describeError } from './errors';

describe('describeError', () => {
  it('puts duplicate-email errors under the email field', () => {
    expect(describeError({ code: 'auth/email-already-in-use' })).toEqual({
      field: 'email',
      message: 'That email already has an account. Try logging in.',
    });
  });

  it('gives the same message for a wrong password and an unknown email', () => {
    const wrongPassword = describeError({ code: 'auth/wrong-password' });
    expect(describeError({ code: 'auth/user-not-found' })).toEqual(wrongPassword);
    expect(describeError({ code: 'auth/invalid-credential' })).toEqual(wrongPassword);
    expect(wrongPassword.field).toBeNull();
  });

  it('explains network failures', () => {
    expect(describeError({ code: 'auth/network-request-failed' }).message).toMatch(/offline/);
  });

  it('falls back to a general message for unknown errors', () => {
    expect(describeError({ code: 'auth/something-new' })).toEqual({
      field: null,
      message: 'Something went wrong. Try again.',
    });
    expect(describeError(undefined).message).toBe('Something went wrong. Try again.');
  });
});
