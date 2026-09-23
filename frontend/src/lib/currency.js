export const CURRENCY_LIST = [
  { code: 'INR', symbol: '₹', label: 'INR — ₹ (Indian Rupee)' },
  { code: 'USD', symbol: '$', label: 'USD — $ (US Dollar)' },
  { code: 'EUR', symbol: '€', label: 'EUR — € (Euro)' },
  { code: 'AED', symbol: 'د.إ', label: 'AED — د.إ (UAE Dirham)' }
];

export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  AED: 'د.إ'
};

export function getCurrencySymbol(code) {
  if (!code) return '₹';
  return CURRENCY_SYMBOLS[code] || '₹';
}
