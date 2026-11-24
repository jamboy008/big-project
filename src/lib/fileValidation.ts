import type { AllowedFileExtension, Locale } from '../types/api';

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

export const ALLOWED_EXTENSIONS: ReadonlyArray<AllowedFileExtension> = [
  'pdf',
  'docx',
  'xlsx',
  'csv',
  'txt',
  'png',
  'jpg',
  'jpeg',
];

const EXTENSION_TO_MIME: Record<AllowedFileExtension, ReadonlyArray<string>> = {
  pdf: ['application/pdf'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ],
  xlsx: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  csv: ['text/csv', 'application/csv', 'text/plain'],
  txt: ['text/plain'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
};

export interface FileValidationResult {
  valid: boolean;
  extension?: AllowedFileExtension;
  sanitizedName: string;
  errorCode?: 'EMPTY_FILE' | 'FILE_TOO_LARGE' | 'UNSUPPORTED_TYPE';
  errorMessage?: string;
}

export function sanitizeFileName(rawName: string): string {
  const base = rawName.split(/[\\/]/).pop() ?? 'file';
  return base.replace(/[^\w.\-\s()]/g, '_').trim().slice(0, 140) || 'document';
}

export function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  if (idx <= 0 || idx === fileName.length - 1) return '';
  return fileName.slice(idx + 1).toLowerCase();
}

export function validateAttachmentFile(
  file: { name: string; size: number; type: string },
  locale: Locale = 'uz',
): FileValidationResult {
  const sanitizedName = sanitizeFileName(file.name);
  const ext = getFileExtension(sanitizedName);

  if (!ALLOWED_EXTENSIONS.includes(ext as AllowedFileExtension)) {
    const messages: Record<Locale, string> = {
      uz: `Qo‘llab-quvvatlanmaydigan fayl formati: .${ext || 'noma’lum'}. Ruxsat etilganlar: PDF, DOCX, XLSX, CSV, TXT, PNG, JPG.`,
      en: `Unsupported file format: .${ext || 'unknown'}. Allowed: PDF, DOCX, XLSX, CSV, TXT, PNG, JPG.`,
      ru: `Неподдерживаемый формат файла: .${ext || 'неизвестно'}. Допустимые: PDF, DOCX, XLSX, CSV, TXT, PNG, JPG.`,
    };
    return {
      valid: false,
      sanitizedName,
      errorCode: 'UNSUPPORTED_TYPE',
      errorMessage: messages[locale],
    };
  }

  const typedExt = ext as AllowedFileExtension;
  const allowedMimes = EXTENSION_TO_MIME[typedExt];
  if (file.type && !allowedMimes.includes(file.type.toLowerCase())) {
    const messages: Record<Locale, string> = {
      uz: `Fayl MIME turi (${file.type}) kengaytmaga (.${typedExt}) mos kelmaydi.`,
      en: `File MIME type (${file.type}) does not match extension (.${typedExt}).`,
      ru: `MIME-тип файла (${file.type}) не соответствует расширению (.${typedExt}).`,
    };
    return {
      valid: false,
      sanitizedName,
      errorCode: 'UNSUPPORTED_TYPE',
      errorMessage: messages[locale],
    };
  }

  if (file.size <= 0) {
    const messages: Record<Locale, string> = {
      uz: 'Bo‘sh faylni yuklab bo‘lmaydi.',
      en: 'Empty files cannot be uploaded.',
      ru: 'Нельзя загрузить пустой файл.',
    };
    return {
      valid: false,
      sanitizedName,
      errorCode: 'EMPTY_FILE',
      errorMessage: messages[locale],
    };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const messages: Record<Locale, string> = {
      uz: 'Fayl hajmi 10 MB chegarasidan oshib ketdi.',
      en: 'File size exceeds the 10 MB limit.',
      ru: 'Размер файла превышает лимит 10 МБ.',
    };
    return {
      valid: false,
      sanitizedName,
      errorCode: 'FILE_TOO_LARGE',
      errorMessage: messages[locale],
    };
  }

  return {
    valid: true,
    extension: typedExt,
    sanitizedName,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
