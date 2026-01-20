"use client";

import React, { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Paperclip,
  Send,
  X,
  Copy,
  Check,
  Sparkles,
  FileText,
  BookOpen,
  Brain,
  Target,
  Lightbulb,
  ExternalLink,
  Search,
} from "lucide-react";
import "katex/dist/katex.min.css";

import {
  createChat,
  saveMessage,
  subscribeToMessages,
} from "@/lib/supabase-db";
import { useSidebar } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { supabase } from "@/lib/supabase";
import { compressDataUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { askQuestionAction } from "@/app/actions";
import { renderMessage } from "@/lib/renderMessage";
import {
  INTENT_MESSAGE_DELAY_MS,
  IntentChunk,
  IntentType,
  splitResponseIntoIntents,
} from "@/lib/intent-utils";
import { Logo } from "../icons/logo";

// =========================================================
// Interface
// =========================================================
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageBase64?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  source?: string;
  sourceBookName?: string;
  sourcePageNumber?: number;
  downloadUrl?: string; // 🆕 رابط الملف من Supabase
  bookId?: string;
  lang?: "ar" | "en";
  sources?: Array<{
    // 🆕 مصادر متعددة (كتاب + إنترنت)
    title: string;
    pageNumber?: number | null;
    bookId?: string | null;
    downloadUrl?: string | null;
    isWebSource?: boolean;
  }>;
  intentType?: IntentType;
}

type AssistantMeta = Pick<
  Message,
  | "lang"
  | "sources"
  | "sourceBookName"
  | "sourcePageNumber"
  | "downloadUrl"
  | "bookId"
  | "source"
>;

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const typeEffect = async (
  fullText: string,
  onUpdate: (text: string) => void,
  delayMs = 20
) => {
  if (!fullText) {
    onUpdate("");
    return;
  }

  let current = "";
  for (const char of fullText) {
    current += char;
    onUpdate(current);
    await wait(delayMs);
  }
};

