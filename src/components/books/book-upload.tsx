"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, FileUp, FileCheck2, Trash2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { BRANCHES, type BranchId } from "@/constants/branches";

const ALLOWED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ".pptx",
  ],
  "application/vnd.ms-powerpoint": [".ppt"],
  "text/plain": [".txt"],
} as const;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function BookUpload({
  onUploadSuccess,
}: {
  onUploadSuccess?: () => void;
}) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useLanguage();

  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [branchId, setBranchId] = useState<BranchId>("scientific");
  const [isUploading, setIsUploading] = useState(false);

  // Helper function لتوليد مفتاح فريد للملف
  const fileKey = (file: File) =>
    `${file.name}_${file.size}_${file.lastModified}`;

  const onDrop = (acceptedFiles: File[], rejectedFiles: any[]) => {
    const validated: File[] = [];
    let hasError = false;

    // معالجة الملفات المرفوضة
    if (rejectedFiles.length > 0) {
      toast({
        variant: "destructive",
        title: lang === "ar" ? "نوع ملف غير مدعوم" : "Unsupported File Type",
        description:
          lang === "ar"
            ? "الملفات المسموحة: PDF, Word, PowerPoint, Text"
            : "Allowed: PDF, Word, PowerPoint, Text",
      });
      hasError = true;
    }

    acceptedFiles.forEach((file) => {
      // فحص حجم الملف
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: lang === "ar" ? "حجم الملف كبير جداً" : "File Too Large",
          description: `${file.name} ${
            lang === "ar" ? "يتجاوز 50 ميغابايت" : "exceeds 50MB"
          }`,
        });
        hasError = true;
        return;
      }

      // فحص التكرار
      const alreadyQueued = files.some((f) => fileKey(f) === fileKey(file));

      if (alreadyQueued) {
        toast({
          variant: "destructive",
          title: lang === "ar" ? "ملف مكرر" : "Duplicate File",
          description: `${file.name} ${
            lang === "ar" ? "موجود مسبقاً" : "already added"
          }`,
        });
        hasError = true;
        return;
      }

      validated.push(file);
    });

    if (validated.length > 0) {
      setFiles((prev) => [...prev, ...validated]);
      setDialogOpen(true);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: true,
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: MAX_FILE_SIZE,
  });

  // 🚫 إذا مش أدمن — ممنوع يعرض الأداة
  if (!isAdmin || !user) return null;

  // 📤 رفع ملف واحد مع progress tracking
  const uploadSingleFile = async (file: File) => {
    const key = fileKey(file);

    try {
      setUploadProgress((prev) => ({ ...prev, [key]: 0 }));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("branch", branchId);
      formData.append("userId", user.id);

      const xhr = new XMLHttpRequest();

      return new Promise<void>((resolve, reject) => {
        // تتبع التقدم
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress((prev) => ({ ...prev, [key]: progress }));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress((prev) => ({ ...prev, [key]: 100 }));

            // ✨ Auto-Analyze
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.book?.id) {
                fetch("/api/admin/process-book", {
                  method: "POST",
                  body: JSON.stringify({
                    bookId: response.book.id,
                    storagePath: response.book.storage_path,
                  }),
                }).catch((err) =>
                  console.error("Auto-analysis trigger failed:", err)
                );
              }
            } catch (e) {
              console.error(
                "Failed to parse upload response for auto-analysis:",
                e
              );
            }

            resolve();
          } else {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || "Upload failed"));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error"));
        });

        xhr.open("POST", "/api/admin/upload");
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    let success = 0;
    let failed = 0;

    for (const file of files) {
      try {
        await uploadSingleFile(file);
        success++;
      } catch (err) {
        console.error("Failed to upload:", file.name, err);
        failed++;
        toast({
          variant: "destructive",
          title: lang === "ar" ? "فشل الرفع" : "Upload Failed",
          description: `${file.name}: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        });
      }
    }

    setIsUploading(false);
    setFiles([]);
    setUploadProgress({});

    if (success > 0) {
      toast({
        title: lang === "ar" ? "✅ تم الرفع بنجاح" : "✅ Upload Successful",
        description:
          lang === "ar"
            ? `تم رفع ${success} ملف بنجاح${
                failed > 0 ? ` وفشل ${failed}` : ""
              }`
            : `${success} file(s) uploaded${
                failed > 0 ? `, ${failed} failed` : ""
              }`,
      });
      onUploadSuccess?.();
      setDialogOpen(false);
    } else {
      toast({
        variant: "destructive",
        title: lang === "ar" ? "فشل الرفع" : "Upload Failed",
        description:
          lang === "ar"
            ? "لم يتم رفع أي ملف بنجاح"
            : "No files were uploaded successfully",
      });
    }
  };

  const removeFile = (fileToRemove: File) => {
    const key = fileKey(fileToRemove);
    setFiles((prev) => prev.filter((f) => fileKey(f) !== key));
    setUploadProgress((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="glowing-btn">
          <FileUp className="mr-2 h-4 w-4" />
          {t.uploadBook}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-primary">{t.uploadBook}</DialogTitle>
          <DialogDescription>
            {lang === "ar"
              ? "اسحب وأفلت الملفات أو اضغط للتصفح (حد أقصى 50MB لكل ملف)"
              : "Drag & drop files or click to browse (max 50MB per file)"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* اختيار الفرع */}
          <div className="my-4">
            <label className="text-sm font-medium mb-2 block">
              {lang === "ar" ? "اختر الفرع" : "Choose Branch"}{" "}
              <span className="text-destructive">*</span>
            </label>

            <Select
              value={branchId}
              onValueChange={(v) => setBranchId(v as BranchId)}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={lang === "ar" ? "اختر الفرع" : "Choose branch"}
                />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.label[lang as "en" | "ar"]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* منطقة الرفع */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              }
              ${isUploading ? "pointer-events-none opacity-50" : ""}`}
          >
            <input {...getInputProps()} disabled={isUploading} />
            <FileUp
              className={`h-12 w-12 mx-auto ${
                isDragActive ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <p className="mt-3 text-sm font-medium">
              {isDragActive
                ? lang === "ar"
                  ? "أفلت الملفات هنا..."
                  : "Drop files here..."
                : lang === "ar"
                ? "اسحب الملفات أو اضغط للاختيار"
                : "Drag files or click to select"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, PPTX, TXT
            </p>
          </div>

          {/* قائمة الملفات */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">
                  {lang === "ar" ? "الملفات المحددة" : "Selected Files"} (
                  {files.length})
                </p>
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFiles([]);
                      setUploadProgress({});
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    {lang === "ar" ? "مسح الكل" : "Clear All"}
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {files.map((file) => {
                  const key = fileKey(file);
                  const progress = uploadProgress[key] ?? 0;

                  return (
                    <div
                      key={key}
                      className="p-3 border rounded-lg bg-secondary/30 transition-all"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex gap-2 items-start flex-1 min-w-0">
                          <FileCheck2
                            className="text-primary mt-0.5 flex-shrink-0"
                            size={18}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium truncate"
                              title={file.name}
                            >
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(file)}
                          disabled={isUploading}
                          className="flex-shrink-0 h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      {isUploading && progress > 0 && (
                        <div className="mt-2">
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1 text-right">
                            {progress}%
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* الأزرار */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button
            variant="ghost"
            disabled={isUploading}
            onClick={() => {
              if (!isUploading) {
                setDialogOpen(false);
                setFiles([]);
                setUploadProgress({});
              }
            }}
          >
            {t.cancel}
          </Button>

          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="min-w-[120px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.uploading ||
                  (lang === "ar" ? "جاري الرفع..." : "Uploading...")}
              </>
            ) : (
              <>
                <FileUp className="mr-2 h-4 w-4" />
                {t.uploadBook || (lang === "ar" ? "رفع" : "Upload")} (
                {files.length})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
