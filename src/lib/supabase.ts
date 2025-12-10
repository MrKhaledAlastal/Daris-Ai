import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // 🔥 يحفظ الجلسة داخل LocalStorage
    autoRefreshToken: true,      // 🔥 يجدد التوكن عند انتهاء صلاحيته
    detectSessionInUrl: true,    // 🔥 ضروري لـ OAuth callback
  },
});
