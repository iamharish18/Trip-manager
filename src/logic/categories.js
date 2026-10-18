// Expense categories (SPEC §7). Defaults live here with fixed IDs; custom
// ones are stored per trip and get the next colour from CUSTOM_COLORS.

export const CATEGORY_NAME_MAX = 20;

export const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food', icon: 'silverware-fork-knife', color: '#DB2777' },
  { id: 'stay', name: 'Stay', icon: 'bed-outline', color: '#4F46E5' },
  { id: 'travel', name: 'Travel', icon: 'car-outline', color: '#16A34A' },
  { id: 'activities', name: 'Activities', icon: 'ticket-outline', color: '#EA580C' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping-outline', color: '#9333EA' },
  { id: 'other', name: 'Other', icon: 'dots-horizontal-circle-outline', color: '#64748B' },
];

export const DEFAULT_CATEGORY_IDS = DEFAULT_CATEGORIES.map((c) => c.id);

export const CUSTOM_COLORS = ['#0891B2', '#CA8A04', '#DC2626', '#2563EB', '#65A30D', '#C026D3'];

const CUSTOM_ICON = 'tag-outline';

// Defaults first, then custom ones in the order they were created.
export function allCategories(customCategories = []) {
  const time = (c) => c.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
  const custom = [...customCategories]
    .sort((a, b) => time(a) - time(b) || a.name.localeCompare(b.name))
    .map((c, index) => ({
      id: c.id,
      name: c.name,
      icon: CUSTOM_ICON,
      color: CUSTOM_COLORS[index % CUSTOM_COLORS.length],
      isCustom: true,
    }));
  return [...DEFAULT_CATEGORIES, ...custom];
}

// Looks up a category; unknown IDs (e.g. a deleted custom one) fall back to Other.
export function findCategory(categoryId, customCategories = []) {
  const all = allCategories(customCategories);
  return all.find((c) => c.id === categoryId) ?? DEFAULT_CATEGORIES.at(-1);
}

export function validateCategoryName(name, customCategories = []) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'Enter a category name.';
  if (trimmed.length > CATEGORY_NAME_MAX) return `Use ${CATEGORY_NAME_MAX} characters or fewer.`;
  const lower = trimmed.toLowerCase();
  const clash = [...DEFAULT_CATEGORIES, ...customCategories].find(
    (c) => c.name.trim().toLowerCase() === lower,
  );
  if (clash) return `${clash.name} already exists.`;
  return null;
}
