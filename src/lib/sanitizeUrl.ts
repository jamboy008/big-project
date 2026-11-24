const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function stripControlAndWhitespace(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 32) {
      out += value[i];
    }
  }
  return out;
}

export function sanitizeHref(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Allow strictly relative path links starting with single slash (not protocol-relative //)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  const normalized = stripControlAndWhitespace(trimmed);
  try {
    const parsed = new URL(normalized);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
