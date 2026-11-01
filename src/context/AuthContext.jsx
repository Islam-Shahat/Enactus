import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]); // [{ role, committee_id }]
  const [loading, setLoading] = useState(isSupabaseConfigured);

  // 1) Track the Supabase session.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    // Keep this callback synchronous: awaiting Supabase calls inside it can deadlock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // 2) Load profile + roles whenever the signed-in user changes.
  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [profileRes, rolesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('user_roles').select('role, committee_id').eq('user_id', userId),
        ]);
        if (cancelled) return;
        setProfile(profileRes.data ?? null);
        setRoles(rolesRes.data ?? []);
      } catch (err) {
        if (!cancelled) {
          console.error('[AuthContext] Error loading user profile/roles:', err);
          setProfile(null);
          setRoles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signIn = useCallback(
    (email, password) => supabase.auth.signInWithPassword({ email, password }),
    [],
  );
  const signOut = useCallback(async () => {
    setSession(null);
    setProfile(null);
    setRoles([]);
    setLoading(false);
    queryClient.clear();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AuthContext] signOut error:', err);
    }
  }, []);
  const sendPasswordReset = useCallback(
    (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }),
    [],
  );
  const updatePassword = useCallback((password) => supabase.auth.updateUser({ password }), []);

  const value = useMemo(() => {
    const roleNames = roles.map((r) => r.role);
    const isSuperAdmin = roleNames.includes('super_admin');
    return {
      session,
      user: session?.user ?? null,
      profile,
      roles,
      loading,
      isAuthenticated: Boolean(session),
      isSuperAdmin,
      /** True if the user has ANY of the given roles (super_admin always passes). */
      hasRole: (...allowed) => {
        if (isSuperAdmin) return true;
        const list = allowed.flat();
        if (list.length === 0) return isSuperAdmin;
        return list.some((r) => roleNames.includes(r));
      },
      /** True if the user heads this committee (or is super_admin). */
      isHeadOf: (committeeId) =>
        isSuperAdmin || roles.some((r) => r.role === 'committee_head' && r.committee_id === committeeId),
      /** Any elevated role beyond plain member. */
      isStaff: roleNames.some((r) => r !== 'member'),
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
    };
  }, [session, profile, roles, loading, signIn, signOut, sendPasswordReset, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
