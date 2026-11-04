// supabase/functions/_shared/turnstile.ts

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');

  // In dev / test when secret key is not provided, allow bypassing with warning
  if (!secretKey) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not set. Skipping verification in dev.');
    return { success: true };
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

