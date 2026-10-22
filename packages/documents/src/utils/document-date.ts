/** Preserve calendar dates without guessing between month-first and day-first input. */
export function documentDate(value: string | null): string | null {
  if (!value) return null;
  let year: number, month: number, day: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value.trim());
  if (iso) [, year, month, day] = iso.map(Number) as [number, number, number, number];
  else {
    const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
    if (!local) return null;
    const first = Number(local[1]), second = Number(local[2]); year = Number(local[3]);
    if (first > 12 && second <= 12) { day = first; month = second; }
    else if (second > 12 && first <= 12) { day = second; month = first; }
    else return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || year > 9999 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
