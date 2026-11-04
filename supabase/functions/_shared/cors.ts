// supabase/functions/_shared/cors.ts

export function getCorsHeaders(req: Request): HeadersInit {
  const siteOriginsEnv = Deno.env.get('SITE_ORIGINS') || '';
  const allowedOrigins = siteOriginsEnv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const requestOrigin = req.headers.get('origin') || '';

  // In development (no SITE_ORIGINS set), allow localhost / request origin
  const isAllowed =
    allowedOrigins.length === 0 ||
    allowedOrigins.includes('*') ||
    allowedOrigins.includes(requestOrigin);

  const originHeader = isAllowed && requestOrigin ? requestOrigin : (allowedOrigins[0] || '*');

  return {
    'Access-Control-Allow-Origin': originHeader,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  };
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: getCorsHeaders(req),
    });
  }
  return null;
}

export function checkOrigin(req: Request): Response | null {
  const siteOriginsEnv = Deno.env.get('SITE_ORIGINS') || '';
  const allowedOrigins = siteOriginsEnv
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) return null;

  const origin = req.headers.get('origin');
  if (origin && !allowedOrigins.includes(origin) && !allowedOrigins.includes('*')) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(req),
      },
    });
  }
  return null;
}

