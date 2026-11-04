// supabase/functions/_shared/turnstile.ts

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');

  // Fail-closed: require the secret unless insecure local dev bypass is explicitly enabled
  if (!secretKey) {
    const allowBypass = Deno.env.get('ALLOW_INSECURE_DEV_BYPASS') === 'true';
    if (allowBypass) {
      console.warn('[turnstile] TURNSTILE_SECRET_KEY not set. ALLOW_INSECURE_DEV_BYPASS=true, bypassing.');
      return { success: true };
    }
    console.error('[turnstile] TURNSTILE_SECRET_KEY is missing. Failing closed.');
    return { success: false, error: 'Security verification service is misconfigured' };
  }

  if (!token) {
    return { success: false, error: 'CAPTCHA token is missing' };
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!data.success) {
      console.warn('[turnstile] verification failed:', data['error-codes']);
      return { success: false, error: 'Security verification failed. Please try again.' };
    }
    return { success: true };
  } catch (err) {
    console.error('[turnstile] verification network error:', err);
    return { success: false, error: 'Failed to verify security token' };
  }
}
