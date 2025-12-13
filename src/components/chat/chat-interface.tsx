"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
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
import { cn } from "@/lib/utils";
import { askQuestionAction } from "@/app/actions";
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
  lang?: "ar" | "en";
}

// =========================================================
// Typing Effect Function with Abort Support
// =========================================================
function typeEffect(
  text: string,
  onUpdate: (displayedText: string) => void,
  speed: number = 8,
  abortSignal?: AbortSignal
): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const interval = setInterval(() => {
      if (abortSignal?.aborted) {
        clearInterval(interval);
        resolve();
        return;
      }
      i++;
      onUpdate(text.slice(0, i));

      if (i >= text.length) {
        clearInterval(interval);
        resolve();
      }
    }, speed);

    if (abortSignal) {
      abortSignal.addEventListener("abort", () => {
        clearInterval(interval);
        resolve();
      });
    }
  });
}

// =========================================================
// Main Chat Component
// =========================================================
export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamText, setStreamText] = useState("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [userScrolled, setUserScrolled] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{
    file: File;
    name: string;
    mime: string;
  } | null>(null);

  const [expandSearch, setExpandSearch] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeExit, setWelcomeExit] = useState(false);

  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // =========================================================
  // Helper: Render Markdown content
  // =========================================================
  const renderAssistantContent = (content: string) => {
    if (!content) return null;

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h2: ({ node, ...props }) => (
              <h2
                className="text-xl md:text-2xl font-bold mt-6 mb-4 text-foreground flex items-center gap-2"
                {...props}
              />
            ),
            h3: ({ node, ...props }) => (
              <h3
                className="text-lg md:text-xl font-semibold mt-5 mb-3 text-foreground/90"
                {...props}
              />
            ),
            p: ({ node, ...props }) => (
              <p
                className="text-[15px] md:text-[16px] leading-7 text-foreground/85 mb-3"
                {...props}
              />
            ),
            ul: ({ node, ...props }) => (
              <ul
                className="list-disc list-inside space-y-2 mb-4 text-[15px] text-foreground/85"
                {...props}
              />
            ),
            li: ({ node, ...props }) => (
              <li className="ml-2 leading-6" {...props} />
            ),
            code: ({ node, inline, className, ...props }: any) =>
              inline ? (
                <code
                  className="bg-background/80 px-2 py-1 rounded text-primary font-mono text-sm"
                  {...props}
                />
              ) : (
                <code
                  className="block bg-background/60 p-4 rounded-lg border border-border/40 overflow-x-auto text-sm font-mono my-4 text-foreground/90"
                  {...props}
                />
              ),
            blockquote: ({ node, ...props }) => (
              <blockquote
                className="border-l-4 border-primary/50 pl-4 py-2 italic text-foreground/70 my-4"
                {...props}
              />
            ),
            strong: ({ node, ...props }) => (
              <strong className="font-bold text-foreground" {...props} />
            ),
            em: ({ node, ...props }) => (
              <em className="italic text-foreground/90" {...props} />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  // =========================================================
  // Stop Streaming
  // =========================================================
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setStreamingMessageId(null);
    setStreamText("");
    setIsAssistantTyping(false);
    toast({
      title: lang === "ar" ? "تم الإيقاف" : "Stopped",
      description:
        lang === "ar" ? "تم إيقاف الرد الحالي" : "Response has been stopped",
    });
  };

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

  useEffect(() => {
    if (messages.length === 0) {
      if (!showWelcome) {
        setShowWelcome(true);
        setWelcomeExit(false);
      }
    } else {
      if (showWelcome) {
        setWelcomeExit(true);
        setTimeout(() => setShowWelcome(false), 600);
      }
    }
  }, [messages.length, showWelcome]);

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
          const arr = existingMessages.map(
            (d: any) =>
            ({
              id: d.id,
              role: d.role,
              content: d.content,
              imageBase64: d.image_data_uri || null,
              fileUrl: d.file_url || null,
              fileName: d.file_name || null,
              source: d.source,
              sourceBookName: d.source_book_name,
              sourcePageNumber: d.source_page_number,
              lang: d.lang,
            } as Message)
          );
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
              lang: newMessage.lang,
            };

            console.log("➕ إضافة رسالة جديدة:", message.id);
            return [...prev, message];
          });
        } else if (payload.eventType === "UPDATE") {
          const updatedMessage = payload.new;
          console.log("✏️ تحديث رسالة:", updatedMessage.id);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedMessage.id
                ? {
                  ...m,
                  content: updatedMessage.content,
                  source: updatedMessage.source,
                  sourceBookName: updatedMessage.source_book_name,
                  sourcePageNumber: updatedMessage.source_page_number,
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
    )
      return;
    if (!isLoggedIn || !user) return router.push("/login?redirect=/chat");

    const uid = user.id;
    setInput("");
    const img = attachedImage;
    const file = attachedFile;
    setAttachedImage(null);
    setAttachedFile(null);

    if (showWelcome) {
      setWelcomeExit(true);
      setTimeout(() => setShowWelcome(false), 600);
    }

    startTransition(async () => {
      try {
        setIsSendingMessage(true);
        await new Promise((resolve) => setTimeout(resolve, 300));

        let chatId = currentChatId;
        if (!chatId) {
          chatId = await createChat(uid, msg || "صورة");
          setCurrentChatId(chatId);
          router.replace(`/chat?chatId=${chatId}`);

          // 🔥 Dispatch custom event to update sidebar immediately
          console.log("📤 Dispatching newChatCreated event:", chatId);
          window.dispatchEvent(
            new CustomEvent("newChatCreated", {
              detail: {
                id: chatId,
                title: msg ? msg.substring(0, 50) : "New chat",
                lastMessagePreview: msg ? msg.substring(0, 80) : "",
              },
            })
          );
          console.log("✅ Event dispatched successfully");
        }

        // Upload image
        let uploadedImageUrl: string | undefined = undefined;
        if (img) {
          try {
            const compressed = await compressDataUrl(img, 1200, 0.8);
            const blob = await fetch(compressed).then((r) => r.blob());
            const path = `users/${uid}/uploads/${Date.now()}.jpg`;

            const { data, error } = await supabase.storage
              .from("Tawjihi-Ai")
              .upload(path, blob, { contentType: "image/jpeg" });

            if (!error && data) {
              const { data: urlData } = supabase.storage
                .from("Tawjihi-Ai")
                .getPublicUrl(path);
              uploadedImageUrl = urlData.publicUrl;
            }
          } catch (err) {
            console.log("❌ Upload failed, using Data URI instead");
          }
        }

        // Upload file
        let uploadedFileUrl: string | null = null;
        if (file?.file) {
          uploadedFileUrl = await uploadFileToSupabase(file.file, uid);
        }

        // 🔥 FIX: أضف رسالة المستخدم للـ UI فوراً
        const tempUserMessageId = `temp-user-${Date.now()}`;
        const tempUserMessage: Message = {
          id: tempUserMessageId,
          role: "user",
          content: msg,
          imageBase64: uploadedImageUrl || img || null,
          fileUrl: uploadedFileUrl || null,
          fileName: file?.name || null,
        };

        setMessages((prev) => [...prev, tempUserMessage]);
        setIsSendingMessage(false);

        // Save user message to database
        const savedUserMessage = await saveMessage(uid, chatId!, {
          role: "user",
          content: msg,
          imageDataUri: uploadedImageUrl || img || undefined,
          fileUrl: uploadedFileUrl || null,
          fileName: file?.name || null,
        });

        // ✅ Replace temp ID with real ID
        if (savedUserMessage?.id) {
          setTimeout(() => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempUserMessageId
                  ? { ...m, id: savedUserMessage.id }
                  : m
              )
            );
          }, 100);
        }

        // 🔥 Update chat title in sidebar with the user's FIRST message only
        const isFirstMessage = messages.length === 0;
        if (msg && chatId && isFirstMessage) {
          window.dispatchEvent(
            new CustomEvent("chatTitleUpdated", {
              detail: {
                id: chatId,
                title: msg.substring(0, 50),
                lastMessagePreview: msg.substring(0, 80),
              },
            })
          );
        }

        // Start AI typing animation
        setIsAssistantTyping(true);

        // Prepare history
        const history = messages
          .map((m) => ({
            role: m.role,
            content: m.content || "",
            imageBase64: m.imageBase64 || null,
          }))
          .filter((m) => m.content.trim() !== "" || m.imageBase64);

        const finalImage = img ?? undefined;

        let fileBase64: string | undefined = undefined;
        let fileMimeType: string | undefined = undefined;
        let fileName: string | undefined = undefined;

        if (file?.file) {
          const reader = new FileReader();
          const fileLoaded = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file.file);
          });
          fileBase64 = fileLoaded.split(",")[1];
          fileMimeType = file.file.type;
          fileName = file.file.name;
        }

        // Get AI response
        const result = await askQuestionAction({
          question: msg || "",
          expandSearchOnline: expandSearch,
          language: lang,
          userId: uid,
          chatId: chatId || "",
          imageBase64: finalImage,
          fileBase64,
          fileMimeType,
          fileName,
          history: history as any,
          branch: branch || null,
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
        setIsAssistantTyping(false);

        // Typing effect
        const tempMessageId = `temp-${Date.now()}`;
        const tempMessage: Message = {
          id: tempMessageId,
          role: "assistant",
          content: result.answer,
          lang: result.lang as "ar" | "en",
          source: result.source,
        };

        setMessages((prev) => [...prev, tempMessage]);
        setStreamingMessageId(tempMessageId);
        setStreamText("");
        setIsStreaming(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        await typeEffect(
          result.answer,
          (displayedText) => {
            setStreamText(displayedText);
          },
          2,
          controller.signal
        );

        setIsStreaming(false);
        setStreamingMessageId(null);
        setStreamText("");

        // Save assistant message
        const saveResult = await saveMessage(uid, chatId!, {
          role: "assistant",
          content: result.answer,
          source: result.source,
          sourceBookName: result.sourceBookName,
          sourcePageNumber: result.sourcePageNumber,
          lang: result.lang as "ar" | "en",
        });

        const realMessageId = saveResult?.id || tempMessageId;
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempMessageId
                ? {
                  ...m,
                  id: realMessageId,
                  content: result.answer,
                  source: result.source,
                  sourceBookName: result.sourceBookName,
                  sourcePageNumber: result.sourcePageNumber,
                  lang: result.lang as "ar" | "en",
                }
                : m
            )
          );
        }, 100);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Unknown error";
        console.error("Failed to send message:", errorMsg);
        toast({
          title: lang === "ar" ? "خطأ" : "Error",
          description:
            lang === "ar"
              ? "حدث خطأ أثناء إرسال الرسالة"
              : "Failed to send message",
          variant: "destructive",
        });
        setIsAssistantTyping(false);
      } finally {
        setIsSendingMessage(false);
      }
    });
  };

  // =========================================================
  // UI — Messages Rendering
  // =========================================================
  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 py-6">
          {showWelcome && messages.length === 0 ? (
            <div
              className={cn(
                "min-h-[calc(100vh-220px)] flex items-center justify-center px-4",
                "transition-all duration-500",
                welcomeExit ? "opacity-0 scale-95" : "opacity-100 scale-100"
              )}
            >
              <div className="w-full max-w-2xl space-y-8 text-center">
                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                    {isArabic
                      ? `مرحباً ${displayName} 👋`
                      : `Welcome ${displayName} 👋`}
                  </h1>
                  <p className="text-muted-foreground text-base max-w-md mx-auto">
                    {isArabic
                      ? "كيف يمكنني مساعدتك اليوم؟"
                      : "How can I help you today?"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {quickPrompts.slice(0, 4).map((prompt) => (
                    <button
                      key={prompt.text}
                      onClick={() => setInput(prompt.text)}
                      className="group p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background hover:border-primary/40 transition-all text-right"
                      dir={isArabic ? "rtl" : "ltr"}
                    >
                      <p className="text-xs text-primary/70 font-medium mb-1">
                        {prompt.category}
                      </p>
                      <p className="text-sm text-foreground group-hover:text-primary transition-colors">
                        {prompt.text}
                      </p>
                    </button>
                  ))}
                </div>

                <Button
                  size="lg"
                  onClick={() => textareaRef.current?.focus()}
                  className="rounded-full px-8"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isArabic ? "ابدأ المحادثة" : "Start chatting"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => {
                const isAssistant = m.role === "assistant";
                const dir =
                  m.lang === "ar" || /[\u0600-\u06FF]/.test(m.content || "")
                    ? "rtl"
                    : "ltr";

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex w-full my-4 animate-fadeInUp",
                      isAssistant ? "justify-start" : "justify-end"
                    )}
                  >
                    {isAssistant ? (
                      <div
                        dir={dir}
                        className={cn(
                          "group relative rounded-2xl px-6 py-5 shadow-sm transition-all border",
                          "bg-background/70 backdrop-blur-sm border-border/40 hover:bg-background/80",
                          "max-w-[720px] w-full transition-all duration-300",
                          sidebarState === "collapsed" ? "ml-6" : "ml-20"
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center gap-2 mb-4",
                            dir === "rtl" && "flex-row-reverse"
                          )}
                        >
                          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-xs font-semibold text-primary/80">
                            {m.lang === "ar"
                              ? "توضيح متقدم"
                              : "Enhanced Explanation"}
                          </span>
                        </div>

                        {m.imageBase64 && (
                          <img
                            src={m.imageBase64}
                            className="rounded-xl border border-border/40 mb-4 max-w-[320px] object-contain"
                          />
                        )}

                        {m.fileUrl && (
                          <div className="mt-3 p-3 rounded-xl border border-border/60 bg-background/70 backdrop-blur-sm max-w-[340px]">
                            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <FileText className="h-4 w-4" />
                              </span>
                              <span className="truncate">
                                {m.fileName || "Attached file"}
                              </span>
                            </div>
                            <a
                              href={m.fileUrl}
                              download={m.fileName}
                              className="inline-block px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/80 transition"
                            >
                              {m.lang === "ar"
                                ? "تحميل الملف"
                                : "Download file"}
                            </a>
                          </div>
                        )}

                        {streamingMessageId === m.id ? (
                          <div>
                            {renderAssistantContent(streamText)}
                            {streamText.length < m.content.length && (
                              <span className="inline-block w-[2px] h-5 bg-primary ml-1 animate-pulse" />
                            )}
                          </div>
                        ) : (
                          renderAssistantContent(m.content)
                        )}

                        {m.sourceBookName && (
                          <div className="mt-4 pt-3 border-t border-border/20 flex items-center gap-2 text-xs text-muted-foreground">
                            <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-foreground/80">
                                {lang === "ar" ? "من" : "From"}{" "}
                                {m.sourceBookName}
                              </span>
                              {m.sourcePageNumber && (
                                <span className="text-muted-foreground text-[11px]">
                                  {lang === "ar"
                                    ? `الصفحة ${m.sourcePageNumber}`
                                    : `Page ${m.sourcePageNumber}`}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <button
                          dir="ltr"
                          onClick={() => {
                            navigator.clipboard.writeText(m.content);
                            setCopiedId(m.id);
                            setTimeout(() => setCopiedId(null), 1500);
                          }}
                          className={cn(
                            "absolute top-3 right-3 p-1.5 rounded-md transition-all",
                            "bg-background/80 hover:bg-background border border-border/40 hover:border-border shadow-sm hover:shadow",
                            copiedId === m.id
                              ? "opacity-100"
                              : "opacity-60 hover:opacity-100"
                          )}
                        >
                          {copiedId === m.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div
                        dir={dir}
                        className={cn(
                          "max-w-[70%] lg:max-w-[60%] px-4 py-3 rounded-2xl shadow-sm transition-all duration-300",
                          "dark:bg-primary/15 dark:border dark:border-primary/30 dark:text-white dark:backdrop-blur-md",
                          "bg-primary/20 border border-primary/30 text-black"
                        )}
                      >
                        {m.imageBase64 && (
                          <img
                            src={m.imageBase64}
                            className="rounded-lg mb-2 border border-primary-foreground/20 max-w-[260px]"
                          />
                        )}
                        {m.fileUrl && (
                          <div className="mt-2 p-2 rounded-xl bg-accent/20 border border-border/50 max-w-[260px] backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2 text-xs font-medium">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-foreground/10">
                                <FileText className="h-3 w-3" />
                              </span>
                              <span className="truncate">{m.fileName}</span>
                            </div>
                            <a
                              href={m.fileUrl}
                              download={m.fileName}
                              className="inline-block px-3 py-1.5 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-xs transition"
                            >
                              {m.lang === "ar" ? "تحميل" : "Download"}
                            </a>
                          </div>
                        )}
                        <div>{m.content}</div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 🎬 انيميشن الإرسال */}
              {isSendingMessage && (
                <div className="flex justify-end my-4 animate-fadeInUp">
                  <div className="px-6 py-4 rounded-2xl shadow-lg bg-gradient-to-r from-blue-400 to-blue-500 text-white max-w-[70%]">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div
                          className="w-2 h-2 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                      <span className="text-sm opacity-90">
                        {lang === "ar" ? "جاري الإرسال..." : "Sending..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 🎬 انيميشن كتابة الـ AI */}
              {isAssistantTyping && !streamingMessageId && (
                <div
                  className="my-4 flex justify-start animate-fadeInUp"
                  style={{
                    marginLeft: sidebarState === "collapsed" ? "60px" : "100px",
                  }}
                >
                  <div className="inline-flex items-center gap-3 bg-background/70 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-sm border border-border/40">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center animate-pulse">
                      <Logo className="w-8 h-8 text-white" href="#" />
                    </div>
                    <div className="flex gap-1">
                      <span
                        className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></span>
                      <span
                        className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></span>
                      <span
                        className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {lang === "ar"
                        ? "الذكاء الاصطناعي يكتب..."
                        : "AI is typing..."}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {userScrolled && (
        <button
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setUserScrolled(false);
          }}
          className="fixed bottom-24 right-8 z-50 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      )}

      {/* Input Area */}
      <div className="w-full">
        <div className="max-w-3xl mx-auto px-4 py-4">
          {attachedImage && (
            <div className="relative inline-block mb-3 mr-3">
              <img
                src={attachedImage}
                className="w-20 h-20 object-cover rounded-lg border border-border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5"
                onClick={() => setAttachedImage(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {attachedFile && (
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-2 rounded-xl border border-border bg-background/70 backdrop-blur-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs truncate max-w-[220px]">
                {attachedFile.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setAttachedFile(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <div className="flex items-end gap-2 rounded-2xl bg-background border border-border p-2 focus-within:ring-2 focus-within:ring-primary">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={open}
                className="h-9 w-9"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.chatPlaceholder || "اكتب سؤالك..."}
                className="flex-1 bg-transparent text-sm px-2 py-2 resize-none max-h-40 outline-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={isSendingMessage || isAssistantTyping}
              />
              {/* 🔥 Single button that changes between Send/Loading/Stop */}
              <Button
                type="button"
                size="icon"
                className={cn(
                  "h-9 w-9 transition-all duration-300",
                  isStreaming
                    ? "bg-red-500/80 hover:bg-red-600 active:scale-95"
                    : input.trim() || attachedImage || attachedFile
                      ? "bg-primary hover:scale-110 hover:shadow-lg active:scale-95"
                      : "bg-muted"
                )}
                disabled={
                  !isStreaming &&
                  (isPending ||
                    isSendingMessage ||
                    isAssistantTyping ||
                    (!input.trim() && !attachedImage && !attachedFile))
                }
                onClick={isStreaming ? handleStopStreaming : sendMessage}
                title={
                  isStreaming
                    ? lang === "ar"
                      ? "إيقاف الرد"
                      : "Stop response"
                    : lang === "ar"
                      ? "إرسال"
                      : "Send"
                }
              >
                {isStreaming ? (
                  <X className="h-4 w-4" />
                ) : isSendingMessage || isPending || isAssistantTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-3">
            <Switch checked={expandSearch} onCheckedChange={setExpandSearch} />
            <Label className="text-xs text-muted-foreground">
              {t.expandSearch || "Expand search"}
            </Label>
          </div>
        </div>
      </div>

      {/* ✅ CSS للانيميشنات */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
