export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  // هذا السطر هو الأهم، بدونه ستظل الأخطاء موجودة
  sources?: {
    title: string;
    pageNumber: number;
    bookId?: string;
    downloadUrl?: string;
  }[];
  imageBase64?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  source?: string;
  sourceBookName?: string;
  sourcePageNumber?: number;
  downloadUrl?: string;
  bookId?: string;
  lang?: "ar" | "en";
}

export type Book = {
  id: string;
  user_id: string;
  file_name: string;
  download_url: string;
  storage_path: string;
  branch: AcademicBranch;
  status: "pending" | "processing" | "analyzed" | "error";
  created_at: string;
  summary?: string;
  chunks?: { text: string; pageNumber: number }[];
};

export type AcademicBranch = 'scientific' | 'literary' | 'industrial' | 'entrepreneurship';

export const BRANCH_NAMES: Record<AcademicBranch, string> = {
  scientific: 'الفرع العلمي',
  literary: 'الفرع الأدبي',
  industrial: 'الفرع الصناعي',
  entrepreneurship: 'فرع ريادة الأعمال',
};