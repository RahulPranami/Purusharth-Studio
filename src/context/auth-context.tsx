import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Session, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  avatar_key: string | null;
  avatar_url: string | null;
  selfie_key: string | null;
  selfie_url: string | null;
  role: 'super_admin' | 'admin' | 'client';
  status: 'active' | 'suspended' | 'pending';
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signInWithOtp: (contact: string, isRegister?: boolean, fullName?: string, inviteCode?: string) => Promise<{ success: boolean; message?: string; isEmail?: boolean }>;
  verifyOtp: (contact: string, token: string) => Promise<{ success: boolean; message?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile:', error.message);
        return null;
      }
      return data as Profile;
    } catch (e) {
      console.error('Exception fetching profile:', e);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const p = await fetchProfile(user.id);
      if (p) setProfile(p);
    }
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id)
            .then((p) => {
              setProfile(p);
              setLoading(false);
            })
            .catch(() => {
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Error retrieving session:', err);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithOtp = async (contact: string, isRegister = false, fullName?: string, inviteCode?: string) => {
    try {
      const trimmed = contact.trim();
      const isEmail = trimmed.includes('@');

      const dataPayload: Record<string, any> = {};
      if (fullName) dataPayload.full_name = fullName;
      if (inviteCode) dataPayload.invite_code = inviteCode.trim().toUpperCase();

      if (isEmail) {
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmed.toLowerCase(),
          options: {
            shouldCreateUser: true,
            data: dataPayload,
          },
        });
        if (error) return { success: false, message: error.message, isEmail: true };
        return { success: true, isEmail: true, message: 'OTP sent to your email address.' };
      } else {
        let phoneFormatted = trimmed.replace(/\s+/g, '');
        if (!phoneFormatted.startsWith('+')) {
          phoneFormatted = '+91' + phoneFormatted; // default to +91 if Indian standard without prefix
        }
        const { error } = await supabase.auth.signInWithOtp({
          phone: phoneFormatted,
          options: {
            shouldCreateUser: true,
            data: dataPayload,
          },
        });
        if (error) return { success: false, message: error.message, isEmail: false };
        return { success: true, isEmail: false, message: 'OTP sent to your mobile number.' };
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to send OTP.' };
    }
  };

  const verifyOtp = async (contact: string, token: string) => {
    try {
      const trimmed = contact.trim();
      const isEmail = trimmed.includes('@');

      if (isEmail) {
        const { data, error } = await supabase.auth.verifyOtp({
          email: trimmed.toLowerCase(),
          token: token.trim(),
          type: 'email',
        });
        if (error) return { success: false, message: error.message };
        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          const p = await fetchProfile(data.user!.id);
          setProfile(p);
        }
        return { success: true };
      } else {
        let phoneFormatted = trimmed.replace(/\s+/g, '');
        if (!phoneFormatted.startsWith('+')) {
          phoneFormatted = '+91' + phoneFormatted;
        }
        const { data, error } = await supabase.auth.verifyOtp({
          phone: phoneFormatted,
          token: token.trim(),
          type: 'sms',
        });
        if (error) return { success: false, message: error.message };
        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          const p = await fetchProfile(data.user!.id);
          setProfile(p);
        }
        return { success: true };
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'OTP verification failed.' };
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) return { success: false, message: error.message };
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        const p = await fetchProfile(data.user.id);
        setProfile(p);
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Sign in failed.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) return { success: false, error: error.message };
      await refreshProfile();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAuthenticated: !!user,
        signInWithOtp,
        verifyOtp,
        signInWithPassword,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
