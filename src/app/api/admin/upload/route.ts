import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin"; // هنعد شوي

export async function POST(req: Request) {
    try {
        const form = await req.formData();
        const file = form.get("file") as File;
        const branch = form.get("branch") as string;
        const userId = form.get("userId") as string;

        if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = `${userId}/${Date.now()}_${file.name}`;

        // رفع الملف بصلاحيات السيرفر (service role)
        const { error: uploadErr } = await supabaseAdmin.storage
            .from("textbooks")
            .upload(filePath, buffer, {
                contentType: file.type,
            });

        if (uploadErr) {
            return NextResponse.json({ error: uploadErr.message }, { status: 500 });
        }

        // الحصول على URL
        const { data } = supabaseAdmin.storage
            .from("textbooks")
            .getPublicUrl(filePath);

        // حفظ بيانات الملف داخل جدول الكتب
        const { data: bookData, error: insertErr } = await supabaseAdmin.from("books").insert({
            user_id: userId,
            file_name: file.name,
            download_url: data.publicUrl,
            storage_path: filePath,
            branch,
            status: "pending"
        }).select().single();

        if (insertErr) {
            return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, book: bookData });
    } catch (err) {
        console.error("SERVER ERROR:", err);
        return NextResponse.json({ error: "Server failed" }, { status: 500 });
    }
}
