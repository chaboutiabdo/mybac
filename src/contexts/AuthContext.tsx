import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

// the generated row type, not a hand-rolled copy: the local interface omitted
// subscription_status/subscription_tier and narrowed `role` to its own union,
// which is how six divergent Profile shapes accumulated across the codebase
type Profile = Tables<"profiles">;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
    phone?: string,
    plan?: string,
  ) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  /** Re-reads the profile row. Settings used to window.location.reload(). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // `loading` must stay true until the profile resolves, not just the session.
    // ProtectedRoute redirects on `!user || !profile`, so releasing the flag
    // early bounced authenticated users to /login on every cold load.
    const applySession = (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // deferred: calling back into supabase synchronously from within
      // onAuthStateChange can deadlock the client
      const userId = session.user.id;
      setTimeout(async () => {
        await fetchUserProfile(userId);
        if (active) setLoading(false);
      }, 0);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));

    supabase.auth.getSession().then(({ data: { session } }) => applySession(session));

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      // Swallowing this left `profile` null forever while supabase.auth still
      // reported the user as signed in — an unexplained redirect loop.
      console.error("Error fetching user profile:", error);
      setProfile(null);
      toast.error("تعذّر تحميل ملفك الشخصي", { description: error instanceof Error ? error.message : "Please try signing in again." });
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone?: string,
    plan = "free",
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name,
            phone: phone,
            role: "student", // Default role
            initial_plan: plan, // Store the initially selected plan
          },
        },
      });

      if (error) {
        toast.error("تعذّر إنشاء الحساب", { description: error.message });
        return { error };
      }

      if (plan === "free") {
        toast.success("تم إنشاء الحساب", { description: "تحقّق من بريدك لتأكيد حسابك. سيُفعَّل العرض المجاني بعد التأكيد." });
      } else if (plan === "premium") {
        toast.success("تم إنشاء الحساب", { description: "تحقّق من بريدك لتأكيد حسابك. سنعالج طلب الاشتراك المميّز قريبًا." });
      } else {
        toast.success("تم إنشاء الحساب", { description: "تحقّق من بريدك لتأكيد حسابك." });
      }

      return { error: null };
    } catch (error) {
      console.error("Sign up error:", error);
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("تعذّر تسجيل الدخول", { description: error.message });
        return { error };
      }

      // Check if there's a selected plan in sessionStorage
      const plan = sessionStorage.getItem("selectedPlan");
      if (plan === "free") {
        toast.success("أهلًا بك", { description: "تم تفعيل العرض المجاني" });
        sessionStorage.removeItem("selectedPlan");
      } else if (plan === "premium") {
        // For premium, we'll handle it separately through support requests
        toast.success("أهلًا بك", { description: "طلب اشتراكك المميّز قيد المعالجة" });
        sessionStorage.removeItem("selectedPlan");
      } else {
        toast.success("أهلًا بعودتك", { description: "تم تسجيل دخولك." });
      }

      return { error: null };
    } catch (error) {
      console.error("Sign in error:", error);
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
        toast.error("تعذّر تسجيل الخروج", { description: error.message });
      } else {
        toast.success("تم تسجيل الخروج", { description: "تم تسجيل خروجك." });
      }
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchUserProfile(user.id);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
