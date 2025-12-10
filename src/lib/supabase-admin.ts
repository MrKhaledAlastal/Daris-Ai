import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment variables");
}

export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // المفتاح السري الأساسي
);
