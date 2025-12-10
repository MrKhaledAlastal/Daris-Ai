import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!   // ⚠ مهم: service_role وليس anon
);

export async function POST(req: Request) {
    try {
        const form = await req.formData();

        const file = form.get("file") as File;
        const path = form.get("path") as string;

        if (!file) {
            return NextResponse.json({ error: "No file" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error } = await supabase.storage
            .from("textbooks")
            .upload(path, buffer, {
                upsert: true,
                contentType: file.type,
            });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
