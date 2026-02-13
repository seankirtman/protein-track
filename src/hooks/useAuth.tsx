"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { type User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Timeout fallback - show sign-in UI fast if auth hangs
    const timeout = setTimeout(() => setLoading(false), 1500);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      clearTimeout(timeout);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        setProfile({
          displayName: data.display_name ?? "",
          email: data.email ?? "",
          weight: data.weight,
          height: data.height,
          age: data.age,
          activityLevel: data.activity_level,
          goal: data.goal,
          dailyProteinGoal: data.daily_protein_goal,
          dailyCalorieGoal: data.daily_calorie_goal,
        });
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const u = userData.user;
        const newProfile = {
          id: userId,
          display_name: u?.user_metadata?.full_name ?? "User",
          email: u?.email ?? "",
        };
        await supabase.from("profiles").upsert(newProfile, { onConflict: "id" });
        setProfile({
          displayName: newProfile.display_name,
          email: newProfile.email,
        });
      }
    } catch {
      setProfile({ displayName: "User", email: "" });
    }
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined)
    throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
