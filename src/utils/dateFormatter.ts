/**
 * Utility functions for consistent 12-hour time formatting and timezone-safe date formatting.
 */

export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(dateStr);
};

export const formatTime12h = (timeStr?: string | null): string => {
  if (!timeStr) return '';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2).padStart(2, '0');
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
};

export const formatDateSafe = (dateStr?: string | null, includeYear = false): string => {
  if (!dateStr) return '';
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const [year, month, day] = parts;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const monthName = months[month - 1] || '';
    if (includeYear) {
      return `${day} ${monthName} ${year}`;
    }
    return `${day} ${monthName}`;
  }
  return dateStr;
};

export const formatDateRangeSafe = (dueDate?: string | null, endDate?: string | null): string => {
  if (!dueDate) return '';
  const startFormatted = formatDateSafe(dueDate);
  if (endDate && endDate.trim() !== '' && endDate !== dueDate && endDate > dueDate) {
    const endFormatted = formatDateSafe(endDate);
    return `${startFormatted} - ${endFormatted}`;
  }
  return startFormatted;
};
