"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import BookUpload from "@/components/books/book-upload";
import BookList from "@/components/books/book-list";

export default function AdminBooksPage() {
    const router = useRouter();
    const { isAdmin, loading } = useAuth();
    const [refreshKey, setRefreshKey] = useState(0);

    // 🚨 حماية الأدمن — داخل useEffect وليس داخل render
    useEffect(() => {
        if (!loading && !isAdmin) {
            router.replace("/"); // أفضل من push
        }
    }, [loading, isAdmin, router]);

    // ⏳ أثناء تحميل حالة المستخدم
    if (loading) return null;

    // 🚫 إذا مش أدمن، ممنوع يشوف الصفحة
    if (!isAdmin) return null;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-primary">لوحة إدارة الكتب</h1>

            <div className="bg-accent/5 p-6 rounded-xl border border-border/50">
                <BookUpload onUploadSuccess={() => setRefreshKey(k => k + 1)} />
            </div>

            <div className="bg-accent/5 p-6 rounded-xl border border-border/50">
                <BookList refreshTrigger={refreshKey} />
            </div>
        </div>
    );
}
