import { geminiService } from "@/services/geminiService";
import { AcademicBranch } from "@/types";

interface AskAIOptions {
  question: string;
  system?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string; imageBase64?: string }>;
  imageBase64?: string;
  pdfBase64?: string;
}

export async function askAI(options: AskAIOptions): Promise<string> {
  const { question, system, history = [], imageBase64, pdfBase64 } = options;

  // تحويل history إلى Message[]
  const messages = history.map((h, index) => ({
    id: `msg-${index}-${Date.now()}`,
    role: h.role,
    content: h.content,
    imageBase64: h.imageBase64
  }));

  // كتاب فارغ للبحث عبر الإنترنت
  const dummyBook = {
    id: "",
    file_name: "البحث عبر الإنترنت",
    user_id: "",
    download_url: "",
    storage_path: "",
    branch: "scientific" as AcademicBranch,
    status: "analyzed",
    created_at: new Date().toISOString(),
    summary: "",
    chunks: [],
  };

  // استخدام geminiService
  const result = await geminiService.askQuestion(
    question,
    dummyBook,
    messages,
    true, // useInternet
    "scientific", // branch
    imageBase64,
    // false // isExamMode
  );

  return result.text;
}