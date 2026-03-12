import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  email: string;
  role: "user" | "admin";
  disabled: boolean;
  user_tag: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: "user" | "admin" | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserTag: (tag: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const p = await fetchProfile(userId);
    setProfile(p);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await loadProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const updateUserTag = async (tag: string): Promise<{ error: string | null }> => {
    if (!user) return { error: "Not authenticated" };
    const clean = tag.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!clean) return { error: "Tag must contain letters, numbers, or underscores" };
    const { error } = await supabase
      .from("profiles")
      .update({ user_tag: clean })
      .eq("id", user.id);
    if (error) {
      if (error.code === "23505") return { error: `@${clean} is already taken` };
      return { error: error.message };
    }
    setProfile((prev) => prev ? { ...prev, user_tag: clean } : prev);
    return { error: null };
  };

  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider value={{
      user, session, profile, role: profile?.role ?? null, isAdmin, loading,
      signIn, signUp, signOut, refreshProfile, updateUserTag,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
