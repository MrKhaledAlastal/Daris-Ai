import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const bookId = searchParams.get("id");
        const storagePath = searchParams.get("path");

        if (!bookId || !storagePath) {
            return NextResponse.json({ error: "Missing id or path" }, { status: 400 });
        }

        // 1. Delete from Storage
        const { error: storageError } = await supabaseAdmin.storage
            .from("textbooks")
            .remove([storagePath]);

        if (storageError) {
            console.error("Storage delete error:", storageError);
            // We continue even if storage delete fails, to clean up the DB
        }

        // 2. Delete from DB (this cascades to book_pages)
        const { error: dbError } = await supabaseAdmin
            .from("books")
            .delete()
            .eq("id", bookId);

        if (dbError) {
            console.error("DB delete error:", dbError);
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Server error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
