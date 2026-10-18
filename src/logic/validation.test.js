import {
  collectErrors,
  sameName,
  validateAmount,
  validateDescription,
  validateExpenseDate,
  validateEmail,
  validateEndDate,
  validateLoginPassword,
  validateName,
  validateNewPassword,
  validateParticipantName,
  validateStartDate,
  validateTripName,
} from './validation';

describe('validateAmount', () => {
  it('requires whole rupees from ₹1 to ₹10,00,000', () => {
    expect(validateAmount('')).toBe('Enter an amount.');
    expect(validateAmount('12.5')).toBe('Enter whole rupees only.');
    expect(validateAmount('0')).toBe('Enter an amount between ₹1 and ₹10,00,000.');
    expect(validateAmount('10,00,001')).toBe('Enter an amount between ₹1 and ₹10,00,000.');
    expect(validateAmount('1')).toBeNull();
    expect(validateAmount('10,00,000')).toBeNull();
  });
});

describe('validateDescription', () => {
  it('allows empty and up to 100 characters', () => {
    expect(validateDescription('')).toBeNull();
    expect(validateDescription('a'.repeat(100))).toBeNull();
    expect(validateDescription('a'.repeat(101))).toBe('Use 100 characters or fewer.');
  });
});

describe('validateExpenseDate', () => {
  it('requires a real date', () => {
    expect(validateExpenseDate('2026-12-14')).toBeNull();
    expect(validateExpenseDate(null)).toBe('Choose a date.');
  });
});

describe('validateTripName', () => {
  it('requires 1–60 characters', () => {
    expect(validateTripName(' ')).toBe('Enter a trip name.');
    expect(validateTripName('Goa trip')).toBeNull();
    expect(validateTripName('a'.repeat(61))).toBe('Use 60 characters or fewer.');
  });
});

describe('trip dates', () => {
  it('requires a start date', () => {
    expect(validateStartDate(null)).toBe('Choose a start date.');
    expect(validateStartDate('2026-12-12')).toBeNull();
  });

  it('allows no end date', () => {
    expect(validateEndDate('2026-12-12', null)).toBeNull();
  });

  it('allows an end date on or after the start', () => {
    expect(validateEndDate('2026-12-12', '2026-12-12')).toBeNull();
    expect(validateEndDate('2026-12-12', '2027-01-02')).toBeNull();
  });

  it('rejects an end date before the start', () => {
    expect(validateEndDate('2026-12-12', '2026-12-11')).toBe(
      'The end date can’t be before the start.',
    );
  });
});

describe('participant names', () => {
  it('treats names as equal ignoring capitals and spaces', () => {
    expect(sameName(' Priya ', 'priya')).toBe(true);
    expect(sameName('Priya', 'Priyanka')).toBe(false);
  });

  it('rejects a name already on the trip', () => {
    expect(validateParticipantName('priya', ['Rahul', 'Priya'])).toBe(
      'Priya is already on this trip.',
    );
  });

  it('accepts a new name', () => {
    expect(validateParticipantName('Amit', ['Rahul', 'Priya'])).toBeNull();
  });

  it('checks length', () => {
    expect(validateParticipantName('  ', [])).toBe('Enter a name.');
    expect(validateParticipantName('a'.repeat(41), [])).toBe('Use 40 characters or fewer.');
  });
});

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
