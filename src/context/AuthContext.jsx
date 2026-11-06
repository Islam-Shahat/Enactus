import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';

const AuthContext = createContext(null);

// Local storage & session cache helpers for instantaneous auth rendering
const getCachedProfile = (uid) => {
  if (!uid) return null;
  try {
    const raw = sessionStorage.getItem(`enactus_p_${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getCachedRoles = (uid) => {
  if (!uid) return null;
  try {
    const raw = sessionStorage.getItem(`enactus_r_${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setCachedAuth = (uid, profileData, rolesData) => {
  if (!uid) return;
  try {
    if (profileData) sessionStorage.setItem(`enactus_p_${uid}`, JSON.stringify(profileData));
    if (rolesData) sessionStorage.setItem(`enactus_r_${uid}`, JSON.stringify(rolesData));
  } catch (_) {}
};

const clearCachedAuth = (uid) => {
  try {
    if (uid) {
      sessionStorage.removeItem(`enactus_p_${uid}`);
      sessionStorage.removeItem(`enactus_r_${uid}`);
    }
  } catch (_) {}
};

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
      if (!data.session) {
        setLoading(false);
      } else if (data.session.user?.id) {
        const cachedP = getCachedProfile(data.session.user.id);
        const cachedR = getCachedRoles(data.session.user.id);
        if (cachedP || cachedR) {
          if (cachedP) setProfile(cachedP);
          if (cachedR) setRoles(cachedR);
          setLoading(false);
        }
      }
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

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role, committee_id').eq('user_id', userId),
      ]);
      setProfile(profileRes.data ?? null);
      setRoles(rolesRes.data ?? []);
      setCachedAuth(userId, profileRes.data, rolesRes.data);
    } catch (err) {
      console.error('[AuthContext] Error refreshing profile:', err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    // Fast-path: use cached profile/roles so the user experiences zero spinner
    const cachedP = getCachedProfile(userId);
    const cachedR = getCachedRoles(userId);
    if (cachedP || cachedR) {
      if (cachedP) setProfile(cachedP);
      if (cachedR) setRoles(cachedR);
      setLoading(false);
    } else {
      setLoading(true);
    }

    (async () => {
      try {
        const [profileRes, rolesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('user_roles').select('role, committee_id').eq('user_id', userId),
        ]);
        if (cancelled) return;
        setProfile(profileRes.data ?? null);
        setRoles(rolesRes.data ?? []);
        setCachedAuth(userId, profileRes.data, rolesRes.data);
      } catch (err) {
        if (!cancelled) {
          console.error('[AuthContext] Error loading user profile/roles:', err);
          if (!cachedP) setProfile(null);
          if (!cachedR) setRoles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signIn = useCallback(async (email, password) => {
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (!res.error && res.data?.session) {
      const nextUser = res.data.user;
      setSession(res.data.session);
      if (nextUser?.id) {
        const cachedP = getCachedProfile(nextUser.id);
        const cachedR = getCachedRoles(nextUser.id);
        if (cachedP || cachedR) {
          if (cachedP) setProfile(cachedP);
          if (cachedR) setRoles(cachedR);
          setLoading(false);
        }
        // Fire parallel prefetch of profile & roles immediately
        Promise.all([
          supabase.from('profiles').select('*').eq('id', nextUser.id).maybeSingle(),
          supabase.from('user_roles').select('role, committee_id').eq('user_id', nextUser.id),
        ]).then(([profileRes, rolesRes]) => {
          setProfile(profileRes.data ?? null);
          setRoles(rolesRes.data ?? []);
          setLoading(false);
          setCachedAuth(nextUser.id, profileRes.data, rolesRes.data);
        }).catch((err) => {
          console.warn('[AuthContext] profile load error:', err);
          setLoading(false);
        });
      }
    }
    return res;
  }, []);

  const signOut = useCallback(async () => {
    clearCachedAuth(userId);
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
  }, [userId]);
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
      userRoles: roleNames,
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
      refreshProfile,
    };
  }, [session, profile, roles, loading, signIn, signOut, sendPasswordReset, updatePassword, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