// =========================================================
// Main Chat Component
// =========================================================
export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profilescrolled, setprofilescrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{
    file: File;
    name: string;
    mime: string;
  } | null>(null);

  const [expandSearch, setExpandSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [availableBooks, setAvailableBooks] = useState<
    Array<{ id: string; file_name: string; branch?: string }>
  >([]);
  const [selectedBookId, setSelectedBookId] = useState<string | undefined>(
    undefined
  );
  const [loadingBooks, setLoadingBooks] = useState(false);

  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeExit, setWelcomeExit] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [isStreaming, setIsStreaming] = useState(false);

  const [isPending, startTransition] = useTransition();

  const { state: sidebarState } = useSidebar();
  const { t, lang } = useLanguage();
  const { user, isLoggedIn, branch, displayName: authDisplayName } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const searchParams = useSearchParams();
  const initialChatId = searchParams.get("chatId");
  const [currentChatId, setCurrentChatId] = useState<string | null>(
    initialChatId
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const playbackChainRef = useRef<Promise<void>>(Promise.resolve());
  const activeSequencesRef = useRef(0);

  const isArabic = lang === "ar";
  const displayName =
    authDisplayName ||
    user?.email?.split("@")[0] ||
    (isArabic ? "صديقي" : "friend");

  const quickPrompts = isArabic
    ? [
      { text: "اشرحلي قاعدة الماضي البسيط", category: "لغة إنجليزية" },
      { text: "لخصلي درس الخلية في الأحياء", category: "أحياء" },
      { text: "حل سؤال هندسة فراغية", category: "رياضيات" },
      { text: "اعطيني خطة مذاكرة أسبوعية", category: "تنظيم" },
    ]
    : [
      { text: "Explain the present simple tense", category: "English" },
      { text: "Summarize the biology cell lesson", category: "Biology" },
      { text: "Solve a 3D geometry problem", category: "Math" },
      { text: "Draft a weekly study plan", category: "Planning" },
    ];

  // =========================================================
  // Handle Opening Source PDF at Specific Page from Supabase
  // =========================================================
  const handleOpenSource = (downloadUrl: string, pageNumber?: number) => {
    if (!downloadUrl) return;

    // إضافة رقم الصفحة للرابط المباشر
    const finalUrl = pageNumber
      ? `${downloadUrl}#page=${pageNumber}`
      : downloadUrl;

    console.log("🔗 Opening PDF at:", finalUrl);
    window.open(finalUrl, "_blank");
  };

  // =========================================================
  // 🔥 Helper: Get Favicon URL from Website URL (محسّن)
  // =========================================================
  const getFaviconUrl = (url: string): string => {
    if (!url) return "";

    try {
      // تنظيف URL وإزالة أي مسافات
      const cleanUrl = url.trim();

      // إضافة https:// إذا لم يكن موجوداً
      const fullUrl = cleanUrl.startsWith("http")
        ? cleanUrl
        : `https://${cleanUrl}`;

      // استخراج domain من URL
      const urlObj = new URL(fullUrl);
      const domain = urlObj.hostname.replace("www.", "");

      // استخدام Google's favicon service (أسرع وأكثر موثوقية)
      // sz=64 للحصول على جودة أعلى
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (e) {
      // إذا فشل parsing، نحاول استخراج domain يدوياً
      const domain = url
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0];
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }
  };

  // =========================================================
  // 🔥 Helper: Extract Domain Name from URL
  // =========================================================
  const getDomainName = (url: string): string => {
    if (!url) return "";

    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      return urlObj.hostname.replace("www.", "");
    } catch (e) {
      return url;
    }
  };

  const highlightCards = isArabic
    ? [
      {
        title: "مراجعة ذكية",
        description: "احصل على ملخصات دقيقة لأهم الدروس في ثوانٍ.",
        icon: BookOpen,
      },
      {
        title: "تحليل عميق",
        description: "حلل الأسئلة المعقدة بخطوات واضحة وسهلة الفهم.",
        icon: Brain,
      },
      {
        title: "خطط مخصصة",
        description: "صمّم جدول دراسي مرن يناسب وقتك وأهدافك.",
        icon: Target,
      },
      {
        title: "إلهام بصري",
        description: "مخططات ورسومات تساعدك على تثبيت المعلومة بسرعة.",
        icon: Lightbulb,
      },
    ]
    : [
      {
        title: "Smart reviews",
        description: "Get sharp summaries for tricky lessons in seconds.",
        icon: BookOpen,
      },
      {
        title: "Deep analysis",
        description: "Break down hard questions with clear, guided steps.",
        icon: Brain,
      },
      {
        title: "Custom plans",
        description: "Design flexible study plans around your schedule.",
        icon: Target,
      },
      {
        title: "Visual sparks",
        description: "Diagrams and cues that help ideas stick faster.",
        icon: Lightbulb,
      },
    ];

  const INTENT_LABELS: Record<IntentType, { ar: string; en: string }> = {
    concept: { ar: "مفهوم أساسي", en: "Concept" },
    example: { ar: "مثال توضيحي", en: "Example" },
    formula: { ar: "قانون", en: "Formula" },
    calculation: { ar: "خطوات الحل", en: "Calculation" },
    result: { ar: "النتيجة", en: "Result" },
    followup: { ar: "سؤال متابعة", en: "Follow-up" },
  };

  const INTENT_BADGE_CLASSES: Record<IntentType, string> = {
    concept: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/25",
    example: "bg-teal-500/15 text-teal-200 border border-teal-400/25",
    formula: "bg-lime-500/15 text-lime-200 border border-lime-400/25",
    calculation: "bg-sky-500/15 text-sky-200 border border-sky-400/20",
    result: "bg-emerald-400/20 text-emerald-100 border border-emerald-300/30",
    followup: "bg-amber-500/15 text-amber-200 border border-amber-400/25",
  };

  const INTENT_PANEL_CLASSES: Record<IntentType | "default", string> = {
    concept:
      "bg-gradient-to-br from-emerald-500/12 via-white/5 to-emerald-500/4 border border-emerald-400/15",
    example:
      "bg-gradient-to-br from-teal-500/12 via-white/5 to-teal-500/4 border border-teal-400/15",
    formula:
      "bg-gradient-to-br from-lime-400/12 via-white/5 to-lime-500/5 border border-lime-400/15",
    calculation:
      "bg-gradient-to-br from-sky-500/14 via-white/5 to-sky-500/4 border border-sky-400/15",
    result:
      "bg-gradient-to-br from-emerald-400/14 via-white/5 to-emerald-500/6 border border-emerald-300/20",
    followup:
      "bg-gradient-to-br from-amber-500/14 via-white/5 to-amber-400/6 border border-amber-400/15",
    default:
      "bg-white/20/[0.15] border border-white/10",
  };

  const getIntentLabel = (type: IntentType | undefined, lang: "ar" | "en") => {
    if (!type) return null;
    const map = INTENT_LABELS[type];
    return lang === "ar" ? map.ar : map.en;
  };

  // =========================================================
  // Helper: Render Markdown content
  // =========================================================
  const renderAssistantContent = (content: string) => {
    if (!content) return null;

    let cleanContent = content.replace(/\[METADATA:.*?\]/g, "").trim();
    cleanContent = cleanContent.replace(/\*\*/g, "").trim();

    return renderMessage(cleanContent);
  };

  const enqueueIntentPlayback = useCallback(
    (chunks: IntentChunk[], meta: AssistantMeta) => {
      if (!chunks.length) return;

      const baseId = `ai-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;

      playbackChainRef.current = playbackChainRef.current.then(async () => {
        activeSequencesRef.current += 1;
        setIsAssistantTyping(true);

        try {
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            await wait(INTENT_MESSAGE_DELAY_MS);

            const message: Message = {
              id: `${baseId}-${i}`,
              role: "assistant",
              content: chunk.content,
              intentType: chunk.type,
              ...meta,
            };

            setMessages((prev) => [...prev, message]);
          }
        } finally {
          activeSequencesRef.current -= 1;
          if (activeSequencesRef.current === 0) {
            setIsAssistantTyping(false);
          }
        }
      });
    },
    [setIsAssistantTyping]
  );

  // =========================================================
  // Skeleton cards shown while assistant types (RTL-aware)
  function SkeletonCards({
    count = 2,
    rtl = false,
  }: {
    count?: number;
    rtl?: boolean;
  }) {
    return (
      <div
        className={`flex flex-col gap-3 my-4 animate-fade-up`}
        dir={rtl ? "rtl" : "ltr"}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 bg-white/[0.04] p-4 rounded-xl border border-white/5 transition-all animate-pulse ${rtl ? "flex-row-reverse" : "flex-row"
              }`}
          >
            <div className="w-3 h-3 rounded-full bg-[#32CD32] shadow-[0_0_8px_#32CD32] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 bg-white/10 rounded" />
              <div className="h-3 w-24 bg-white/8 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // =========================================================
  // Handle initial chatId
  // =========================================================
  useEffect(() => {
    setCurrentChatId(initialChatId || null);
  }, [initialChatId]);

  useEffect(() => {
    setMessages([]);
    setShowWelcome(true);
    setWelcomeExit(false);
  }, [currentChatId]);

  // =========================================================
  // 📚 Fetch Available Books for Branch
  // =========================================================
  useEffect(() => {
    if (!branch || !user) {
      setAvailableBooks([]);
      setSelectedBookId(undefined);
      return;
    }

    const fetchBooks = async () => {
      setLoadingBooks(true);
      try {
        const { data, error } = await supabase
          .from("books")
          .select("id, file_name, branch")
          .eq("branch", branch)
          .eq("status", "analyzed") // فقط الكتب المعالجة
          .order("file_name", { ascending: true });

        if (error) {
          console.error("Error fetching books:", error);
          setAvailableBooks([]);
        } else {
          setAvailableBooks(data || []);
        }
      } catch (err) {
        console.error("Error fetching books:", err);
        setAvailableBooks([]);
      } finally {
        setLoadingBooks(false);
      }
    };

    fetchBooks();
  }, [branch, user]);

  // 🔥 FIX: Use ref to track previous messages count and avoid dependency loop
  const prevMessagesCountRef = useRef(0);

  useEffect(() => {
    const prevCount = prevMessagesCountRef.current;
    const currentCount = messages.length;

    // Only trigger transitions when count actually changes
    if (prevCount === 0 && currentCount > 0) {
      // Messages added - hide welcome
      setWelcomeExit(true);
      setTimeout(() => setShowWelcome(false), 600);
    } else if (prevCount > 0 && currentCount === 0) {
      // Messages cleared - show welcome
      setShowWelcome(true);
      setWelcomeExit(false);
    }

    prevMessagesCountRef.current = currentCount;
  }, [messages.length]);

  // =========================================================
  // Dropzone for file upload
  // =========================================================
  const onFileDrop = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachedImage(e.target?.result as string);
        setAttachedFile(null);
      };
      reader.readAsDataURL(file);
      return;
    }

    setAttachedFile({
      file,
      name: file.name,
      mime: file.type,
    });
    setAttachedImage(null);
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop: onFileDrop,
    noClick: true,
    noKeyboard: true,
  });

  // =========================================================
  // UI Helper: Message Bubble (New Glass Design)
  // =========================================================
  const MessageBubble = ({ m }: { m: Message }) => {
    const isAssistant = m.role === "assistant";
    const dir = isArabic ? "rtl" : "ltr"; // Use component state 'isArabic'

    if (isAssistant) {
      return (
        <div className="flex items-start gap-4 justify-start w-full group">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-new to-primary-dark flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(50,205,50,0.3)] mt-1">
            <Sparkles className="text-white w-[18px] h-[18px]" />
          </div>

          <div className="flex flex-col gap-3 max-w-[75%] md:max-w-[70%]">
            {/* Name & Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {lang === "ar" ? "المساعد الذكي" : "AI Assistant"}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-primary-new/10 text-primary-new text-[10px] font-bold border border-primary-new/20">
                AI
              </span>
            </div>

            {/* Content */}
            <div className="bg-surface-dark/80 border border-white/10 rounded-2xl px-4 py-3 md:px-5 md:py-4 text-[15px] leading-relaxed space-y-4">
              {renderAssistantContent(m.content || "")}
            </div>

            {/* Sources & Attachments */}
            <div className="flex flex-wrap gap-2 mt-2">
              {m.sourceBookName && (
                <button
                  onClick={() =>
                    handleOpenSource(
                      m.downloadUrl || `/my-books?bookId=${m.bookId}`,
                      m.sourcePageNumber
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-white/10 hover:border-primary-new/50 hover:bg-primary-new/5 transition-all group"
                >
                  <BookOpen className="text-primary-new w-[16px] h-[16px]" />
                  <span className="text-xs font-medium text-white/80 group-hover:text-white">
                    {m.sourceBookName}{" "}
                    {m.sourcePageNumber ? `p.${m.sourcePageNumber}` : ""}
                  </span>
                </button>
              )}
              {m.fileUrl && (
                <a
                  href={m.fileUrl}
                  download={m.fileName}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark border border-white/10 hover:border-primary-new/50 hover:bg-primary-new/5 transition-all group"
                >
                  <FileText className="text-primary-new w-[16px] h-[16px]" />
                  <span className="text-xs font-medium text-white/80 group-hover:text-white">
                    {m.fileName || "File"}
                  </span>
                </a>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(m.content || "");
                  setCopiedId(m.id);
                  setTimeout(() => setCopiedId(null), 1600);
                }}
                className="text-white/40 hover:text-white transition-colors"
                title={lang === "ar" ? "نسخ" : "Copy"}
              >
                {copiedId === m.id ? (
                  <Check className="w-[18px] h-[18px] text-primary-new" />
                ) : (
                  <Copy className="w-[18px] h-[18px]" />
                )}
              </button>
              {/* Regenerate - Placeholder for now as logic wasn't in original snippet */}
              {/* <button className="text-white/40 hover:text-white transition-colors">
                <RefreshCw className="w-[18px] h-[18px]" />
              </button> */}
            </div>
          </div>
        </div>
      );
    }

    // User Message
    return (
      <div className="flex items-end gap-4 justify-end group">
        <div className="flex flex-col gap-1 items-end max-w-[80%]">
          <div className="bg-primary-new text-slate-900 px-5 py-3.5 rounded-2xl rounded-bl-none shadow-lg shadow-primary-new/10">
            <div className="text-[15px] font-bold leading-relaxed whitespace-pre-wrap">
              {m.content}
            </div>
            {m.imageBase64 && (
              <img
                src={m.imageBase64}
                alt="Upload"
                className="mt-2 rounded-lg max-w-full opacity-90 hover:opacity-100 transition-opacity"
              />
            )}
            {m.fileName && (
              <div className="mt-2 text-xs flex items-center gap-1 bg-black/10 px-2 py-1 rounded">
                <Paperclip className="w-3 h-3" />
                {m.fileName}
              </div>
            )}
          </div>
          {/* Read Receipt (Static for now, but part of design) */}
          <span className="text-[11px] text-white/30 mr-1 opacity-100">
            {/* Could add timestamp here if available in message object */}
          </span>
        </div>

        {/* User Avatar */}
        <div className="w-9 h-9 rounded-full bg-surface-darker ring-2 ring-surface-darker shrink-0 flex items-center justify-center overflow-hidden">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white/50 text-xs font-bold">
              {displayName?.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    );
  };

  // =========================================================
  // 🔥 IMPROVED: Messages Listener with smart deduplication
  // =========================================================
  useEffect(() => {
    if (!user || !currentChatId) return;

    let unsubscribe: (() => void) | undefined;

    const initializeAndSubscribe = async () => {
      try {
        console.log("📥 جاري تحميل الرسائل من قاعدة البيانات...");
        const { data: existingMessages } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_id", currentChatId)
          .order("created_at", { ascending: true });

        if (existingMessages) {
          console.log("✅ تم تحميل", existingMessages.length, "رسائل");
          const arr = existingMessages.map((d: any) => {
            // 🔥 محاولة parse sources من JSON إذا كان موجوداً
            let sources: any[] = [];
            if (d.sources) {
              try {
                sources =
                  typeof d.sources === "string"
                    ? JSON.parse(d.sources)
                    : d.sources;
              } catch (e) {
                console.warn("Failed to parse sources:", e);
              }
            }

            // إذا لم يكن هناك sources array، نستخدم المصدر القديم للتوافق
            if (sources.length === 0 && d.source_book_name) {
              sources = [
                {
                  title: d.source_book_name,
                  pageNumber: d.source_page_number || 1,
                  bookId: d.book_id || null,
                  downloadUrl: d.download_url || null,
                  isWebSource: false,
                },
              ];
            }

            return {
              id: d.id,
              role: d.role,
              content: d.content,
              imageBase64: d.image_data_uri || null,
              fileUrl: d.file_url || null,
              fileName: d.file_name || null,
              source: d.source,
              sourceBookName: d.source_book_name,
              sourcePageNumber: d.source_page_number,
              downloadUrl: d.download_url,
              bookId: d.book_id || null,
              sources: sources.length > 0 ? sources : undefined, // 🆕 sources array
              lang: d.lang,
            } as Message;
          });
          setMessages(arr);
        }
      } catch (error) {
        console.error("Error initializing messages:", error);
      }

      subscribeToChanges();
    };

    const subscribeToChanges = () => {
      unsubscribe = subscribeToMessages(currentChatId, (payload) => {
        console.log("🔄 تحديث حي:", payload.eventType);

        if (payload.eventType === "INSERT") {
          const newMessage = payload.new;

          setMessages((prev) => {
            // 🔥 Smart deduplication: تجاهل الرسائل المكررة
            const exists = prev.some(
              (m) =>
                m.id === newMessage.id ||
                (m.role === newMessage.role &&
                  m.content === newMessage.content &&
                  m.id.startsWith("temp-"))
            );

            if (exists) {
              console.log("⚠️ الرسالة موجودة بالفعل، تجاهل");
              return prev;
            }

            // 🔥 محاولة parse sources من JSON إذا كان موجوداً
            let sources: any[] = [];
            if (newMessage.sources) {
              try {
                sources =
                  typeof newMessage.sources === "string"
                    ? JSON.parse(newMessage.sources)
                    : newMessage.sources;
              } catch (e) {
                console.warn("Failed to parse sources:", e);
              }
            }

            // إذا لم يكن هناك sources array، نستخدم المصدر القديم للتوافق
            if (sources.length === 0 && newMessage.source_book_name) {
              sources = [
                {
                  title: newMessage.source_book_name,
                  pageNumber: newMessage.source_page_number || 1,
                  bookId: newMessage.book_id || null,
                  downloadUrl: newMessage.download_url || null,
                  isWebSource: false,
                },
              ];
            }

            const message: Message = {
              id: newMessage.id,
              role: newMessage.role,
              content: newMessage.content,
              imageBase64: newMessage.image_data_uri || null,
              fileUrl: newMessage.file_url || null,
              fileName: newMessage.file_name || null,
              source: newMessage.source,
              sourceBookName: newMessage.source_book_name,
              sourcePageNumber: newMessage.source_page_number,
              downloadUrl: newMessage.download_url,
              bookId: newMessage.book_id || null,
              sources: sources.length > 0 ? sources : undefined, // 🆕 sources array
              lang: newMessage.lang,
            };

            console.log("➕ إضافة رسالة جديدة:", message.id);
            return [...prev, message];
          });
        } else if (payload.eventType === "UPDATE") {
          const updatedMessage = payload.new;
          console.log("✏️ تحديث رسالة:", updatedMessage.id);

          // 🔥 محاولة parse sources من JSON إذا كان موجوداً
          let sources: any[] = [];
          if (updatedMessage.sources) {
            try {
              sources =
                typeof updatedMessage.sources === "string"
                  ? JSON.parse(updatedMessage.sources)
                  : updatedMessage.sources;
            } catch (e) {
              console.warn("Failed to parse sources:", e);
            }
          }

          // إذا لم يكن هناك sources array، نستخدم المصدر القديم للتوافق
          if (sources.length === 0 && updatedMessage.source_book_name) {
            sources = [
              {
                title: updatedMessage.source_book_name,
                pageNumber: updatedMessage.source_page_number || 1,
                bookId: updatedMessage.book_id || null,
                downloadUrl: updatedMessage.download_url || null,
                isWebSource: false,
              },
            ];
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedMessage.id
                ? {
                  ...m,
                  content: updatedMessage.content,
                  source: updatedMessage.source,
                  sourceBookName: updatedMessage.source_book_name,
                  sourcePageNumber: updatedMessage.source_page_number,
                  downloadUrl: updatedMessage.download_url,
                  bookId: updatedMessage.book_id || null,
                  sources: sources.length > 0 ? sources : undefined, // 🆕 sources array
                }
                : m
            )
          );
        } else if (payload.eventType === "DELETE") {
          console.log("🗑️ حذف رسالة:", payload.old.id);
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      });
    };

    initializeAndSubscribe();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, currentChatId]);

  // =========================================================
  // Auto Scroll
  // =========================================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAssistantTyping, isSendingMessage]);

  useEffect(() => {
    if (!streamingMessageId) return;

    const scrollInterval = setInterval(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    return () => clearInterval(scrollInterval);
  }, [streamingMessageId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight <= clientHeight) {
        setScrollProgress(0);
        return;
      }
      const progress =
        (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(progress);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages.length]);

  // =========================================================
  // Upload File to Supabase
  // =========================================================
  async function uploadFileToSupabase(file: File, uid: string) {
    const originalName = file.name || "file";
    const ext = originalName.includes(".")
      ? originalName.split(".").pop()
      : "bin";
    const safeFileName =
      Date.now().toString() +
      "-" +
      Math.random().toString(36).slice(2, 8) +
      "." +
      ext;
    const filePath = `${uid}/${safeFileName}`;

    const { data, error } = await supabase.storage
      .from("Tawjihi-Ai")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("❌ Upload Error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("Tawjihi-Ai")
      .getPublicUrl(filePath);
    return urlData.publicUrl;
  }

  // =========================================================
  // 🔥 IMPROVED: Send Message - رسالة المستخدم تظهر فوراً
  // =========================================================
  const sendMessage = () => {
    const msg = input.trim();
    if (
      (!msg && !attachedImage && !attachedFile) ||
      isPending ||
      isSendingMessage
    ) {
      console.log("SendMessage: Message input is empty or already sending.");
      return;
    }

    const uid = user?.id;
    if (!uid) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not logged in.",
      });
      console.log("SendMessage: User not logged in.");
      return;
    }

    setInput("");
    const img = attachedImage;
    const file = attachedFile;
    setAttachedImage(null);
    setAttachedFile(null);

    // 🔥 OPTIMISTIC UPDATE: Display the message immediately
    const tempUserMessageId = `temp-user-${Date.now()}`;
    const tempUserMessage: Message = {
      id: tempUserMessageId,
      role: "user",
      content: msg,
      imageBase64: img || null,
      fileUrl: file?.name || null, // Use file name instead of file object
      fileName: file?.name || null,
    };
    setMessages((prev) => [...prev, tempUserMessage]);
    console.log("SendMessage: Optimistic update added.", tempUserMessage);

    // 🔥 Set loading states IMMEDIATELY (before startTransition)
    setIsSendingMessage(true);
    setIsAssistantTyping(true); // Show typing indicator immediately

    startTransition(async () => {
      try {
        console.log("SendMessage: Calling askQuestionAction with:", {
          question: msg,
          userId: uid,
          chatId: currentChatId || "",
          bookId: selectedBookId || null,
          language: lang,
          expandSearchOnline: expandSearch,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        const response = await askQuestionAction({
          question: msg, // Updated to match the expected property
          userId: uid,
          chatId: currentChatId || "", // Ensure chatId is provided
          bookId: selectedBookId || null, // Ensure bookId is null if undefined
          language: lang,
          expandSearchOnline: expandSearch, // Added missing property
          history: messages.map((m) => ({ role: m.role, content: m.content })), // Added missing property
        });

        console.log("SendMessage: askQuestionAction response:", response);

        if (response && response.answer) {
          const aiMessageId = `ai-${Date.now()}`;
          const aiMessage: Message = {
            id: aiMessageId,
            role: "assistant",
            content: "", // Start with empty content
            lang: response.lang,
            sources: response.sources || [],
            sourceBookName: response.sourceBookName,
            sourcePageNumber: response.sourcePageNumber
              ? parseInt(response.sourcePageNumber as any)
              : undefined,
            downloadUrl: response.downloadUrl || undefined,
            bookId: response.bookId ? String(response.bookId) : undefined,
          };

          // Add the empty AI message first
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== tempUserMessageId),
            tempUserMessage,
            aiMessage,
          ]);

          // Start streaming the response
          setStreamingMessageId(aiMessageId);
          setIsStreaming(true);

          // Use typeEffect to stream the text
          await typeEffect(
            response.answer,
            (displayedText) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMessageId ? { ...m, content: displayedText } : m
                )
              );
            },
            20 // Speed of typing animation (ms per character)
          );

          setIsStreaming(false);
          setStreamingMessageId(null);
          console.log("SendMessage: AI response streaming complete.");
        } else {
          console.error("SendMessage: Invalid response structure:", response);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Invalid response from AI.",
          });
        }
      } catch (error) {
        console.error("Error sending message:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to send the message.",
        });
      } finally {
        setIsSendingMessage(false);
        setIsAssistantTyping(false); // Hide typing indicator
      }
    });
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const displayedMessages =
    normalizedSearch.length === 0
      ? messages
      : messages.filter((m) =>
        (m.content || "").toLowerCase().includes(normalizedSearch)
      );

  // =========================================================
  // UI — Messages Rendering (New Design from code.html)
  // =========================================================
  return (
    <main className=" flex flex-col relative h-screen overflow-hidden text-gray-100">
      <div
        className="absolute inset-0  "
        aria-hidden
      />
      
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-10 lg:px-24 scroll-smooth"
      >
<div className="max-w-3xl mx-auto pb-11 pt-1 flex flex-col gap-8">
          {messages.length > 0 && (
            <div className="sticky top-0 z-20 -mt-2 pb-3 bg-gradient-to-b from-[#020617] via-[#020617]/90 to-transparent">
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${scrollProgress}%` }}
                />
              </div>
            </div>
          )}
          {/* Welcome State */}
          {showWelcome && messages.length === 0 ? (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-up">
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-lime-400 flex items-center justify-center shadow-[0_0_40px_rgba(50,205,50,0.4)]">
      <Sparkles className="w-10 h-10 text-white" />
    </div>
    
    <h1 className="text-4xl md:text-5xl font-bold text-white text-center">
      {lang === "ar" ? "مرحباً بك!" : "Welcome!"}
    </h1>
    
    <p className="text-white/60 text-center max-w-md">
      {lang === "ar" 
        ? "ابدأ بطرح سؤالك وسأساعدك في فهم أي موضوع"
        : "Start by asking your question and I'll help you understand any topic"}
    </p>
    
    <Button
      onClick={() => textareaRef.current?.focus()}
      className="mt-4 rounded-2xl px-8 py-4 bg-gradient-to-r from-primary to-emerald-400 text-slate-900 font-bold text-lg shadow-[0_20px_50px_rgba(34,197,94,0.4)] hover:scale-105 transition-transform"
    >
      {lang === "ar" ? "ابدأ الآن" : "Start Now"}
    </Button>
  </div>
) : (
            <>
            
              {displayedMessages.map((m) => {
                const isUser = m.role === "user";

                if (isUser) {
                  // ========== User Message ==========
                  return (
                    <div
                      key={m.id}
                      className="flex items-start gap-4 py-2 justify-end group animate-fade-up"
                    >
                      <div className="flex flex-col gap-1 items-end max-w-[75%]">
                        <div className=" px-5 py-4 rounded-2xl rounded-bl-none text-white">
                          <p className="text-[15px] font-bold leading-loose whitespace-pre-wrap">
                            {m.content}
                          </p>
                          {m.imageBase64 && (
                            <img
                              src={m.imageBase64}
                              alt="Upload"
                              className="mt-2 rounded-lg max-w-full"
                            />
                          )}
                          {m.fileName && (
                            <div className="mt-2 text-xs flex items-center gap-1 bg-black/10 px-2 py-1 rounded">
                              <Paperclip className="w-3 h-3" />
                              {m.fileName}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-white/30 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {lang === "ar" ? "تمت القراءة" : "Read"}
                        </span>
                      </div>
                      {/* User Avatar */}
                       
                    </div>
                  );
                }

                // ========== Assistant Message ==========
                return (
                  <div
                    key={m.id}
                    className="flex items-start gap-5 justify-start w-full group animate-fade-up"
                  >
                    

                    <div className="flex flex-col gap-4 max-w-[85%]">
                      {(() => {
                        const label = getIntentLabel(m.intentType, lang);
                        if (!label) return null;
                        const badgeClass = m.intentType
                          ? INTENT_BADGE_CLASSES[m.intentType]
                          : "bg-white/10 text-white/70  ";

                        return (
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-semibold tracking-[0.35em] uppercase",
                                badgeClass
                              )}
                            >
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/90" />
                              {label}
                            </span>
                            <span className="text-[11px] text-white/40">
                              {lang === "ar" ? "جزء من الشرح" : "Intent block"}
                            </span>
                          </div>
                        );
                      })()}

                      

                      {/* Content */}
                      <div
                        className={cn(
                          "rounded-3xl px-5 py-5 md:px-6 md:py-6 text-[15px] leading-loose text-white/90 shadow-[0_30px_80px_rgba(0,0,0,0.6)] space-y-5 backdrop-blur-2xl",
                          INTENT_PANEL_CLASSES[m.intentType ?? "default"]
                        )}
                      >
                        {renderAssistantContent(m.content || "")}
                      </div>

                      {/* Sources - دعم مصادر متعددة (كتاب + إنترنت) */}
                      {m.role === "assistant" &&
                        m.content &&
                        m.id !== streamingMessageId && (
                          <div className="mt-4 flex flex-wrap gap-2 animate-fade-up">
                            {/* إذا كان هناك sources array (متعدد) */}
                            {m.sources && m.sources.length > 0
                              ? m.sources.map((source, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    if (source.downloadUrl) {
                                      if (source.isWebSource) {
                                        // رابط إنترنت - فتح في tab جديد
                                        window.open(
                                          source.downloadUrl,
                                          "_blank"
                                        );
                                      } else {
                                        // رابط كتاب - فتح PDF
                                        handleOpenSource(
                                          source.downloadUrl,
                                          source.pageNumber || undefined
                                        );
                                      }
                                    }
                                  }}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-[11px] hover:scale-105 transition-all font-bold group backdrop-blur-xl",
                                    source.isWebSource
                                      ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-200 hover:bg-emerald-400/20 hover:border-emerald-400/50 hover:shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                                      : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(50,205,50,0.35)]"
                                  )}
                                >
                                  {source.isWebSource ? (
                                    // 🔥 أيقونة الموقع من الإنترنت مع fallback محسّن
                                    <div className="relative shrink-0 w-6 h-6 flex items-center justify-center bg-white/10 rounded border border-white/20 group-hover:border-emerald-300/60 transition-colors overflow-hidden">
                                      <img
                                        src={getFaviconUrl(
                                          source.downloadUrl || ""
                                        )}
                                        alt={getDomainName(
                                          source.downloadUrl || ""
                                        )}
                                        className="w-full h-full rounded object-contain"
                                        style={{
                                          imageRendering: "auto" as const,
                                        }}
                                        loading="lazy"
                                        onError={(e) => {
                                          // إخفاء الصورة وإظهار الأيقونة البديلة
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.style.display = "none";
                                          const parent = target.parentElement;
                                          if (parent) {
                                            const fallback =
                                              parent.querySelector(
                                                ".favicon-fallback"
                                              ) as HTMLElement;
                                            if (fallback) {
                                              fallback.style.display = "flex";
                                            }
                                          }
                                        }}
                                      />
                                      {/* Fallback icon if favicon fails */}
                                      <ExternalLink
                                        size={16}
                                        className="text-emerald-200 shrink-0 favicon-fallback hidden absolute inset-0 items-center justify-center"
                                      />
                                    </div>
                                  ) : (
                                    // أيقونة الكتاب
                                    <FileText
                                      size={14}
                                      className="shrink-0"
                                    />
                                  )}
                                  <span className="font-medium max-w-[200px] truncate">
                                    {source.isWebSource
                                      ? getDomainName(
                                        source.downloadUrl || source.title
                                      )
                                      : source.title}
                                    {source.pageNumber &&
                                      !source.isWebSource && (
                                        <span className="text-white/50 ml-1">
                                          (ص. {source.pageNumber})
                                        </span>
                                      )}
                                  </span>
                                  {source.isWebSource && (
                                    <ExternalLink
                                      size={12}
                                      className="opacity-50 group-hover:opacity-100 shrink-0 ml-1 transition-opacity"
                                    />
                                  )}
                                </button>
                              ))
                              : // Legacy: مصدر واحد فقط (للتوافق مع الكود القديم)
                              m.sourceBookName && (
                                <button
                                  onClick={() => {
                                    if (m.downloadUrl) {
                                      handleOpenSource(
                                        m.downloadUrl,
                                        m.sourcePageNumber || undefined
                                      );
                                    }
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[11px] hover:bg-primary/20 transition-all font-bold"
                                >
                                  <FileText size={14} />
                                  <span className="font-medium">
                                    {lang === "ar" ? "المصدر: " : "Source: "}
                                    {m.sourceBookName}
                                    {m.sourcePageNumber && (
                                      <span className="text-white/50 ml-1">
                                        (ص. {m.sourcePageNumber})
                                      </span>
                                    )}
                                  </span>
                                </button>
                              )}
                          </div>
                        )}
                      {/* Actions */}
                      <div className="flex items-center gap-4 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(m.content || "");
                            setCopiedId(m.id);
                            setTimeout(() => setCopiedId(null), 1600);
                          }}
                          className="text-white/40 hover:text-white transition-colors"
                          title={lang === "ar" ? "نسخ" : "Copy"}
                        >
                          {copiedId === m.id ? (
                            <Check className="w-[18px] h-[18px] text-primary" />
                          ) : (
                            <Copy className="w-[18px] h-[18px]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* AI Typing Skeleton */}
              {isAssistantTyping && <SkeletonCards count={2} rtl={isArabic} />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ================= INPUT BAR (Bottom) ================= */}
<div className="absolute bottom-0 w-full px-4 md:px-20 lg:px-40 pb-3 pt-2  backdrop-blur-[100px] z-20 pointer-events-none">

        <div className="max-w-[1200px] mx-auto pointer-events-auto">
          {/* Book Selector */}
          {availableBooks.length > 0 && (
            <div className="flex justify-start mb-2 px-1">
              <Select
                value={selectedBookId || "all"}
                onValueChange={(value) =>
                  setSelectedBookId(value === "all" ? undefined : value)
                }
              >
                <SelectTrigger className="w-auto bg-white/5 backdrop-blur-md border border-white/15 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(50,205,50,0.2)] transition-all duration-300 text-xs text-white/80 h-auto py-1.5 px-3 rounded-2xl">
                  <BookOpen className="text-primary w-4 h-4 mr-2" />
                  <span>
                    {lang === "ar" ? "المادة: " : "Book: "}
                    <span className="font-bold text-white">
                      {selectedBookId
                        ? availableBooks.find((b) => b.id === selectedBookId)
                          ?.file_name || (lang === "ar" ? "الكل" : "All")
                        : lang === "ar"
                          ? "اختر المادة"
                          : "Select Book"}
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent
                  className="bg-surface-dark border-white/10  "
                  side="top"
                  position="popper"
                  sideOffset={8}
                >
                  <SelectItem
                    value="all"
                    className="font-semibold text-white hover:bg-white/10"
                  >
                    {lang === "ar" ? "اختر المادة" : "Select Book"}
                  </SelectItem>
                  {availableBooks.map((book) => (
                    <SelectItem
                      key={book.id}
                      value={book.id}
                      className="text-white hover:bg-white/10"
                    >
                      {book.file_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Main Glass Input Bar */}
          <div className="relative flex items-end gap-1 p-1 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_35px_100px_rgba(0,0,0,0.65)] transition-shadow focus-within:border-primary/50 focus-within:shadow-[0_0_40px_rgba(50,205,50,0.25)]">
            {/* Attach Button */}
            <button
              onClick={open}
              className="flex items-center justify-center w-10 h-10 rounded-2xl text-white/60 hover:text-primary hover:bg-white/10 transition-all shrink-0 mb-1"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Text Input */}
            <div className="flex-1 py-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(
                    e.target.scrollHeight,
                    128
                  )}px`;
                  // إزالة أي خلفية بيضاء قد تظهر من المتصفح
                  e.target.style.backgroundColor = "transparent";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                onFocus={(e) => {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.backgroundImage = "none";
                }}
                className="w-full bg-transparent text-white placeholder:text-white/40 max-h-32 overflow-y-auto leading-relaxed text-base px-2 outline-none border-none resize-none autofill:bg-transparent"
                placeholder={
                  lang === "ar"
                    ? "اكتب سؤالك هنا..."
                    : "Type your question here..."
                }
                rows={1}
                style={{
                  backgroundColor: "transparent",
                  backgroundImage: "none",
                  WebkitBackgroundClip: "text",
                }}
              />
            </div>

            {/* Send Button */}
            <div className="flex items-center gap-1 mb-1">
              <button
                onClick={sendMessage}
                disabled={isPending || isSendingMessage}
                className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-r from-primary to-lime-300 text-slate-900 transition-all shadow-[0_20px_45px_rgba(34,197,94,0.35)] hover:scale-105 active:scale-95 disabled:opacity-40"
              >
                {isPending || isSendingMessage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className={cn("w-5 h-5", isArabic && "-rotate-180")} />
                )}
              </button>
            </div>
          </div>

          {/* Footer: Web Search Toggle + Disclaimer */}
          <div className="flex items-center justify-between gap-4 mt-3 px-1">
            <button
              onClick={() => {
                setExpandSearch(!expandSearch);
                if (!expandSearch && !selectedBookId) {
                  toast({
                    title:
                      lang === "ar"
                        ? "البحث عبر الإنترنت مفعل"
                        : "Web search enabled",
                    description:
                      lang === "ar"
                        ? "يمكنك الآن إرسال الأسئلة والبحث من الإنترنت"
                        : "You can now send questions and search from the internet",
                    variant: "default",
                  });
                }
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all group shrink-0 font-semibold backdrop-blur-xl",
                expandSearch
                  ? "bg-primary/15 border-primary text-primary shadow-[0_0_20px_rgba(50,205,50,0.35)]"
                  : "bg-white/5 border-white/10 text-white/70 hover:border-primary/30"
              )}
            >
              <Sparkles
                className={cn(
                  "w-4 h-4",
                  expandSearch
                    ? "text-primary animate-pulse"
                    : "text-white/50 group-hover:text-primary"
                )}
              />
              <span className="text-[12px] font-bold">
                {lang === "ar"
                  ? expandSearch
                    ? "🌐 البحث عبر الإنترنت مفعل"
                    : "🔍 تفعيل البحث عبر الإنترنت"
                  : expandSearch
                    ? "🌐 Web Search ON"
                    : "🔍 Enable Web Search"}
              </span>
            </button>
            <p className="text-left text-[11px] text-white/20 font-light truncate">
              {lang === "ar"
                ? expandSearch
                  ? "سيتم البحث من الإنترنت والمصادر الخارجية"
                  : "يجب اختيار كتاب أو تفعيل البحث عبر الإنترنت"
                : expandSearch
                  ? "Searching from internet and external sources"
                  : "Select a book or enable web search"}
            </p>
          </div>
        </div>
      </div>

      {/* ================= ANIMATIONS ================= */}
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-up {
          animation: fadeUp 0.35s ease-out both;
        }

        @keyframes typingPulse {
          0% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.3;
          }
        }

        .typing-dot {
          animation: typingPulse 1.2s infinite ease-in-out;
        }

        .typing-dot.delay-1 {
          animation-delay: 0.15s;
        }

        .typing-dot.delay-2 {
          animation-delay: 0.3s;
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}
