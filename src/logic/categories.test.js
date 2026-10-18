import {
  CUSTOM_COLORS,
  DEFAULT_CATEGORIES,
  allCategories,
  findCategory,
  validateCategoryName,
} from './categories';

const at = (ms) => ({ toMillis: () => ms });

describe('allCategories', () => {
  it('lists defaults first, then custom ones oldest first with palette colours', () => {
    const all = allCategories([
      { id: 'c2', name: 'Tips', createdAt: at(2) },
      { id: 'c1', name: 'Fuel', createdAt: at(1) },
    ]);
    expect(all.map((c) => c.name)).toEqual([
      ...DEFAULT_CATEGORIES.map((c) => c.name),
      'Fuel',
      'Tips',
    ]);
    expect(all.at(-2).color).toBe(CUSTOM_COLORS[0]);
    expect(all.at(-1).color).toBe(CUSTOM_COLORS[1]);
    expect(all.at(-1).isCustom).toBe(true);
  });
});

describe('findCategory', () => {
  it('finds defaults and custom categories', () => {
    expect(findCategory('stay').name).toBe('Stay');
    expect(findCategory('c1', [{ id: 'c1', name: 'Fuel' }]).name).toBe('Fuel');
  });

  it('falls back to Other for unknown IDs', () => {
    expect(findCategory('gone').name).toBe('Other');
  });
});

describe('validateCategoryName', () => {
  it('requires 1–20 characters', () => {
    expect(validateCategoryName(' ')).toBe('Enter a category name.');
    expect(validateCategoryName('a'.repeat(21))).toBe('Use 20 characters or fewer.');
    expect(validateCategoryName('Fuel')).toBeNull();
  });

  it('rejects default names and existing custom names, ignoring capitals', () => {
    expect(validateCategoryName('food')).toBe('Food already exists.');
    expect(validateCategoryName(' TIPS ', [{ id: 'c1', name: 'Tips' }])).toBe(
      'Tips already exists.',
    );
  });
});
