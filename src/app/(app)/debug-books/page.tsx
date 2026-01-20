"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function BooksDebugPage() {
  const { branch } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const { data, error } = await supabase
          .from("books")
          .select("*")
          .eq("branch", branch)
          .limit(5);

        if (error) {
          console.error("Error:", error);
        } else {
          console.log("Books:", data);
          setBooks(data || []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [branch]);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Books Debug</h1>
      {books.map((book) => (
        <div key={book.id} className="border p-4 rounded-lg space-y-2">
          <p><strong>ID:</strong> {book.id}</p>
          <p><strong>Name:</strong> {book.file_name}</p>
          <p><strong>Storage Path:</strong> {book.storage_path}</p>
          <p><strong>Download URL:</strong></p>
          <p className="text-sm bg-slate-100 p-2 rounded overflow-auto">
            {book.download_url}
          </p>
          {book.download_url && (
            <Button
              onClick={() => window.open(book.download_url, "_blank")}
              size="sm"
            >
              Test Download URL
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
