"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Trash2,
  FileText,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/lib/supabase";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import BookUpload from "./book-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BRANCHES, type BranchId } from "@/constants/branches";

// ===============================
// 📌 Book Type (Supabase Table)
// ===============================
type Book = {
  id: string;
  user_id: string;
  file_name: string;
  download_url: string;
  storage_path: string;
  branch: BranchId;
  status: "pending" | "analyzed" | "error";
  created_at: string;
};

export default function BookList({
  refreshTrigger,
}: {
  refreshTrigger?: number;
}) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState<BranchId>(BRANCHES[0].id);

  // ===============================
  // 📌 Fetch Books From Supabase
  // ===============================
  useEffect(() => {
    if (!user) {
      console.log("❌ No user found");
      return;
    }

    console.log(
      "🔵 Fetching books for user:",
      user.id,
      "branch:",
      branchFilter
    );

    const fetchBooks = async () => {
      setLoading(true);

      try {
        // استخدام Supabase client مباشرة من الـ browser (لا مشكلة شبكة)
        console.log("🔵 Fetching books directly from Supabase client");
        console.log("   User ID to search:", user.id);
        console.log("   Branch filter:", branchFilter);

        // أولاً: جرب جلب جميع الكتب بدون RLS (عشان نشوف إذا في بيانات أصلاً)
        console.log("📝 Step 1: Fetching ALL books without filter...");
        const { data: allBooks, error: allError } = await supabase
          .from("books")
          .select("id, user_id, file_name, branch");

        console.log("   All books count:", allBooks?.length ?? 0);
        if (allBooks && allBooks.length > 0) {
          console.log("   First book user_id:", allBooks[0].user_id);
          console.log(
            "   User ID types match:",
            typeof allBooks[0].user_id === typeof user.id
          );
        }
        if (allError) {
          console.error("   Error fetching all books:", allError);
        }

        // الآن جرب مع الفلتر
        console.log("📝 Step 2: Filtering with user_id =", user.id);
        let query = supabase
          .from("books")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (branchFilter) {
          query = query.eq("branch", branchFilter);
        }

        const { data, error } = await query;

        console.log("   Filtered result count:", data?.length ?? 0);
        console.log("   Error:", error?.message ?? "none");

        if (error) {
          console.error("❌ Supabase error:", error);
          setBooks([]);
        } else {
          console.log("✅ Books fetched:", data?.length ?? 0, "books");
          if (data && data.length > 0) {
            console.log("   First book:", {
              id: data[0].id,
              name: data[0].file_name,
            });
          }
          setBooks(data || []);
        }
      } catch (err) {
        console.error("❌ Error fetching books:", err);
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [user, branchFilter, refreshTrigger]);

  // ===============================
  // 📌 Delete Book (DB + Storage)
  // ===============================
  // ===============================
  // 📌 Delete Book (DB + Storage)
  // ===============================
  const handleDelete = async (book: Book) => {
    try {
      const res = await fetch(
        `/api/admin/books/delete?id=${book.id}&path=${encodeURIComponent(
          book.storage_path
        )}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }

      setBooks((prev) => prev.filter((b) => b.id !== book.id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete book");
    }
  };

  const statusIcons = {
    pending: <Loader2 className="mr-2 h-4 w-4 animate-spin text-yellow-500" />,
    analyzed: <CheckCircle2 className="mr-2 h-4 w-4 text-black" />,
    error: <AlertCircle className="mr-2 h-4 w-4 text-red-500" />,
  };

  const statusColors: Record<
    string,
    "secondary" | "default" | "destructive" | "outline"
  > = {
    pending: "secondary",
    analyzed: "default",
    error: "destructive",
  };

  return (
    <Tabs
      value={branchFilter}
      onValueChange={(value) => setBranchFilter(value as BranchId)}
    >
      <TabsList className="flex flex-wrap gap-2 bg-transparent p-0">
        {BRANCHES.map((branch) => (
          <TabsTrigger
            key={branch.id}
            value={branch.id}
            className="rounded-full border px-4 py-1 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {branch.label.ar}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={branchFilter} className="mt-4">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center bg-secondary/20 backdrop-blur-lg border border-dashed border-border rounded-lg p-12 flex flex-col items-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <UploadCloud className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">لا توجد كتب</h2>
            <p className="mt-2 text-muted-foreground">{t.noBooks}</p>
            <div className="mt-6">
              <BookUpload />
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />{" "}
                      {book.file_name}
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusColors[book.status]}>
                        {statusIcons[book.status]}
                        {book.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {new Date(book.created_at).toLocaleDateString("ar-EG")}
                    </TableCell>

                    <TableCell className="text-right flex items-center justify-end gap-2">
                      {(book.status === "pending" ||
                        book.status === "error") && (
                        <AnalyzeButton
                          book={book}
                          onAnalyzeComplete={() => {
                            setBooks((prev) =>
                              prev.map((b) =>
                                b.id === book.id
                                  ? { ...b, status: "analyzed" }
                                  : b
                              )
                            );
                          }}
                        />
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive/70"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Book?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(book)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function AnalyzeButton({
  book,
  onAnalyzeComplete,
}: {
  book: Book;
  onAnalyzeComplete: () => void;
}) {
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/admin/process-book", {
        method: "POST",
        body: JSON.stringify({
          bookId: book.id,
          storagePath: book.storage_path,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process book");
      }

      onAnalyzeComplete();
    } catch (e: any) {
      console.error(e);
      alert(`Analysis failed: ${e.message || "Unknown error"}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleAnalyze}
      disabled={analyzing}
    >
      {analyzing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="mr-2 h-4 w-4" />
      )}
      {analyzing ? "Analyzing..." : "Analyze"}
    </Button>
  );
}
