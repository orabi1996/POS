/**
 * Business Date and Timezone Utilities
 * Defaults to Africa/Cairo (Egypt) timezone.
 */

export const DEFAULT_TIMEZONE = 'Africa/Cairo';

export function getBusinessDate(timeZone: string = DEFAULT_TIMEZONE, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // YYYY-MM-DD
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function getBusinessTime(timeZone: string = DEFAULT_TIMEZONE, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return formatter.format(date); // HH:MM:SS
  } catch {
    return date.toTimeString().slice(0, 8);
  }
}

export function getBusinessDateTime(timeZone: string = DEFAULT_TIMEZONE, date: Date = new Date()): {
  date: string;
  time: string;
  iso: string;
} {
  return {
    date: getBusinessDate(timeZone, date),
    time: getBusinessTime(timeZone, date),
    iso: date.toISOString(),
  };
}

export function formatInvoiceNumber(branchId: string, seq: number, timeZone: string = DEFAULT_TIMEZONE): string {
  const bDate = getBusinessDate(timeZone).replace(/-/g, '');
  const paddedSeq = seq.toString().padStart(6, '0');
  return `${branchId}-${bDate}-${paddedSeq}`;
}
