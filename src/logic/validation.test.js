import {
  collectErrors,
  validateEmail,
  validateLoginPassword,
  validateName,
  validateNewPassword,
} from './validation';

describe('validateName', () => {
  it('requires a name', () => {
    expect(validateName('')).toBe('Enter your name.');
    expect(validateName('   ')).toBe('Enter your name.');
    expect(validateName(undefined)).toBe('Enter your name.');
  });

  it('accepts up to 40 characters after trimming', () => {
    expect(validateName('  Rahul  ')).toBeNull();
    expect(validateName('a'.repeat(40))).toBeNull();
    expect(validateName('a'.repeat(41))).toBe('Use 40 characters or fewer.');
  });
});

describe('validateEmail', () => {
  it.each(['rahul@example.com', ' rahul@example.co.in ', 'a.b+trip@x.io'])(
    'accepts %s',
    (email) => {
      expect(validateEmail(email)).toBeNull();
    },
  );

  it('requires an email', () => {
    expect(validateEmail('')).toBe('Enter your email.');
  });

  it.each(['rahul', 'rahul@', 'rahul@example', '@example.com', 'ra hul@example.com'])(
    'rejects %s',
    (email) => {
      expect(validateEmail(email)).toBe('Enter a valid email, like name@example.com.');
    },
  );
});

describe('validateNewPassword', () => {
  it('requires at least 8 characters', () => {
    expect(validateNewPassword('')).toBe('Enter a password.');
    expect(validateNewPassword('1234567')).toBe('Use at least 8 characters.');
    expect(validateNewPassword('12345678')).toBeNull();
  });
});

describe('validateLoginPassword', () => {
  it('only checks that a password was entered', () => {
    expect(validateLoginPassword('')).toBe('Enter your password.');
    expect(validateLoginPassword('short')).toBeNull();
  });
});

describe('collectErrors', () => {
  it('keeps only the failing fields', () => {
    expect(collectErrors({ name: null, email: 'Enter your email.' })).toEqual({
      email: 'Enter your email.',
    });
    expect(collectErrors({ name: null })).toEqual({});
  });
});
