/**
 * Format a date string for display in frontmatter (without time).
 * Output format: "Jan 01 2024"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
  const day = date.getUTCDate().toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month} ${day} ${year}`;
}

/**
 * Format a date string for display with time.
 * Output format: "Jan 01 2024 12:00 PM"
 */
export function formatDateWithTime(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
  const day = date.getUTCDate().toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  const time = date.toLocaleString('default', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
  return `${month} ${day} ${year} ${time}`;
}

/**
 * Format a date string for use in folder names.
 * Output format: "2024-01-01"
 */
export function formatDateForFolder(dateString: string): string {
  return new Date(dateString).toISOString().split('T')[0];
}
