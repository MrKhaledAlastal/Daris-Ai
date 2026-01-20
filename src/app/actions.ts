"use server";

import { geminiService } from "@/services/geminiService";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Book, AcademicBranch, Message } from "@/types";

// =========================================================
// 1. المساعد: تحديد اللغة
// =========================================================
function detectLanguage(text: string): "ar" | "en" {
  if (!text || text.trim().length === 0) return "ar";
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text) ? "ar" : "en";
}

// =========================================================
// 2. المساعد: إنشاء كائن كتاب فارغ
// =========================================================
function createEmptyBook(branch: string = "scientific"): Book {
  return {
    id: "",
    user_id: "",
    file_name: "غير محدد",
    download_url: "",
    storage_path: "",
    branch: branch as AcademicBranch,
    status: "analyzed",
    created_at: new Date().toISOString(),
    summary: "",
    chunks: [],
  };
}

// =========================================================
// 3. المساعد: جلب الكتاب من قاعدة البيانات
// =========================================================
async function fetchBookWithPages(bookId: string): Promise<any> {
  try {
    const { data: bookData, error: bookError } = await supabaseAdmin
      .from("books")
      .select("id, user_id, file_name, download_url, storage_path, branch, status, created_at")
      .eq("id", bookId)
      .maybeSingle();

    if (bookError || !bookData) {
      console.error("❌ Error fetching book:", bookError);
      return null;
    }

    const { data: pages } = await supabaseAdmin
      .from("book_pages")
      .select("content, page_number")
      .eq("book_id", bookId)
      .order("page_number", { ascending: true });

    return {
      ...bookData,
      book_pages: pages || []
    };
  } catch (error) {
    console.error("❌ Database Fetch Error:", error);
    return null;
  }
}

