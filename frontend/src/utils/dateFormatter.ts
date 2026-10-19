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

      // Pure date format YYYY-MM-DD without time or timezone (e.g. "2026-10-19")
      const ymdOnlyMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (ymdOnlyMatch) {
        const [, y, m, d] = ymdOnlyMatch;
        return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
      }

      const slashOnlyMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      if (slashOnlyMatch) {
        const [, y, m, d] = slashOnlyMatch;
        return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
      }

      // If it contains time/timezone (e.g. "2026-10-18T18:30:00.000Z"), convert to local Date
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
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

/**
 * Returns YYYY-MM-DD format suitable for HTML <input type="date"> in the user's local timezone.
 */
export const formatDateForInput = (dateInput?: string | Date | number | null): string => {
  if (!dateInput) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
