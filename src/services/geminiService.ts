import { Message, AcademicBranch, BRANCH_NAMES } from "../types";
import { generateQueryEmbedding } from "@/lib/embeddings";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  arabicPrompt,
  englishPrompt,
  physicsPrompt,
  chemistryPrompt,
  mathPrompt,
  industrialPrompt,
  defaultPrompt
} from "@/lib/subjectPrompts";

export class GeminiService {
  private MODEL_PRIORITY = [
    "google/gemini-2.0-flash-exp:free",
    "google/gemma-3-27b-it:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "xiaomi/mimo-v2-flash:free"
  ];

  private getModelPriorityForBranch(branch: AcademicBranch): string[] {
    if (branch === "scientific" || branch === "industrial") {
      return [
        "google/gemini-2.0-flash-exp:free",
        "xiaomi/mimo-v2-flash:free",
        "google/gemma-3-27b-it:free",
        "qwen/qwen-2.5-72b-instruct:free"
      ];
    }

    if (branch === "literary" || branch === "entrepreneurship") {
      return [
        "qwen/qwen-2.5-72b-instruct:free",
        "google/gemma-3-27b-it:free",
        "google/gemini-2.0-flash-exp:free",
        "xiaomi/mimo-v2-flash:free"
      ];
    }

    return this.MODEL_PRIORITY;
  }

  private primaryPageNumber: number | null = null;
  private maxPageNumber: number | null = null;
  private currentContextPages: number[] = [];
  private bookTotalPages: number | null = null;

  // 🎓 دالة الكشف عن المادة واختيار البرومت المناسب
  private getSpecializedPrompt(book: any): string {
    if (!book || !book.file_name) return defaultPrompt;
    
    const fileName = book.file_name.toLowerCase();
    
    // المواد الأساسية الخمس
    if (/(عربي|أدب|ادب|قراءة|نصوص)/i.test(fileName)) {
      return arabicPrompt;
    }
    if (/(إنجليزي|انجليزي|english)/i.test(fileName)) {
      return englishPrompt;
    }
    if (/(فيزياء|physics)/i.test(fileName)) {
      return physicsPrompt;
    }
    if (/(كيمياء|chemistry)/i.test(fileName)) {
      return chemistryPrompt;
    }
    if (/(رياضيات|mathematics|math)/i.test(fileName)) {
      return mathPrompt;
    }
    if (/(صناعي|عملي|ميكانيك|ميكانيكا|كهرباء|الكترونيات|إلكترونيات|الكترونيكس|سيارات|تكنولوجيا عملية|نجارة)/i.test(fileName)) {
      return industrialPrompt;
    }
    if (/(تاريخ|جغرافيا|جغرافية|دين|تربية اسلامية|تربية إسلامية|اسلامية|إسلامية|ثقافة اسلامية|ثقافة إسلامية|ريادة|ريادة اعمال|ريادة أعمال)/i.test(fileName)) {
      return defaultPrompt;
    }
    
    // الحالات الأخرى - استخدم البرومت الافتراضي حالياً
    // (سيتم إضافة مواد أخرى لاحقاً)
    return defaultPrompt;
  }

  // 🚀 Vector Search - دقة عالية! مع timeout
  private async getRelevantContext(query: string, book: any, limit = 15): Promise<string> {
    try {
      console.log(`🔍 Vector search for: "${query}"`);
      
      // 🔥 التحقق من صحة البيانات الأساسية
      if (!book || !book.id || book.file_name === "البحث عبر الإنترنت") {
        console.warn('⚠️ Invalid book data or web search only mode, returning empty context');
        return "CONTEXT_NOT_FOUND";
      }

      // 🔥 إضافة timeout للـ vector search (10 ثواني)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Vector search timeout after 10 seconds')), 10000);
      });

      const searchPromise = (async () => {
        // 1. توليد embedding للسؤال مع timeout فرعي (5 ثواني)
        const embeddingPromise = generateQueryEmbedding(query);
        const embeddingTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Embedding generation timeout')), 5000);
        });
        
        const queryEmbedding = await Promise.race([embeddingPromise, embeddingTimeout]);

        // 2. البحث باستخدام vector similarity
        const { data: pages, error } = await supabaseAdmin.rpc('match_book_pages', {
          query_embedding: queryEmbedding,
          book_id_filter: book.id,
          match_threshold: 0.4, // قلل لـ 0.3 لو مش بيلاقي نتائج
          match_count: limit
        });

