"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase-auth";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabaseAuth.auth.getSession();

        if (error) {
          console.error("Auth error:", error);
          router.push("/login");
          return;
        }

        if (data.session) {
          // Successfully authenticated
          router.push("/chat");
        } else {
          // No session, redirect to login
          router.push("/login");
        }
      } catch (error) {
        console.error("Callback error:", error);
        router.push("/login");
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Authenticating...</h1>
        <p className="mt-2 text-muted-foreground">
          Please wait while we complete your login.
        </p>
      </div>
    </div>
  );
}
