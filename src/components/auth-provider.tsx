"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import {
  getEffectiveTier,
  getTrialDaysLeft,
  type TierName,
  type UserProfile,
  type UsageData,
} from "@/lib/tiers";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: UserProfile | null;
  usage: UsageData | null;
  effectiveTier: TierName;
  trialDaysLeft: number;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  profile: null,
  usage: null,
  effectiveTier: "free",
  trialDaysLeft: 0,
  refreshProfile: async () => {},
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const supabase = createBrowserSupabaseClient();

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setUsage(data.usage);
      }
    } catch {
      // Profile fetch failed — user may not have a profile yet
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      if (user) fetchProfile();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      setLoading(false);
      if (newUser) {
        // Small delay to allow trigger to create profile on signup
        setTimeout(fetchProfile, 500);
      } else {
        setProfile(null);
        setUsage(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const effectiveTier: TierName = profile
    ? getEffectiveTier(profile)
    : "free";

  const trialDaysLeft = profile ? getTrialDaysLeft(profile.trial_end) : 0;

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    return {};
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setUsage(null);
    window.location.href = "/";
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        profile,
        usage,
        effectiveTier,
        trialDaysLeft,
        refreshProfile,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
