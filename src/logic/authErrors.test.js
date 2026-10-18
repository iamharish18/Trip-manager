import { describeAuthError } from './authErrors';

describe('describeAuthError', () => {
  it('puts duplicate-email errors under the email field', () => {
    expect(describeAuthError({ code: 'auth/email-already-in-use' })).toEqual({
      field: 'email',
      message: 'That email already has an account. Try logging in.',
    });
  });

  it('gives the same message for a wrong password and an unknown email', () => {
    const wrongPassword = describeAuthError({ code: 'auth/wrong-password' });
    expect(describeAuthError({ code: 'auth/user-not-found' })).toEqual(wrongPassword);
    expect(describeAuthError({ code: 'auth/invalid-credential' })).toEqual(wrongPassword);
    expect(wrongPassword.field).toBeNull();
  });

  it('explains network failures', () => {
    expect(describeAuthError({ code: 'auth/network-request-failed' }).message).toMatch(/offline/);
  });

  it('falls back to a general message for unknown errors', () => {
    expect(describeAuthError({ code: 'auth/something-new' })).toEqual({
      field: null,
      message: 'Something went wrong. Try again.',
    });
    expect(describeAuthError(undefined).message).toBe('Something went wrong. Try again.');
  });
});
