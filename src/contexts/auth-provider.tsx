"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { onAuthStateChange } from "@/lib/supabase-auth";
import { saveUser } from "@/lib/supabase-db";
import { supabase } from "@/lib/supabase";
import SplashScreen from "@/components/layout/splash-screen";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoggedIn: boolean;
  role: "admin" | "student" | null;
  branch: string | null;
  isAdmin: boolean;
  displayName: string | null;
  refetchProfile: (userId: string) => Promise<void>;
  loginAsDeveloper: () => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isLoggedIn: false,
  role: null,
  branch: null,
  isAdmin: false,
  displayName: null,
  refetchProfile: async () => {},
  loginAsDeveloper: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const [role, setRole] = useState<"admin" | "student" | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const loginAsDeveloper = () => {
    const devUser: User = {
      id: "dev-user-id",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
      email: "developer@example.com",
    } as User;

    setUser(devUser);
    setRole("admin");
    setBranch("scientific");
    setDisplayName("Developer");
    setLoading(false);
    setProfileLoading(false);
    
    // Store flag in localStorage to persist dev session
    localStorage.setItem("isDevSession", "true");
  };

  const logout = async () => {
    try {
      // Clear dev session
      localStorage.removeItem("isDevSession");
      
      // Clear local state
      setUser(null);
      setRole(null);
      setBranch(null);
      setDisplayName(null);
      
      // Sign out from Supabase
      const { signOut } = await import("@/lib/supabase-auth");
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // ----------------------------
  //     refetchProfile()
  // ----------------------------
  const refetchProfile = useCallback(async (userId: string) => {
    // Skip if dev user
    if (userId === "dev-user-id") return;

    try {
      console.log("🔄 [AUTH] Re-fetching profile...");

      const { data, error } = await supabase
        .from("profiles")
        .select("role, branch, display_name")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("[AUTH] Failed to refetch profile:", error.message);
        return;
      }

      if (data) {
        console.log("🟢 [AUTH] Profile updated:", data);
        setRole(data.role ?? null);
        setBranch(data.branch ?? null);
        setDisplayName(data.display_name ?? null);
      }
    } catch (err) {
      console.error("[AUTH] Exception in refetchProfile:", err);
    }
  }, []);

  // ----------------------------
  //    Listen to Auth Changes
  // ----------------------------
  useEffect(() => {
    // Check for dev session
    if (localStorage.getItem("isDevSession") === "true") {
       loginAsDeveloper();
       return;
    }

    const unsubscribe = onAuthStateChange(async (authUser) => {
      setUser(authUser);

      if (authUser) {
        try {
          await saveUser(authUser); // Does NOT override role after fix
          await refetchProfile(authUser.id);
        } catch (err) {
          console.error("[AUTH] saveUser/refetch error:", err);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [refetchProfile]);

  // ----------------------------
  //     Initial Profile Load
  // ----------------------------
  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      if (!user) {
        if (!active) return;
        setRole(null);
        setBranch(null);
        setDisplayName(null);
        setProfileLoading(false);
        return;
      }

      // Skip fetching for dev user as we set it manually
      if (user.id === "dev-user-id") {
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      try {
        console.log("🔵 [AUTH] Fetching profile:", user.id);

        const { data, error } = await supabase
          .from("profiles")
          .select("role, branch, display_name")
          .eq("id", user.id)
          .single();

        if (!active) return;

        if (error?.code === "PGRST116") {
          console.log("🟡 [AUTH] User not found yet in profiles table");
          setRole(null);
          setBranch(null);
          setDisplayName(null);
        } else if (error) {
          console.warn("[AUTH] Profile fetch error:", error.message);
          setRole(null);
          setBranch(null);
          setDisplayName(null);
        } else if (data) {
          console.log("🟢 [AUTH] Profile loaded:", data);
          setRole(data.role ?? null);
          setBranch(data.branch ?? null);
          setDisplayName(data.display_name ?? null);
        }
      } catch (err) {
        console.error("🔴 [AUTH] Exception fetching profile:", err);
        if (active) {
          setRole(null);
          setBranch(null);
          setDisplayName(null);
        }
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      active = false;
    };
  }, [user]);

  // ----------------------------
  //   Combined Loading State
  // ----------------------------
  const combinedLoading = loading || profileLoading;

  const contextValue = useMemo(
    () => ({
      user,
      loading: combinedLoading,
      isLoggedIn: !!user,
      role,
      branch,
      isAdmin: role === "admin",
      displayName,
      refetchProfile,
      loginAsDeveloper,
      logout,
    }),
    [user, combinedLoading, role, branch, displayName, refetchProfile]
  );

  if (combinedLoading) return <SplashScreen />;

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
