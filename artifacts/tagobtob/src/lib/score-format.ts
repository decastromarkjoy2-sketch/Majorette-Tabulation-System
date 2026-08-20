export const TABULATION_DECIMAL_PLACES = 8;
export const TABULATION_AVERAGE_DECIMAL_PLACES = 2;

export function formatTabulationScore(value: number): string {
  return value.toFixed(TABULATION_DECIMAL_PLACES);
}

export function formatTabulationAverage(value: number): string {
  return value.toFixed(TABULATION_AVERAGE_DECIMAL_PLACES);
}