// supabase/functions/_shared/http.ts
import { getCorsHeaders } from './cors.ts';

export function json(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(req),
    },
  });
}

export function errorResponse(
  req: Request,
  message = 'Internal server error',
  status = 500,
  code?: string
): Response {
  return json(
    req,
    {
      error: message,
      ...(code ? { code } : {}),
    },
    status
  );
}

export function getClientIp(req: Request): string {
  // Prefer Cloudflare connecting IP, then X-Real-IP, then first untrusted hop of X-Forwarded-For
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const first = xForwardedFor.split(',')[0].trim();
    if (first) return first;
  }

  return '127.0.0.1';
}

export function sanitizeText(val: string): string {
  if (typeof val !== 'string') return '';
  // Strip control characters except \n, \r, \t
  return val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}
