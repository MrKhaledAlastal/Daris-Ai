"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function BooksFixPage() {
  const { branch } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [fixed, setFixed] = useState<string[]>([]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const { data, error } = await supabase
          .from("books")
          .select("*")
          .eq("branch", branch)
          .or("download_url.is.null,download_url.eq.");

        if (error) {
          console.error("Error:", error);
        } else {
          console.log("Books with missing URLs:", data);
          setBooks(data || []);
        }
      } finally {
        setLoading(false);
      }
    };

    if (branch) fetchBooks();
  }, [branch]);

  const generatePublicUrl = (storagePath: string) => {
    // دعنا نحصل على project URL من Supabase
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${projectUrl}/storage/v1/object/public/textbooks/${storagePath}`;
  };

  const fixBooks = async () => {
    setFixing(true);
    const fixedIds: string[] = [];

    for (const book of books) {
      if (!book.download_url && book.storage_path) {
        const newUrl = generatePublicUrl(book.storage_path);
        const { error } = await supabase
          .from("books")
          .update({ download_url: newUrl })
          .eq("id", book.id);

        if (!error) {
          fixedIds.push(book.id);
          console.log(`✅ Fixed ${book.file_name}`);
        } else {
          console.error(`❌ Failed to fix ${book.file_name}`, error);
        }
      }
    }

    setFixed(fixedIds);
    setFixing(false);
    
    // Refresh books list
    const { data } = await supabase
      .from("books")
      .select("*")
      .eq("branch", branch)
      .or("download_url.is.null,download_url.eq.");
    setBooks(data || []);
  };

  if (loading)
    return <div className="p-4 text-center">Loading books...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Books URL Fix</h1>

      {books.length === 0 ? (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg flex gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900 dark:text-green-100">
              All books have valid URLs!
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                {books.length} books with missing download URLs
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Click the button below to fix all books at once
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {books.map((book) => (
              <div
                key={book.id}
                className="border p-3 rounded-lg bg-slate-50 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{book.file_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Storage: {book.storage_path}
                    </p>
                    {fixed.includes(book.id) && (
                      <p className="text-xs text-green-600 mt-1">✅ Fixed</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={fixBooks}
            disabled={fixing || fixed.length === books.length}
            size="lg"
            className="w-full"
          >
            {fixing ? "Fixing..." : "Fix All Books"}
          </Button>

          {fixed.length > 0 && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
              <p className="text-green-900 dark:text-green-100 font-semibold">
                ✅ {fixed.length} books fixed successfully!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
