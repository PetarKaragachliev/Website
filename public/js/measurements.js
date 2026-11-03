export function parseMetric(value, min, max, whole = false) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  if (!(whole ? /^\d+$/ : /^\d+(?:[.,]\d)?$/).test(text)) return null;
  const number = Number(text.replace(',', '.'));
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}
