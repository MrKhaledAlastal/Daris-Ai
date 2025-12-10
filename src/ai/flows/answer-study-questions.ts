'use server';

import { ai } from '@/ai/genkit';
import { askAI } from '@/ai/router';
import { z } from 'zod';
import { getCachedAnswer, saveAnswerToCache } from "@/lib/cache";
import { normalizeQuestion } from "@/lib/normalize";

/* ======================= Helper Functions ======================= */

/**
 * تصحيح رقم الصفحة: الكتب المدرسية فيها مقدمة 2 صفحة
 * فالدرس يبدأ من الصفحة 3 لكن الفهرسة تعتبره صفحة 1
 * الحل: طرح 2 من أرقام الصفحات المسترجعة
 */
function correctPageNumber(pageNum: number | undefined): number | undefined {
  if (!pageNum || pageNum <= 2) return pageNum;
  return pageNum - 2; // تصحيح: الكتاب فيه مقدمة صفحتين
}

/* ======================= Schemas ======================= */

const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  imageBase64: z.string().nullable().optional(),
});

const AnswerStudyQuestionInputSchema = z.object({
  question: z.string(),
  textbookContent: z.string().optional(),
  availableBooks: z
    .array(
      z.object({
        id: z.string(),
        fileName: z.string(),
      })
    )
    .optional(),
  expandSearchOnline: z.boolean(),
  language: z.enum(['en', 'ar']).optional(),
  branch: z.string().optional(),
  imageBase64: z.string().optional(),
  history: z.array(HistoryMessageSchema).optional(),
});

export type AnswerStudyQuestionInput = z.infer<
  typeof AnswerStudyQuestionInputSchema
>;

const AnswerStudyQuestionOutputSchema = z.object({
  answer: z.string(),
  source: z.string(),
  sourceBookName: z.string().optional(),
  sourcePageNumber: z.number().optional(),
  lang: z.enum(['en', 'ar']),
});

export type AnswerStudyQuestionOutput = z.infer<
  typeof AnswerStudyQuestionOutputSchema
>;

/* ======================= Main Function ======================= */

export async function answerStudyQuestion(input: AnswerStudyQuestionInput) {
  console.log("answerStudyQuestion called:", {
    question: input.question,
    img: !!input.imageBase64,
    branch: input.branch,
  });

  return answerStudyQuestionFlow(input);
}

/* ======================= FLOW ======================= */

