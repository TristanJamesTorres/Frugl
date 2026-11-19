import { apiUser, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PUT(request: Request) {
  let account: Awaited<ReturnType<typeof apiUser>>;
  try {
    account = await apiUser();
  } catch (error) {
    console.error('Could not verify the account for a private contact update:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Could not verify your account. Refresh and sign in again.' }, 401);
  }

  const { user, profile } = account;
  if (!user) return json({ error: 'Please sign in again.' }, 401);
  if (profile?.status !== 'active') return json({ error: 'Your account is suspended.' }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }

  const contactNumber =
    typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>).contactNumber
      : undefined;
  if (typeof contactNumber !== 'string' || contactNumber.length > 50) {
    return json({ error: 'Enter a valid contact number.' }, 400);
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('profile_private')
      .upsert({ id: user.id, contact_number: contactNumber.trim() || null }, { onConflict: 'id' });
    if (error) {
      console.error('Could not save private contact details:', error.message);
      return json({ error: 'Could not save your private contact number. Please try again.' }, 500);
    }
  } catch (error) {
    console.error('Private contact updates are unavailable:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Private contact updates are temporarily unavailable.' }, 503);
  }

  return json({ ok: true });
}
