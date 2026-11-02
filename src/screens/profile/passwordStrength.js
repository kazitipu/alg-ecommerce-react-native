/**
 * Password checks for the Security screen. Firebase only requires 6
 * characters, so that is the one hard rule; the rest feed the strength meter.
 */
export const PASSWORD_RULES = [
  { key: 'length', label: 'At least 6 characters', test: value => value.length >= 6, required: true },
  { key: 'long', label: '10 or more characters', test: value => value.length >= 10 },
  { key: 'mixed', label: 'Upper and lower case letters', test: value => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { key: 'number', label: 'A number', test: value => /\d/.test(value) },
  { key: 'symbol', label: 'A symbol (e.g. ! @ #)', test: value => /[^A-Za-z0-9]/.test(value) },
];

const LEVELS = [
  { label: 'Too short', color: '#e11d48' },
  { label: 'Weak', color: '#f97316' },
  { label: 'Fair', color: '#eab308' },
  { label: 'Good', color: '#22c55e' },
  { label: 'Strong', color: '#059669' },
];

/**
 * `{ score 0-4, label, color, checks: [{ key, label, passed, required }] }`.
 * Anything under 6 characters scores 0.
 */
export const passwordStrength = input => {
  const value = typeof input === 'string' ? input : '';
  const checks = PASSWORD_RULES.map(rule => ({ key: rule.key, label: rule.label, required: Boolean(rule.required), passed: rule.test(value) }));
  const meetsMinimum = checks[0].passed;
  const extras = checks.slice(1).filter(check => check.passed).length;
  const score = meetsMinimum ? Math.min(4, 1 + extras) : 0;
  return { score, ...LEVELS[score], checks };
};

export default passwordStrength;