const answerStudyQuestionFlow = ai.defineFlow(
  {
    name: 'answerStudyQuestionFlow',
    inputSchema: AnswerStudyQuestionInputSchema,
    outputSchema: AnswerStudyQuestionOutputSchema,
  },

  async (input) => {
    /* ------------------ Detect Language ------------------ */
    const detectLang = (txt: string): 'ar' | 'en' =>
      /[\u0600-\u06FF]/.test(txt) ? 'ar' : 'en';

    const lang = input.language || detectLang(input.question);

    /* ------------------ CACHE CHECK ------------------ */
    const cached = await getCachedAnswer(input.question);

    if (cached) {
      return {
        answer: cached.answer,
        source: "cache",
        sourceBookName: undefined,
        sourcePageNumber: undefined,
        lang,
      };
    }
    /* ------------------ Fetch Books For RAG ------------------ */
    let booksForContext = input.availableBooks || [];
    let retrievedChunks: any[] = [];

    // 🔥 Create a map to convert book_id to fileName
    const bookIdToName: Record<string, string> = {};

    if (booksForContext.length === 0 && input.branch) {
      try {
        const { supabaseAdmin } = await import("@/lib/supabase-admin");
        const { data } = await supabaseAdmin
          .from("books")
          .select("id, file_name")
          .eq("branch", input.branch)
          .eq("status", "analyzed");

        if (data) {
          booksForContext = data.map((b: any) => {
            bookIdToName[b.id] = b.file_name; // 🔥 Store mapping
            return {
              id: b.id,
              fileName: b.file_name,
            };
          });
        }
      } catch (err) {
        console.error("Branch book fetch failed:", err);
      }
    } else {
      // 🔥 If books provided in input, build the map
      booksForContext.forEach(b => {
        bookIdToName[b.id] = b.fileName;
      });
    }

    /* ------------------ VALIDATION: Check if we have books ------------------ */
    if (booksForContext.length === 0) {
      if (!input.branch) {
        return {
          answer: lang === 'ar'
            ? "⚠️ يرجى اختيار الفرع الدراسي أولاً!\n\nاضغط على اسمك في القائمة الجانبية، ثم اختر 'الفرع الدراسي' (مثلاً: علمي، أدبي...) لكي أتمكن من البحث في كتبك المدرسية."
            : "⚠️ Please select your Study Branch first!\n\nClick on your name in the sidebar, then select 'Study Branch' so I can search your textbooks.",
          source: "general",
          lang,
          sourceBookName: undefined,
          sourcePageNumber: undefined
        };
      } else {
        return {
          answer: lang === 'ar'
            ? `⚠️ لم يتم العثور على كتب دراسية للفرع المحدد (${input.branch}).\n\nتأكد من أن الأدمن قد قام برفع الكتب لهذا الفرع وأن حالتها 'analyzed'.`
            : `⚠️ No textbooks found for the selected branch (${input.branch}).\n\nPlease ensure the admin has uploaded books for this branch and they are 'analyzed'.`,
          source: "general",
          lang,
          sourceBookName: undefined,
          sourcePageNumber: undefined
        };
      }
    }

    /* ------------------ Perform Retrieval ------------------ */
    // استبدل الجزء الخاص بـ RAG في answer-study-questions.ts

    /* ------------------ Perform Retrieval ------------------ */
    let context = "";

    if (booksForContext.length > 0) {
      try {
        const { supabaseAdmin } = await import("@/lib/supabase-admin");
        const { generateEmbedding } = await import("@/lib/embeddings");

        // 🔥 ENHANCED NORMALIZATION - استخراج الكلمات المفتاحية
        function extractKeywords(question: string): string[] {
          const stopwords = ['ما', 'هو', 'اشرح', 'وضح', 'عرف', 'ماذا', 'كيف', 'لماذا', 'هل', 'في', 'من', 'على', 'إلى'];

          return question
            .toLowerCase()
            .replace(/[؟!.،]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopwords.includes(word));
        }

        const keywords = extractKeywords(input.question);
        console.log("🔍 Extracted keywords:", keywords);

        // 🔥 IMPROVED NORMALIZATION for embedding
        let normalizedQ = input.question
          .replace(/اشرح|وضح|عرّف|بيّن|ما هو|ماهو/gi, "تعريف")
          .replace(/احسب|أوجد|ما قيمة/gi, "حساب")
          .replace(/لماذا|ما سبب|علل/gi, "سبب")
          .trim();

        const qEmbedding = await generateEmbedding(normalizedQ);
        const ids = booksForContext.map((b) => b.id);

        console.log("🔍 RAG Debug:", {
          originalQ: input.question,
          normalizedQ,
          keywords,
          embeddingLength: qEmbedding.length,
          bookCount: ids.length,
        });

        // 🔥 STRATEGY 1: Vector Search with LOWER threshold
        const { data: vectorData, error: vectorError } = await supabaseAdmin.rpc(
          "match_book_pages_v2",
          {
            query_embedding: qEmbedding,
            match_threshold: 0.1, // 🔥 منخفض من البداية
            match_count: 40,
            filter_book_ids: ids,
          }
        );

        let data = vectorData;
        let searchStrategy = "vector";

        // 🔥 STRATEGY 2: Keyword-based search (FALLBACK)
        if (!vectorError && (!data || data.length < 5) && keywords.length > 0) {
          console.log("⚠️ Vector search weak. Trying keyword search...");

          // بناء استعلام LIKE لكل كلمة مفتاحية
          let query = supabaseAdmin
            .from("book_pages")
            .select("id, book_id, content, page_number")
            .in("book_id", ids);

          // أضف شرط OR لكل كلمة
          keywords.forEach((keyword) => {
            query = query.or(`content.ilike.%${keyword}%`);
          });

          const { data: keywordData, error: keywordError } = await query
            .limit(30);

          if (!keywordError && keywordData && keywordData.length > 0) {
            console.log(`✅ Keyword search found ${keywordData.length} pages`);

            // دمج النتائج (vector + keyword) وإزالة التكرار
            const existingIds = new Set(data?.map((d: any) => d.id) || []);
            const newPages = keywordData
              .filter((p) => !existingIds.has(p.id))
              .map((p) => ({ ...p, similarity: 0.5 })); // similarity مزيفة

            data = [...(data || []), ...newPages];
            searchStrategy = "hybrid";
          }
        }

        // 🔥 STRATEGY 3: Full-text search with PostgreSQL (ULTIMATE FALLBACK)
        if (!data || data.length === 0) {
          console.log("⚠️ All searches failed. Trying full-text search...");

          const searchTerm = keywords.join(" | "); // OR logic في PostgreSQL

          const { data: ftsData, error: ftsError } = await supabaseAdmin
            .from("book_pages")
            .select("id, book_id, content, page_number")
            .in("book_id", ids)
            .textSearch("content", searchTerm, {
              type: "websearch",
              config: "arabic", // 🔥 استخدم Arabic config
            })
            .limit(20);

          if (!ftsError && ftsData && ftsData.length > 0) {
            console.log(`✅ Full-text search found ${ftsData.length} pages`);
            data = ftsData.map((p) => ({ ...p, similarity: 0.3 }));
            searchStrategy = "fulltext";
          }
        }

        // 🔥 FINAL FALLBACK: Get first N pages of the book
        if (!data || data.length === 0) {
          console.log("⚠️ All strategies failed. Getting first 15 pages...");

          const { data: fallbackData, error: fallbackError } = await supabaseAdmin
            .from("book_pages")
            .select("id, book_id, content, page_number")
            .in("book_id", ids)
            .order("page_number", { ascending: true })
            .limit(15);

          if (!fallbackError && fallbackData) {
            data = fallbackData.map((p) => ({ ...p, similarity: 0.1 }));
            searchStrategy = "fallback";
          }
        }

        console.log(`✅ Retrieved ${data?.length || 0} chunks using ${searchStrategy} strategy`);

        if (data && data.length > 0) {
          console.log("First 3 chunks preview:");
          data.slice(0, 3).forEach((chunk: any, i: number) => {
            console.log(`  [${i + 1}] Page ${chunk.page_number}: ${chunk.content.substring(0, 80)}...`);
          });

          retrievedChunks = data;

          // 🔥 Build context with metadata
          context = data
            .map(
              (p: any) => `
[CHUNK - Page ${p.page_number}]
Book: ${bookIdToName[p.book_id] || "Unknown"}
BookID: ${p.book_id}
Content: ${p.content}
---`
            )
            .join("\n\n");
        }

      } catch (err) {
        console.error("❌ RAG Error:", err);
      }
    }

    /* ------------------ SYSTEM PROMPT WITH PROFESSIONAL MARKDOWN FORMATTING STANDARD ------------------ */

    const systemPrompt = `You are Tawjihi AI - an advanced educational assistant for Palestinian high school (Tawjihi) students.

Language: ${lang === 'ar' ? 'Arabic - Arabic Language' : 'English'}

PROFESSIONAL MARKDOWN FORMATTING STANDARD (STRICT COMPLIANCE REQUIRED)
=====================================================================

You MUST produce educational explanations using ONLY Markdown format.
This is NOT optional - apply these rules to EVERY response.

REQUIRED STRUCTURE (Follow EXACTLY):

## 🌟 عنوان الدرس / Lesson Title
[One sentence describing the main topic]

### 1) الفكرة الأساسية / Basic Concept
[Clear, simplified explanation of the fundamental concept]
[Use short sentences, one idea per line]

### 2) القانون / Law / Formula
[Before presenting the formula, explain it in one sentence]

Use LaTeX for formulas: $$I = \\frac{V}{R}$$

[After the formula, explain what each symbol means]

### 3) مثال محلول / Solved Example
**المعطيات / Given:**
- Value 1 = ...
- Value 2 = ...

**الحل / Solution:**
1. First step...
2. Second step...
3. Final answer = ...

### 4) ملاحظات مهمة / Important Notes
- Common mistake to avoid: ...
- Always remember: ...
- Special cases: ...

FORMATTING RULES (MANDATORY):
- Use ONLY ## for main title (ONE per response)
- Use ONLY ### for the 4 required sections
- Use LaTeX with $$ ... $$ for formulas
- Use **bold** for key terms and concepts
- Use bullet points (-) for lists
- Keep every paragraph SHORT (2-3 sentences max)
- Add blank lines between sections
- Write for Tawjihi students (simple, clear Arabic/English)

${!input.expandSearchOnline ? `TEXTBOOK-ONLY MODE ACTIVATED
You MUST use ONLY the textbook content provided below.

If the answer is NOT found in the textbooks:
- Do NOT use general knowledge
- Do NOT make up information
- Respond with: "Sorry, this information is not available in the provided textbooks."

Accuracy and credibility are your PRIORITY.` : `INTERNET SEARCH ENABLED
You can use both textbooks AND general knowledge.
Prefer textbooks when available.
If using external knowledge, mention it briefly.`}

${context ? `AVAILABLE TEXTBOOK CONTENT:
${context}` : `NOTE: No textbook content was retrieved for this query.
${!input.expandSearchOnline ? `Since Search is DISABLED, respond using the textbook-only format above.` : `You may use general knowledge.`}`}

REMEMBER: Apply Markdown formatting strictly to EVERY response.`;

    /* ------------------ Prepare History ------------------ */

    const rawHistory = (input.history ?? [])
      .slice(-8)
      .map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.imageBase64 ? { imageBase64: m.imageBase64 } : {}),
      }));

    /* ------------------ Ask LLM ------------------ */

    let modelOutput: string = "";

    try {
      modelOutput = await askAI({
        question: input.question,
        system: systemPrompt,
        history: rawHistory,
        imageBase64: input.imageBase64 || undefined,
        pdfBase64: undefined,
      });
    } catch (err: any) {
      console.error("AI Error:", err);
      // Instead of throwing, return a fallback message so the UI doesn't crash
      modelOutput = JSON.stringify({
        answer: lang === 'ar'
          ? "عذراً، واجهت مشكلة في الاتصال بالذكاء الاصطناعي. هل يمكنك إعادة صياغة السؤال؟"
          : "Sorry, I encountered an issue connecting to the AI. Could you rephrase your question?",
        citations: []
      });
    }

    /* ------------------ Parse Response (JSON or Plain Text) ------------------ */

    let parsed: any = { answer: modelOutput, citations: [] };
    
    try {
      // Try to parse as JSON
      const trimmed = modelOutput.trim();
      if (trimmed.startsWith('{')) {
        parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed.citations)) {
          parsed.citations = [];
        }
      }
    } catch (e) {
      // Not JSON - use as plain text
      console.log("Response is plain text, not JSON");
    }

    let firstCitation = parsed.citations?.[0];

    // 🔥 If AI cited but we have chunks, use the chunk's page number for accuracy
    // (Chunks contain the ACTUAL page numbers from the book)
    if (!firstCitation && retrievedChunks.length > 0) {
      // AI didn't explicitly cite, but we have chunks - use first chunk
      firstCitation = {
        book_name: bookIdToName[retrievedChunks[0].book_id],
        book_id: retrievedChunks[0].book_id,
        page: retrievedChunks[0].page_number // ✅ Use actual page from chunk
      };
    }

    // 🔥 Convert book_id to book_name if needed
    let sourceBookName = firstCitation?.book_name;

    if (!sourceBookName && firstCitation?.book_id) {
      sourceBookName = bookIdToName[firstCitation.book_id] || firstCitation.book_id;
    }

    // 🔥 Get the actual page number (prefer chunk page if available)
    let pageNumber = firstCitation?.page || firstCitation?.page_number;
    
    // ✅ تصحيح أرقام الصفحات: طرح 2 للتعويض عن مقدمة الكتاب
    pageNumber = correctPageNumber(pageNumber);

    // 🔥 Log for debugging
    console.log("=== CITATION DEBUG ===");
    console.log("Citations found:", parsed.citations?.length || 0);
    console.log("Retrieved chunks:", retrievedChunks.length);
    if (parsed.citations?.length > 0) {
      console.log("First citation:", firstCitation);
    } else if (retrievedChunks.length > 0) {
      console.log("⚠️ WARNING: Chunks were found but AI didn't cite them!");
      console.log("First chunk:", {
        book_id: retrievedChunks[0].book_id,
        book_name: bookIdToName[retrievedChunks[0].book_id],
        page: retrievedChunks[0].page_number
      });
    }
    console.log("====================");

    // 🔥 Debugging: If no chunks found, append debug info to the answer
    if (retrievedChunks.length === 0) {

      // Health Check: Can we read ANY row from book_pages?
      const { count: totalPagesCount } = await (await import("@/lib/supabase-admin")).supabaseAdmin
        .from('book_pages')
        .select('*', { count: 'exact', head: true });

      return {
        answer: (parsed.answer || modelOutput),
        source: "general",
        sourceBookName: undefined,
        sourcePageNumber: undefined,
        lang,
      };
    }



    try {

      // ⭐ SAVE TO CACHE BEFORE RETURN
      await saveAnswerToCache({
        question: input.question,
        answer: parsed.answer || modelOutput,
        book_id: firstCitation?.book_id || null,
      });

      console.log(retrievedChunks[0].content);

      return {
        answer: parsed.answer || modelOutput,
        source: parsed.citations?.length > 0 ? "textbook" : "general",
        sourceBookName: sourceBookName,
        sourcePageNumber: pageNumber, // ✅ Use the correct page number
        lang,
      };
    } catch (finalError: any) {
      console.error("❌ Final Return Error:", finalError);
      return {
        answer: lang === 'ar'
          ? "حدث خطأ غير متوقع أثناء تحضير الإجابة. يرجى المحاولة مرة أخرى."
          : "An unexpected error occurred while preparing the answer. Please try again.",
        source: "general",
        lang,  // ✅ استخدم المتغير lang بدل النص الثابت
        sourceBookName: undefined,  // ✅ أضف هذا
        sourcePageNumber: undefined  // ✅ أضف هذا
      };
    }
  }
);