// =========================================================
// 4. الأكشن الأساسي للدردشة
// =========================================================
export async function askQuestionAction({
  question,
  expandSearchOnline,
  language,
  userId,
  chatId,
  bookId,
  imageBase64,
  history,
  branch,
  selectedBookId,
  fileBase64,
  fileMimeType,
  fileName,
}: {
  question: string;
  expandSearchOnline: boolean;
  language: string;
  userId: string;
  chatId: string;
  bookId: string | null;
  imageBase64?: string | null;
  fileBase64?: string | null;
  fileMimeType?: string | null;
  fileName?: string | null;
  history: any[];
  branch?: string | null;
  selectedBookId?: string | null;
}) {
  const detectedLanguage = detectLanguage(question);

  // مسار تجريبي: لو السؤال يبدأ بـ [template-test] نرجع قالب شرح ثابت للمعاينة داخل الواجهة
  if (question.trim().startsWith("[template-test]")) {
    const templateAnswer = `[concept]التفكير النقدي:هو طريقة تفكير منظمة تساعدك على تقييم الأفكار والمعلومات قبل أن تصدّقها أو تبني عليها قرارات مهمة.[/concept]

## الفكرة ببساطة
تخيل صديقين يقترحان عليك قرارًا كبيرًا: واحد يقول لك "ادرس هذا التخصص لأنه مربح"، والثاني يقول "لا، السوق مليان". التفكير النقدي هو أن توقف قليلاً، تسأل: ما أدلتكم؟ ما المصادر؟ هل في خيارات أخرى؟ ثم تبني قرارك بعد ما تفحص الكلام بدل ما تمشي وراء أول رأي تسمعه.

[list]أهم ما يجب أن أعرفه عن التفكير النقدي:
لا يعني المعارضة لمجرد المعارضة، بل يعني طلب الدليل بهدوء؛
يساعدك تفرّق بين الرأي (وجهة نظر) والحقيقة (معلومة قابلة للتحقق)؛
يتطلب أن تسأل أسئلة جيدة: من قال؟ لماذا؟ ما الفائدة؟ ما الضرر؟؛
يقلل احتمال الوقوع في خداع الإعلانات، أو الشائعات، أو القرارات العاطفية؛
مهم في كل الفروع: العلميات (تجارب ونتائج)، الأدبية (تحليل النصوص)، الصناعية (سلامة وجودة)، وريادة الأعمال (قرارات مشاريع)
[/list]

[box]الخلاصة:
التفكير النقدي = ملاحظة + أسئلة ذكية + جمع أدلة + مقارنة خيارات + قرار واعٍ
إذا غاب واحد من هذه المراحل، يزيد احتمال اتخاذ قرار ضعيف.
[/box]

[example]مثال تطبيقي واحد:
طالب وصله إعلان عن دورة أونلاين تعده أن يصبح "مليونير خلال ٣ أشهر فقط".

كيف يطبق التفكير النقدي؟
1) ملاحظة الادعاء:
- الوعد مبالغ فيه (مليونير في ٣ أشهر).

2) طرح أسئلة:
- من الجهة التي تقدم الدورة؟
- هل يوجد شهادات حقيقية لطلاب سابقين؟
- ما محتوى الدورة فعليًا؟
- لماذا السعر منخفض/مرتفع جدًا؟

3) جمع الأدلة:
- البحث عن آراء مستقلة في مواقع أخرى.
- قراءة الشروط الصغيرة أسفل الإعلان.
- مقارنة الدورة بدورات أخرى أكثر واقعية.

4) اتخاذ قرار واعٍ:
بعد فحص الأدلة، يقرر الطالب أن الإعلان غير منطقي، فيرفض العرض ويبحث عن بديل حقيقي لتطوير نفسه.
[/example]

## جرّب بنفسك
اختر خبرًا أو إعلانًا شفته مؤخرًا (في السوشال ميديا أو الحياة اليومية)، وطبّق عليه خطوات التفكير النقدي:
1) اكتب الادعاء الرئيسي.
2) اكتب سؤالين أو ثلاثة يجب طرحها قبل تصديق الخبر.
3) اذكر قرارًا واعيًا يمكن أن تتخذه بعد التفكير.`;

    return {
      answer: templateAnswer,
      sources: [],
      source: null,
      sourceBookName: "قالب تجريبي",
      sourcePageNumber: null,
      downloadUrl: null,
      bookId: null,
      lang: detectedLanguage,
    };
  }

  try {
    let book = null;
    let actualBookId = bookId;

    // ✅ إذا البحث عبر الإنترنت مفعل ولا يوجد كتاب، نستخدم كتاب فارغ
    if (expandSearchOnline && (!bookId || bookId === "null" || bookId === undefined)) {
      console.log("🌐 البحث عبر الإنترنت مفعل بدون كتاب - سيتم البحث من الإنترنت فقط");
      book = createEmptyBook(branch || "scientific");
      book.file_name = "البحث عبر الإنترنت";
    } 
    // ✅ إذا لم يكن هناك كتاب ولم يكن البحث عبر الإنترنت مفعل، ترجع خطأ
    else if (!bookId || bookId === "null" || bookId === undefined) {
      return {
        answer: detectedLanguage === "ar"
          ? "⚠️ يجب اختيار كتاب أو تفعيل البحث عبر الإنترنت قبل السؤال"
          : "⚠️ You must select a book or enable web search before asking a question",
        lang: detectedLanguage,
      };
    }
    // ✅ جلب الكتاب مع صفحاته
    else if (bookId && bookId !== "null") {
      console.log("📚 جاري جلب الكتاب:", bookId);
      book = await fetchBookWithPages(bookId);
      if (book) {
        actualBookId = book.id;
        console.log("✅ تم جلب الكتاب:", book.file_name, "- عدد الصفحات:", book.book_pages?.length || 0);
      } else {
        console.error("❌ فشل جلب الكتاب");
        // إذا فشل جلب الكتاب وبحث الإنترنت مفعل، نستخدم كتاب فارغ
        if (expandSearchOnline) {
          book = createEmptyBook(branch || "scientific");
          book.file_name = "البحث عبر الإنترنت";
        }
      }
    }

    const bookContext = book || createEmptyBook(branch || "scientific");

    // ✅ تشكيل التاريخ بصيغة 'model'
    const formattedHistory = history.map((h: any) => ({
      id: h.id || String(Math.random()),
      role: (h.role === 'assistant' || h.role === 'model') ? 'model' : 'user',
      content: h.content || "",
      imageBase64: h.imageBase64 || null,
    })) as any[];

    console.log("🤖 جاري إرسال السؤال للـ AI...");
    const result = await geminiService.askQuestion(
      question,
      bookContext,
      formattedHistory,
      expandSearchOnline,
      (bookContext.branch as AcademicBranch),
      imageBase64 || undefined
    );

    console.log("✅ استلام الرد من الـ AI");
    console.log("📄 المصادر المُرجعة:", result.sources);

    // ✅ استخراج رقم الصفحة من أول مصدر
    const firstSource = result.sources?.[0];
    const sourcePageNumber = firstSource?.pageNumber;

    console.log("📌 رقم الصفحة المستخرج:", sourcePageNumber);

    // ✅ التحقق من وجود رقم صفحة صحيح
    if (!sourcePageNumber) {
      console.warn("⚠️ لم يتم العثور على رقم صفحة صحيح!");
    }

    return {
      answer: result.text,
      // أضف هذا السطر ليمرر كل المصادر للواجهة
      sources: result.sources || [],

      // الإبقاء على القديم للتوافق مع أجزاء الكود الأخرى إذا لزم الأمر
      source: firstSource?.downloadUrl,
      sourceBookName: bookContext.file_name,
      sourcePageNumber: sourcePageNumber,
      downloadUrl: bookContext.download_url,
      bookId: actualBookId || bookId || null,
      lang: detectedLanguage,
    };

  } catch (error: any) {
    console.error("❌ Action Error:", error?.message);
    return {
      answer: detectedLanguage === "ar" ? "عذراً، واجهت مشكلة. حاول مجدداً." : "Error, please try again.",
      lang: detectedLanguage,
    };
  }
}
