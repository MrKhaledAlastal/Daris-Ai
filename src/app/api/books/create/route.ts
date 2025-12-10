import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin"; // مهم: استخدم النسخة الخاصة بالـ service role

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { data, error } = await supabaseAdmin
            .from("books")
            .insert({
                user_id: body.user_id,
                file_name: body.file_name,
                download_url: body.download_url,
                storage_path: body.storage_path,
                branch: body.branch,
                status: "pending",
            })
            .select();

        if (error) {
            console.error("Insert failed:", error);
            return NextResponse.json({ success: false, error }, { status: 400 });
        }

        return NextResponse.json({ success: true, data });
    } catch (e) {
        console.error("Route error:", e);
        return NextResponse.json({ success: false, error: e }, { status: 500 });
    }
}
