// src/lib/csvExport.js

/**
 * Exports data to a CSV file in the browser with UTF-8 BOM support for Arabic text.
 * @param {string} filename - Filename without extension
 * @param {Array<{ key: string, label: string }>} columns - Column definitions
 * @param {Array<Object>} rows - Data rows
 */
export function exportToCsv(filename, columns, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const bom = '\uFEFF'; // UTF-8 BOM for proper Arabic encoding in Excel
  const headerLine = columns.map((c) => `"${(c.label || c.key).replace(/"/g, '""')}"`).join(',');

  const rowLines = rows.map((row) =>
    columns
      .map((col) => {
        const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.key];
        const strVal = String(val ?? '');
        return `"${strVal.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = bom + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