        if (error) {
          console.error('❌ Vector search error:', error);
          throw error;
        }

        if (!pages || pages.length === 0) {
          console.warn('⚠️ No pages found with vector search');
          throw new Error('No pages found');
        }

        // 3. حفظ النتائج
        this.currentContextPages = pages.map((p: any) => p.page_number);
        this.primaryPageNumber = this.currentContextPages[0] || null;
        this.bookTotalPages = book.total_pages || Math.max(...this.currentContextPages);

        // 4. عرض النتائج للـ debugging
        console.log('\n📊 Vector Search Results:');
        pages.slice(0, 10).forEach((page: any, idx: number) => {
          const similarity = ((page.similarity || 0) * 100).toFixed(1);
          console.log(`  ${idx + 1}. Page ${page.page_number}: ${similarity}% similarity ${idx === 0 ? '⭐ PRIMARY' : ''}`);
        });
        console.log(`📄 Selected pages: [${this.currentContextPages.join(', ')}]\n`);

        // 5. تنسيق السياق
        const availablePages = this.currentContextPages.join(", ");
        const contextText = pages
          .map((page: any) => page.content)
          .join("\n\n---\n\n");

        return `الصفحات المتاحة فقط: [${availablePages}]

محتوى الكتاب:
${contextText}`;
      })();

      // Race بين البحث والـ timeout
      return await Promise.race([searchPromise, timeoutPromise]);

    } catch (err: any) {
      console.error('❌ Vector search failed:', err?.message || err);
      // Fallback: استخدم keyword search (أسرع)
      console.warn('⚠️ Falling back to keyword search...');
      return this.getRelevantContextKeyword(query, book, limit);
    }
  }

  // 🔧 Fallback: Keyword Search (نفس الكود القديم)
  private getRelevantContextKeyword(query: string, book: any, limit = 15): string {
    let pages = book?.book_pages || [];
    if (pages.length === 0) return "CONTEXT_NOT_FOUND";

    const totalPages = book.total_pages || (pages.length > 0
      ? Math.max(...pages.map((p: any) => p.page_number || 0))
      : 999);

    this.bookTotalPages = totalPages;

    pages = pages.filter((p: any) => {
      const pageNum = p.page_number || 0;
      return pageNum > 0 && pageNum <= totalPages;
    });

    console.log(`📚 الكتاب: ${book.file_name}`);
    console.log(`   عدد الصفحات الفعلي: ${totalPages}`);
    console.log(`   صفحات صحيحة في DB: ${pages.length}/${book?.book_pages?.length || 0}\n`);

    if (pages.length === 0) return "CONTEXT_NOT_FOUND";

    if (pages.length > 0) {
      this.maxPageNumber = Math.min(
        Math.max(...pages.map((p: any) => p.page_number || 0)),
        totalPages
      );
    }

    const queryWords = query
      .toLowerCase()
      .replace(/[؟?،,]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .filter(w => !['ما', 'هي', 'هو', 'كيف', 'لماذا', 'متى', 'اين', 'من', 'الى', 'في', 'على', 'عن'].includes(w));

    console.log(`🔍 كلمات البحث: [${queryWords.join(', ')}]`);

    const scoredPages = pages.map((page: any) => {
      let score = 0;
      const pageText = (page.content || "").toLowerCase();
      const pageLength = pageText.length;

      queryWords.forEach(word => {
        const pattern = word.split('').join('[\\u0617-\\u061A\\u064B-\\u0652]*');
        const regex = new RegExp(pattern, 'g');
        const matches = pageText.match(regex) || [];
        const occurrences = matches.length;

        if (occurrences > 0) {
          score += 15;
          score += Math.min(occurrences * 8, 40);
          if (pageText.indexOf(word) < 200) {
            score += 20;
          }
        }
      });

      if (pageLength > 500) score += 10;
      if (pageLength > 1000) score += 10;

      const allWordsPresent = queryWords.every(w => {
        const pattern = w.split('').join('[\\u0617-\\u061A\\u064B-\\u0652]*');
        return new RegExp(pattern).test(pageText);
      });

      if (allWordsPresent && queryWords.length > 1) {
        score += 60;
      }

      if (queryWords.length >= 2) {
        const word1 = queryWords[0];
        const word2 = queryWords[1];
        const idx1 = pageText.indexOf(word1);
        const idx2 = pageText.indexOf(word2);

        if (idx1 !== -1 && idx2 !== -1 && Math.abs(idx1 - idx2) < 200) {
          score += 30;
        }
      }

      return { page, score };
    });

    const relevantPages = scoredPages
      .filter((item: any) => item.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit)
      .map((item: any) => item.page);

    this.currentContextPages = relevantPages.map((p: any) => p.page_number);
    this.primaryPageNumber = this.currentContextPages[0] || null;

    const topScores = scoredPages
      .filter((item: any) => item.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 10);

    console.log('\n📊 Top 10 relevant pages (keyword):');
    topScores.forEach((item: any, idx: number) => {
      console.log(`  ${idx + 1}. Page ${item.page.page_number}: ${item.score} points ${idx === 0 ? '⭐ PRIMARY' : ''}`);
    });
    console.log(`📄 Selected pages: [${this.currentContextPages.join(', ')}]\n`);

    if (relevantPages.length === 0) {
      console.warn('⚠️ No relevant pages found!');
      return "CONTEXT_NOT_FOUND";
    }

    const availablePages = this.currentContextPages.join(", ");
    const contextText = relevantPages
      .map((page: any) => page.content)
      .join("\n\n---\n\n");

    return `الصفحات المتاحة فقط: [${availablePages}]

محتوى الكتاب:
${contextText}`;
  }

  async askQuestion(prompt: string, book: any, history: Message[], useInternet: boolean, branch: AcademicBranch, imageB64?: string) {
    console.log('🚀 Starting askQuestion...');
    console.log(`📝 Prompt: "${prompt.substring(0, 50)}..."`);
    console.log(`📚 Book: ${book?.file_name || 'Unknown'}`);
    console.log(`🌐 Web Search Enabled: ${useInternet}`);
    
    // 🔥 إذا كان البحث عبر الإنترنت مفعل وليس هناك كتاب صحيح، نتخطى vector search
    const shouldSkipBookSearch = useInternet && (!book || !book.id || book.file_name === "البحث عبر الإنترنت");
    
    const contextStartTime = Date.now();
    let context = "CONTEXT_NOT_FOUND";
    
    if (!shouldSkipBookSearch) {
      context = await this.getRelevantContext(prompt, book); // ✅ أضفنا await
    } else {
      console.log('🌐 Skipping book search - using web search only');
    }
    
    const contextDuration = Date.now() - contextStartTime;
    console.log(`⏱️ Context retrieval took ${contextDuration}ms`);

    // 🔥 بناء السياق حسب نوع البحث
    let contextSection = '';
    if (useInternet && shouldSkipBookSearch) {
      contextSection = `
## 🌐 البحث عبر الإنترنت مفعل:
- استخدم معلومات محدثة من الإنترنت للرد على السؤال
- اذكر جميع المصادر في النهاية بصيغة: [METADATA:SOURCE:اسم,URL:رابط]`;
    } else if (useInternet && !shouldSkipBookSearch) {
      contextSection = `
## 📚🌐 البحث المزدوج (الكتاب + الإنترنت):
- استخدم الكتاب كأساس، أكمل من الإنترنت عند الحاجة
- اذكر المصادر: [METADATA:SOURCE:${book.file_name},URL:كتاب SOURCE:...]
- سياق الكتاب: ${book.file_name}
${context !== "CONTEXT_NOT_FOUND" ? context : "لا يوجد سياق متاح"}`;
    } else {
      contextSection = `
## 📚 البحث من الكتاب فقط:
- استخدم فقط المعلومات الموجودة في السياق
- سياق الكتاب: ${book.file_name}
${context !== "CONTEXT_NOT_FOUND" ? context : "⚠️ لم يتم العثور على معلومات ذات صلة في الكتاب."}`;
    }

    // 🔥 الحصول على البرومت المتخصص حسب المادة
    const specializedPromptTemplate = this.getSpecializedPrompt(book);
    const systemPrompt = specializedPromptTemplate.replace('${context}', contextSection);

    let lastError;

    const modelPriority = this.getModelPriorityForBranch(branch);

    for (const modelId of modelPriority) {
      try {
        console.log(`🤖 Trying model: ${modelId}`);
        
        // 🔥 إضافة timeout للـ API call (60 ثانية)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: "system", content: systemPrompt },
              ...history.map((m: any) => ({
                role: (m.role === 'assistant' || m.role === 'model') ? 'assistant' : 'user',
                content: m.content
              })),
              {
                role: "user", content: imageB64 ? [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: imageB64.startsWith('data:') ? imageB64 : `data:image/jpeg;base64,${imageB64}` } }
                ] : prompt
              }
            ],
            temperature: 0.1,
            top_p: 0.1,
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error?.code === 429 || errorData.error?.code === 402) {
            console.warn(`⚠️ Rate limit for ${modelId}, trying next model...`);
            continue;
          }
          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.choices && data.choices[0]) {
          let responseText = data.choices[0].message.content;
          console.log(`✅ Success with model: ${modelId}`);

          // 🔥 استخراج المصادر من الرد إذا كان البحث عبر الإنترنت مفعل
          let sources: any[] = [];
          const metadataMatch = responseText.match(/\[METADATA:(.*?)\]/);
          
          if (useInternet && metadataMatch) {
            // 🔥 استخراج المصادر من الإنترنت - صيغة محسّنة
            // الصيغة المتوقعة: [METADATA:SOURCE:اسم,URL:رابط SOURCE:اسم2,URL:رابط2]
            const metadataContent = metadataMatch[1];
            
            // 🔥 regex محسن يستخرج SOURCE:URL pairs (يدعم مسافات وأحرف عربية)
            const sourceRegex = /SOURCE:([^,]+?),\s*URL:\s*([^\s\]]+)/gi;
            let sourceMatch;
            const foundSources = [];
            
            while ((sourceMatch = sourceRegex.exec(metadataContent)) !== null) {
              const title = sourceMatch[1].trim();
              let url = sourceMatch[2].trim();
              
              // إزالة أي مسافات في نهاية URL
              url = url.replace(/\s+$/, '');
              
              // إضافة https:// إذا لم يكن موجوداً
              if (url && !url.startsWith('http')) {
                url = `https://${url}`;
              }
              
              // تخطي إذا كان URL = "كتاب" أو "book" (هذا مصدر الكتاب، سيضاف لاحقاً)
              if (url && url !== "كتاب" && url !== "book" && (url.startsWith('http') || url.includes('.'))) {
                foundSources.push({
                  title: title || "مصدر غير محدد",
                  pageNumber: null,
                  bookId: null,
                  downloadUrl: url,
                  isWebSource: true
                });
                console.log(`🌐 Found web source: ${title} - ${url}`);
              }
            }
            
            // إضافة المصادر إذا وُجدت
            if (foundSources.length > 0) {
              sources.push(...foundSources);
            }
            
            // تنظيف النص من metadata
            responseText = responseText.replace(/\[METADATA:.*?\]/g, "").trim();
          }
          
          // إضافة مصدر الكتاب إذا كان موجوداً
          if (book && book.id && book.file_name !== "البحث عبر الإنترنت") {
            sources.unshift({
              title: book.file_name,
              pageNumber: 1,
              bookId: book.id,
              downloadUrl: book.download_url || `/uploads/${book.file_name}`,
              isWebSource: false
            });
          }
          
          // إذا لم يكن هناك مصادر، نضيف المصدر الافتراضي
          if (sources.length === 0) {
            sources = [{
              title: useInternet ? "البحث عبر الإنترنت" : (book?.file_name || "مصدر غير محدد"),
              pageNumber: useInternet ? null : 1,
              bookId: book?.id || null,
              downloadUrl: book?.download_url || null,
              isWebSource: useInternet
            }];
          }

          return {
            text: responseText,
            sources: sources
          };
        }

        if (data.error && (data.error.code === 429 || data.error.code === 402)) {
          console.warn(`⚠️ Rate limit for ${modelId}, trying next model...`);
          continue;
        }
        throw new Error(data.error?.message || "Unknown Error");

      } catch (err: any) {
        lastError = err;
        const errorMessage = err?.message || String(err);
        
        // إذا كان timeout أو abort، انتقل للموديل التالي
        if (err.name === 'AbortError' || errorMessage.includes('timeout')) {
          console.warn(`⏱️ Timeout for model ${modelId}, trying next...`);
          continue;
        }
        
        console.error(`❌ Model ${modelId} failed:`, errorMessage);
        
        // إذا لم يكن rate limit، جرب الموديل التالي
        if (!errorMessage.includes('429') && !errorMessage.includes('402')) {
          continue;
        }
      }
    }
    
    const errorMsg = lastError?.message || String(lastError);
    throw new Error(`❌ تعذر الاتصال بالموديلات. آخر خطأ: ${errorMsg}`);
  }
}

export const geminiService = new GeminiService();
