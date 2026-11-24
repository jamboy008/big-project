import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SafeMarkdown } from '../../src/components/SafeMarkdown';
import { sanitizeHref } from '../../src/lib/sanitizeUrl';
import { validateAttachmentFile } from '../../src/lib/fileValidation';

describe('SafeMarkdown & XSS Sanitization', () => {
  it('escapes raw HTML tags and prevents script/onerror execution', () => {
    const closeScript = ['<', '/script>'].join('');
    const xssPayload =
      `Salom <script>window.__xss=1${closeScript} va <img src=x onerror=alert(1)>`;
    const { container } = render(<SafeMarkdown content={xssPayload} />);

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain(`<script>window.__xss=1${closeScript}`);
  });

  it('blocks javascript: and data: links while allowing https links', () => {
    const closeScript = ['<', '/script>'].join('');
    const jsSchemeUrl = ['java', 'script:alert(1)'].join('');
    expect(sanitizeHref(jsSchemeUrl)).toBeNull();
    expect(sanitizeHref(`data:text/html,<script>alert(1)${closeScript}`)).toBeNull();
    expect(sanitizeHref('https://aljabr.uz/docs')).toBe('https://aljabr.uz/docs');

    const { container } = render(
      <SafeMarkdown content={`[Click](${jsSchemeUrl}) and [Docs](https://aljabr.uz)`} />,
    );
    const anchors = container.querySelectorAll('a');
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toHaveAttribute('href', 'https://aljabr.uz/');
  });

  it('renders Markdown headings, tables, lists, and fenced code blocks', () => {
    const md = [
      '### Hisobot',
      '',
      '| Ko‘rsatkich | Qiymat |',
      '|---|---|',
      '| SLA | 99.1% |',
      '',
      '- Birinchi band',
      '- Ikkinchi band',
      '',
      '```ts',
      'const status = "ok";',
      '```',
    ].join('\n');

    render(<SafeMarkdown content={md} />);
    expect(screen.getByText('Hisobot')).toBeInTheDocument();
    expect(screen.getByText('SLA')).toBeInTheDocument();
    expect(screen.getByText('99.1%')).toBeInTheDocument();
    expect(screen.getByText('Birinchi band')).toBeInTheDocument();
    expect(screen.getByText('const status = "ok";')).toBeInTheDocument();
  });
});

describe('File Attachment Validation', () => {
  it('accepts supported corporate formats within 10 MB', () => {
    const pdf = validateAttachmentFile(
      { name: 'contract.pdf', size: 1024 * 500, type: 'application/pdf' },
      'uz',
    );
    const xlsx = validateAttachmentFile(
      {
        name: 'inventory.xlsx',
        size: 2048,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      'en',
    );
    const png = validateAttachmentFile(
      { name: 'diagram.png', size: 4096, type: 'image/png' },
      'ru',
    );

    expect(pdf.valid).toBe(true);
    expect(xlsx.valid).toBe(true);
    expect(png.valid).toBe(true);
  });

  it('rejects unsupported extensions, mismatched MIME types, empty files, and >10 MB files', () => {
    const htmlFile = validateAttachmentFile(
      { name: 'payload.html', size: 512, type: 'text/html' },
      'en',
    );
    const exeFile = validateAttachmentFile(
      { name: 'malware.exe', size: 512, type: 'application/octet-stream' },
      'en',
    );
    const emptyFile = validateAttachmentFile(
      { name: 'notes.txt', size: 0, type: 'text/plain' },
      'en',
    );
    const hugeFile = validateAttachmentFile(
      { name: 'dump.pdf', size: 11 * 1024 * 1024, type: 'application/pdf' },
      'en',
    );

    expect(htmlFile.valid).toBe(false);
    expect(exeFile.valid).toBe(false);
    expect(emptyFile.valid).toBe(false);
    expect(hugeFile.valid).toBe(false);
  });
});
