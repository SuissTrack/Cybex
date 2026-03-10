import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { logger } from '../lib/logger';

export async function parseCvText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text.trim();
    }

    // For .doc/.docx, return placeholder (would need mammoth or similar in production)
    logger.warn(`CV parsing for ${ext} not fully implemented; returning empty string`);
    return '';
  } catch (err) {
    logger.error('CV parse error', { err, filePath });
    return '';
  }
}
