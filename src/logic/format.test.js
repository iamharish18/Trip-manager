import { formatRupees } from './format';

describe('formatRupees', () => {
  it.each([
    [0, '₹0'],
    [900, '₹900'],
    [1200, '₹1,200'],
    [27600, '₹27,600'],
    [100000, '₹1,00,000'],
    [12345678, '₹1,23,45,678'],
  ])('formats %d as %s', (amount, expected) => {
    expect(formatRupees(amount)).toBe(expected);
  });

  it('uses a real minus sign for negative amounts', () => {
    expect(formatRupees(-900)).toBe('−₹900');
  });

  it('adds a plus sign only when signed', () => {
    expect(formatRupees(11100, { signed: true })).toBe('+₹11,100');
    expect(formatRupees(0, { signed: true })).toBe('₹0');
  });

  it('rounds to whole rupees', () => {
    expect(formatRupees(33.4)).toBe('₹33');
  });
});
