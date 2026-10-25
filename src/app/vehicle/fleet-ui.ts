/** Small wording helpers shared by the Vehicles screens. */

/** "expired 3 days ago" / "expires today" / "in 5 days" */
export function dueText(daysLeft: number, past = 'overdue'): string {
  if (daysLeft < 0) return `${past} ${-daysLeft} day${daysLeft === -1 ? '' : 's'}`;
  if (daysLeft === 0) return 'today';
  if (daysLeft === 1) return 'tomorrow';
  return `in ${daysLeft} days`;
}

/** 'oilChange' → 'Oil change', 'TireChange' → 'Tyre change', 'DocumentRenew' → 'Document renewal' */
export function prettyType(type: string | null | undefined): string {
  const special: Record<string, string> = { TireChange: 'Tyre change', DocumentRenew: 'Document renewal', EMI: 'EMI' };
  if (!type) return '';
  if (special[type]) return special[type];
  const words = type.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** yyyy-MM-dd in local time (toISOString would give yesterday's date before 5:30 am in India) */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "1 – 26 Oct" or "15 Sep – 14 Oct 2026" */
export function rangeLabel(from: string, to: string): string {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  const m = (d: Date) => d.toLocaleString('en-IN', { month: 'short' });
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} ${m(b)}`;
  if (a.getFullYear() === b.getFullYear()) return `${a.getDate()} ${m(a)} – ${b.getDate()} ${m(b)}`;
  return `${a.getDate()} ${m(a)} ${a.getFullYear()} – ${b.getDate()} ${m(b)} ${b.getFullYear()}`;
}

/** Icon for an expense category */
export function categoryIcon(category: string): string {
  switch (category) {
    case 'Fuel': return 'bi-fuel-pump-fill';
    case 'EMI': return 'bi-bank';
    case 'Repair': return 'bi-tools';
    case 'Service': return 'bi-gear-fill';
    case 'Tyre': return 'bi-circle';
    case 'Insurance': return 'bi-shield-check';
    case 'DocumentRenew': return 'bi-file-earmark-text';
    case 'Towing': return 'bi-truck';
    case 'Accident': return 'bi-exclamation-octagon';
    default: return 'bi-cash-stack';
  }
}
