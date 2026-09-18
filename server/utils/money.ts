/**
 * Precision Money Utilities
 * Avoids 0.1 + 0.2 floating point inaccuracies in currency computations.
 */

export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100);
}

export function fromCents(cents: number): number {
  return roundMoney(cents / 100);
}
