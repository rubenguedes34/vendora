const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** API sends 'Mar 26' (English); re-format with the given locale when it parses. */
export function monthLabel(label: string, locale: string): string {
  const m = /^([A-Z][a-z]{2}) (\d{2})$/.exec(label);
  const idx = m ? MONTHS.indexOf(m[1]) : -1;
  if (!m || idx < 0) return label;
  return new Date(2000 + Number(m[2]), idx, 1).toLocaleDateString(locale, {
    month: 'short',
    year: '2-digit',
  });
}
