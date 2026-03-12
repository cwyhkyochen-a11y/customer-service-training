import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export async function parseExcel(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const lines: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (data.length === 0) continue;

    lines.push(`## ${sheetName}`);
    const headers = Object.keys(data[0]);
    lines.push(headers.join(' | '));

    for (const row of data) {
      lines.push(headers.map((h) => String(row[h] ?? '')).join(' | '));
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function parseWord(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function parseFile(filePath: string, fileType: 'excel' | 'doc'): Promise<string> {
  if (fileType === 'excel') {
    return parseExcel(filePath);
  }
  return parseWord(filePath);
}
