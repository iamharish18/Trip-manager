import {
  JOIN_CODE_ALPHABET,
  generateJoinCode,
  isValidJoinCode,
  normalizeJoinCode,
} from './joinCode';

describe('generateJoinCode', () => {
  it('makes 6-character codes from the allowed alphabet', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateJoinCode();
      expect(code).toHaveLength(6);
      expect(isValidJoinCode(code)).toBe(true);
    }
  });

  it('never uses look-alike characters', () => {
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it('uses both ends of the alphabet', () => {
    expect(generateJoinCode(() => 0)).toBe('AAAAAA');
    expect(generateJoinCode(() => 0.9999)).toBe('999999');
  });
});

describe('normalizeJoinCode', () => {
  it('accepts lowercase, spaces and dashes', () => {
    expect(normalizeJoinCode(' gqa-7k2 ')).toBe('GQA7K2');
    expect(normalizeJoinCode('gqa 7k2')).toBe('GQA7K2');
  });
});

describe('isValidJoinCode', () => {
  it.each(['GQA7K2', 'ABCDEF', '234567'])('accepts %s', (code) => {
    expect(isValidJoinCode(code)).toBe(true);
  });

  it.each(['GQA7K', 'GQA7K22', 'GOA7K2', 'GQ0K22', 'GQIK22', 'gqa7k2', ''])(
    'rejects %s',
    (code) => {
      expect(isValidJoinCode(code)).toBe(false);
    },
  );
});
