/**
 * Unified Date Formatter for VidyaSetu Platform
 * Standardizes all date representations in tables and pages to DD-MM-YYYY format.
 */

export const formatDate = (dateInput?: string | Date | number | null): string => {
  if (!dateInput) return '—';
  
  try {
    // If it's a string, handle ISO / YYYY-MM-DD directly for speed and timezone safety
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'N/A' || trimmed === '—') {
        return '—';
      }

      // Check if already DD-MM-YYYY
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        return trimmed;
      }

      // Split date portion if contains time (T or space)
      const datePart = trimmed.split('T')[0].split(' ')[0];
      const ymdMatch = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (ymdMatch) {
        const [, y, m, d] = ymdMatch;
        return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
      }

      const slashMatch = datePart.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      if (slashMatch) {
        const [, y, m, d] = slashMatch;
        return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
      }
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return typeof dateInput === 'string' ? dateInput : '—';
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return typeof dateInput === 'string' ? dateInput : '—';
  }
};

export const fmtDate = formatDate;

export const formatDateTime = (dateInput?: string | Date | number | null): string => {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${mins}`;
  } catch {
    return '—';
  }
};
