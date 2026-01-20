"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, AlertCircle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface BookData {
  id: string;
  file_name: string;
  download_url: string;
  storage_path: string;
}

export default function BookViewerPage() {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const bookId = searchParams.get("id");
  const pageNumber = searchParams.get("page") || "1"; // Default to page 1
  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    if (!bookId) {
      setError(lang === "ar" ? "معرف الكتاب غير موجود" : "Book ID not found");
      setLoading(false);
      return;
    }

    const fetchBook = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from("books")
          .select("id, file_name, download_url, storage_path")
          .eq("id", bookId)
          .single();

        if (queryError) {
          console.error("Database error:", queryError);
          setError(
            lang === "ar"
              ? "خطأ في تحميل الكتاب من قاعدة البيانات"
              : "Error loading book from database"
          );
          return;
        }

        if (data) {
          console.log("Book data loaded:", data);
          setBook(data);
        } else {
          setError(
            lang === "ar"
              ? "لم يتم العثور على الكتاب"
              : "Book not found"
          );
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          lang === "ar"
            ? "حدث خطأ أثناء تحميل الكتاب"
            : "Error occurred while loading the book"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [bookId, lang]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {lang === "ar" ? "جاري تحميل الكتاب..." : "Loading book..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">
            {lang === "ar" ? "خطأ" : "Error"}
          </h2>
          <p className="text-red-500 font-medium text-base">{error}</p>
          <p className="text-muted-foreground text-sm">
            {lang === "ar"
              ? "قد يكون الكتاب محذوفاً أو معرّف الكتاب غير صحيح"
              : "The book may have been deleted or the book ID is incorrect"}
          </p>
          <Button onClick={() => window.close()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {lang === "ar" ? "إغلاق" : "Close"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between bg-card sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.close()}
            title={lang === "ar" ? "إغلاق" : "Close"}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold text-foreground truncate text-sm md:text-base">
              {book.file_name}
            </h1>
            <p className="text-xs text-muted-foreground">
              {lang === "ar" ? "عارض الكتب" : "Book Viewer"}
            </p>
          </div>
        </div>

        {/* Download Button */}
        {book.download_url && (
          <a
            href={book.download_url}
            download={book.file_name}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 ml-2"
          >
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">
                {lang === "ar" ? "تحميل" : "Download"}
              </span>
            </Button>
          </a>
        )}
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900">
        {pdfError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md px-4">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
              <p className="text-muted-foreground font-medium">
                {lang === "ar"
                  ? "لا يمكن عرض الملف مباشرة في المتصفح"
                  : "Cannot display the file directly in the browser"}
              </p>
              <p className="text-sm text-muted-foreground">
                {lang === "ar"
                  ? "الملف موجود لكن المتصفح ما يقدر يعرضه"
                  : "The file exists but the browser cannot display it"}
              </p>
              {book.download_url && (
                <a
                  href={book.download_url}
                  download={book.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    {lang === "ar" ? "تحميل الكتاب" : "Download Book"}
                  </Button>
                </a>
              )}
            </div>
          </div>
        ) : book.download_url ? (
          <iframe
            src={`${book.download_url}#page=${pageNumber}`}
            className="w-full h-full border-0"
            title={book.file_name}
            onError={() => setPdfError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground font-medium">
                {lang === "ar"
                  ? "لا توجد نسخة متاحة من هذا الكتاب"
                  : "No available version of this book"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
