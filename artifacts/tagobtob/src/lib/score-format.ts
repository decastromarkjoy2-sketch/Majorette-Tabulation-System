export const TABULATION_DECIMAL_PLACES = 8;

export function formatTabulationScore(value: number): string {
  return value.toFixed(TABULATION_DECIMAL_PLACES);
}