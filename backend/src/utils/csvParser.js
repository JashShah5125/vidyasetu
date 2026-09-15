/**
 * Utility to parse CSV content into array of objects based on header row.
 */
function parseCsv(csvText) {
    if (!csvText || typeof csvText !== 'string') return [];

    const lines = [];
    let currentLine = [];
    let currentToken = '';
    let insideQuotes = false;

    // Normalize line endings
    const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < normalized.length; i++) {
        const char = normalized[i];
        const nextChar = normalized[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentToken += '"';
                i++; // skip escaped quote
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentLine.push(currentToken.trim());
            currentToken = '';
        } else if (char === '\n' && !insideQuotes) {
            currentLine.push(currentToken.trim());
            if (currentLine.some(token => token.length > 0)) {
                lines.push(currentLine);
            }
            currentLine = [];
            currentToken = '';
        } else {
            currentToken += char;
        }
    }

    if (currentToken || currentLine.length > 0) {
        currentLine.push(currentToken.trim());
        if (currentLine.some(token => token.length > 0)) {
            lines.push(currentLine);
        }
    }

    if (lines.length < 2) return [];

    const headers = lines[0].map(h => h.trim().toLowerCase().replace(/[\s\-_]+/g, '_'));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = line[j] !== undefined ? line[j] : '';
        }
        rows.push(row);
    }

    return rows;
}

/**
 * Normalizes status representation to:
 * 1 (Present), 2 (Late), 0 (Absent), or null (Unmarked/Invalid)
 */
function normalizeAttendanceStatus(rawStatus) {
    if (rawStatus === null || rawStatus === undefined) return null;
    const str = String(rawStatus).trim().toLowerCase();
    if (['1', 'present', 'p', 'yes', 'y', 'true'].includes(str)) return 1;
    if (['2', 'late', 'l'].includes(str)) return 2;
    if (['0', 'absent', 'a', 'no', 'n', 'false', 'abs'].includes(str)) return 0;
    return null;
}

module.exports = {
    parseCsv,
    normalizeAttendanceStatus
};
