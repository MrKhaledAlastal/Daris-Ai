import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        let userId = searchParams.get("userId");
        const branch = searchParams.get("branch");

        console.log("🔵 API GET /api/admin/books called");
        console.log("   userId:", userId);
        console.log("   branch:", branch);
        console.log("   SUPABASE_URL exists:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log("   SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

        if (!userId) {
            console.error("❌ Missing userId");
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // جرب الاتصال بالجدول أولاً بدون فلتر
        console.log("📝 Fetching ALL books from database...");
        try {
            const { data: allData, error: allError } = await supabaseAdmin
                .from("books")
                .select("id, user_id, file_name, branch, status");

            console.log("✅ Query executed");
            console.log("📊 Total books in DB:", allData?.length ?? 0);
            console.log("   Type of data:", typeof allData);
            console.log("   Is array:", Array.isArray(allData));
            
            if (allData && allData.length > 0) {
                console.log("   First book user_id:", allData[0].user_id);
                console.log("   Sample books:", allData.slice(0, 2));
            }
            if (allError) {
                console.error("❌ Error fetching all books:", allError);
                console.error("   Error details:", { code: allError.code, message: allError.message });
            }
        } catch (dbError) {
            console.error("❌ Exception fetching all books:", dbError);
        }

        // الآن جرب البحث بـ user_id
        console.log("🔍 Querying with user_id =", userId, "and branch =", branch);
        let query = supabaseAdmin
            .from("books")
            .select("*");

        query = query.eq("user_id", userId);

        if (branch) {
            query = query.eq("branch", branch);
        }

        query = query.order("created_at", { ascending: false });

        const { data, error } = await query;

        console.log("📚 Query result:");
        console.log("   Count:", data?.length ?? 0);
        console.log("   Error:", error?.message ?? "none");

        if (error) {
            console.error("❌ Supabase query error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log("✅ SUCCESS - Returning", data?.length ?? 0, "books");
        return NextResponse.json({ books: data || [] });
    } catch (e) {
        console.error("❌ Server error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
