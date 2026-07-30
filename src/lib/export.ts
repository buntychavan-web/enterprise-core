/**
 * CSV export helpers used by every list screen.
 *
 * Values are serialised defensively: leading `=`, `+`, `-` and `@` are escaped
 * so spreadsheet applications cannot interpret exported cells as formulas.
 */

function serialize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCell(value: unknown): string {
  let text = serialize(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export type ExportColumn<T> = {
  key: string;
  header: string;
  value: (row: T) => unknown;
};

export function toCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(","));
  return [head, ...body].join("\r\n");
}

export function downloadCsv<T>(filename: string, rows: T[], columns: ExportColumn<T>[]): void {
  const csv = toCsv(rows, columns);
  // BOM keeps Excel from mangling non-ASCII names.
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** `employees-2026-07-30.csv` */
export function timestampedName(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}
